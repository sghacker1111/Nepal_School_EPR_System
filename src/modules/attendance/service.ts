import {
  AuditAction,
  AttendanceSessionStatus,
  type Prisma,
} from "@/generated/prisma/client";

import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { RequestMetadata } from "@/modules/audit/service";
import type { AttendanceSheetInput } from "@/modules/attendance/validation";

type AttendanceActor = {
  schoolId: string;
  userId: string;
  isSchoolAdmin: boolean;
  metadata: RequestMetadata;
};

async function assertAttendanceScope(
  input: Pick<AttendanceSheetInput, "academicYearId" | "classId" | "sectionId">,
  actor: AttendanceActor,
) {
  const [year, schoolClass, section] = await Promise.all([
    prisma.academicYear.findFirst({
      where: { id: input.academicYearId, schoolId: actor.schoolId },
    }),
    prisma.class.findFirst({
      where: { id: input.classId, schoolId: actor.schoolId },
    }),
    prisma.section.findFirst({
      where: {
        id: input.sectionId,
        classId: input.classId,
        schoolId: actor.schoolId,
      },
    }),
  ]);
  if (!year || !schoolClass || !section) {
    throw new ValidationError(
      "The selected academic year, class, and section must belong to your school.",
    );
  }
  if (
    year.status !== "ACTIVE" ||
    schoolClass.status !== "ACTIVE" ||
    section.status !== "ACTIVE"
  )
    throw new ValidationError(
      "Attendance requires an active year, class, and section.",
    );
  if (!actor.isSchoolAdmin) {
    const assignment = await prisma.teacherAssignment.findFirst({
      where: {
        schoolId: actor.schoolId,
        academicYearId: input.academicYearId,
        classId: input.classId,
        status: "ACTIVE",
        teacher: { userId: actor.userId, status: "ACTIVE" },
        OR: [{ sectionId: input.sectionId }, { sectionId: null }],
      },
      select: { id: true },
    });
    if (!assignment)
      throw new ForbiddenError(
        "You can take attendance only for an assigned class.",
      );
  }
}

export async function saveAttendanceSheet(
  input: AttendanceSheetInput,
  actor: AttendanceActor,
) {
  await assertAttendanceScope(input, actor);
  const uniqueStudentIds = [
    ...new Set(input.records.map((record) => record.studentId)),
  ];
  if (uniqueStudentIds.length !== input.records.length)
    throw new ValidationError("A student appears more than once.");

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      schoolId: actor.schoolId,
      academicYearId: input.academicYearId,
      classId: input.classId,
      sectionId: input.sectionId,
      status: "ACTIVE",
      student: { status: "ACTIVE" },
    },
    select: { studentId: true },
  });
  if (
    enrollments.length !== uniqueStudentIds.length ||
    enrollments.some((row) => !uniqueStudentIds.includes(row.studentId))
  ) {
    throw new ValidationError(
      "Every attendance row must be an active student in the selected class.",
    );
  }

  const day = new Date(input.date);
  day.setUTCHours(0, 0, 0, 0);
  const year = await prisma.academicYear.findFirstOrThrow({
    where: { id: input.academicYearId, schoolId: actor.schoolId },
  });
  if (day < year.startDate || day > year.endDate)
    throw new ValidationError(
      "Attendance date must fall within the selected academic year.",
    );
  return prisma.$transaction(async (transaction) => {
    // Serialize save/create/lock for the same section, including first-time sheets.
    await transaction.$queryRaw`SELECT "id" FROM "Section" WHERE "id" = ${input.sectionId} AND "schoolId" = ${actor.schoolId} FOR UPDATE`;
    const existing = await transaction.attendanceSession.findUnique({
      where: {
        schoolId_academicYearId_classId_sectionId_date: {
          schoolId: actor.schoolId,
          academicYearId: input.academicYearId,
          classId: input.classId,
          sectionId: input.sectionId,
          date: day,
        },
      },
      include: { records: { select: { studentId: true, status: true } } },
    });
    if (existing?.status === AttendanceSessionStatus.LOCKED) {
      throw new ForbiddenError(
        "This attendance session is locked and cannot be changed.",
      );
    }
    if (existing?.status === "SUBMITTED" && !input.submit)
      throw new ValidationError(
        "Submitted attendance must be saved as submitted, not reverted to a draft.",
      );

    const status = input.submit
      ? AttendanceSessionStatus.SUBMITTED
      : AttendanceSessionStatus.DRAFT;
    const session = existing
      ? await transaction.attendanceSession.update({
          where: { id: existing.id },
          data: {
            takenById: actor.userId,
            status,
            submittedAt: input.submit ? new Date() : null,
          },
        })
      : await transaction.attendanceSession.create({
          data: {
            schoolId: actor.schoolId,
            academicYearId: input.academicYearId,
            classId: input.classId,
            sectionId: input.sectionId,
            date: day,
            takenById: actor.userId,
            status,
            submittedAt: input.submit ? new Date() : null,
          },
        });

    for (const record of input.records) {
      await transaction.attendanceRecord.upsert({
        where: {
          sessionId_studentId: {
            sessionId: session.id,
            studentId: record.studentId,
          },
        },
        update: { status: record.status, remarks: record.remarks || null },
        create: {
          schoolId: actor.schoolId,
          sessionId: session.id,
          studentId: record.studentId,
          status: record.status,
          remarks: record.remarks || null,
        },
      });
    }

    if (input.submit) {
      const previous = new Map(
        existing?.status === "SUBMITTED"
          ? existing.records.map((record) => [record.studentId, record.status])
          : [],
      );
      const newlyAbsent = input.records
        .filter(
          (record) =>
            record.status === "ABSENT" &&
            previous.get(record.studentId) !== "ABSENT",
        )
        .map((record) => record.studentId);
      if (newlyAbsent.length) {
        const linkedUsers = await transaction.student.findMany({
          where: {
            schoolId: actor.schoolId,
            id: { in: newlyAbsent },
            userId: { not: null },
          },
          select: { userId: true },
        });
        await transaction.notification.createMany({
          data: linkedUsers.flatMap(({ userId }) =>
            userId
              ? [
                  {
                    schoolId: actor.schoolId,
                    userId,
                    type: "ATTENDANCE" as const,
                    title: "Attendance marked absent",
                    body: `You were marked absent on ${day.toISOString().slice(0, 10)}. Contact the school if this is incorrect.`,
                    link: "/student",
                    createdById: actor.userId,
                  },
                ]
              : [],
          ),
        });
      }
    }

    await transaction.auditLog.create({
      data: {
        schoolId: actor.schoolId,
        userId: actor.userId,
        action: input.submit
          ? AuditAction.ATTENDANCE_SUBMITTED
          : AuditAction.ATTENDANCE_SAVED,
        entityType: "AttendanceSession",
        entityId: session.id,
        description: `${input.submit ? "Submitted" : "Saved"} attendance for ${input.records.length} students on ${day.toISOString().slice(0, 10)}.`,
        newValue: {
          academicYearId: input.academicYearId,
          classId: input.classId,
          sectionId: input.sectionId,
          status,
          totals: input.records.reduce<Record<string, number>>(
            (counts, record) => {
              counts[record.status] = (counts[record.status] ?? 0) + 1;
              return counts;
            },
            {},
          ),
        },
        ...actor.metadata,
      },
    });
    return session;
  });
}

export async function lockAttendanceSession(
  sessionId: string,
  actor: Pick<AttendanceActor, "schoolId" | "userId" | "metadata">,
) {
  const target = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, schoolId: actor.schoolId },
    select: { sectionId: true },
  });
  if (!target) throw new NotFoundError("Attendance session not found.");
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT "id" FROM "Section" WHERE "id" = ${target.sectionId} AND "schoolId" = ${actor.schoolId} FOR UPDATE`;
    const existing = await transaction.attendanceSession.findFirst({
      where: { id: sessionId, schoolId: actor.schoolId },
    });
    if (!existing) throw new NotFoundError("Attendance session not found.");
    if (existing.status !== "SUBMITTED")
      throw new ValidationError(
        "Submit a complete attendance sheet before locking it.",
      );
    const session = await transaction.attendanceSession.update({
      where: { id: existing.id },
      data: { status: "LOCKED", lockedAt: new Date() },
    });
    await transaction.auditLog.create({
      data: {
        schoolId: actor.schoolId,
        userId: actor.userId,
        action: AuditAction.ATTENDANCE_LOCKED,
        entityType: "AttendanceSession",
        entityId: session.id,
        description: `Locked attendance session for ${existing.date.toISOString().slice(0, 10)}.`,
        ...actor.metadata,
      },
    });
    return session;
  });
}

export type AttendanceReportRow = {
  studentId: string;
  studentName: string;
  rollNumber: string | null;
  workingDays: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  percentage: number;
};

export async function getAttendanceReport(input: {
  schoolId: string;
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  from?: Date;
  to?: Date;
  scope?: Prisma.AttendanceSessionWhereInput;
}): Promise<AttendanceReportRow[]> {
  const sessions = await prisma.attendanceSession.findMany({
    where: {
      schoolId: input.schoolId,
      AND: input.scope ? [input.scope] : [],
      status: { in: ["SUBMITTED", "LOCKED"] },
      ...(input.academicYearId ? { academicYearId: input.academicYearId } : {}),
      ...(input.classId ? { classId: input.classId } : {}),
      ...(input.sectionId ? { sectionId: input.sectionId } : {}),
      ...(input.from || input.to
        ? {
            date: {
              ...(input.from ? { gte: input.from } : {}),
              ...(input.to ? { lte: input.to } : {}),
            },
          }
        : {}),
    },
    include: {
      records: {
        include: {
          student: {
            select: { firstName: true, middleName: true, lastName: true },
          },
        },
      },
      section: {
        include: {
          enrollments: {
            select: { studentId: true, academicYearId: true, rollNumber: true },
          },
        },
      },
    },
    orderBy: { date: "asc" },
  });
  const rows = new Map<string, AttendanceReportRow>();
  for (const session of sessions) {
    const rolls = new Map(
      session.section.enrollments
        .filter(
          (enrollment) => enrollment.academicYearId === session.academicYearId,
        )
        .map((enrollment) => [enrollment.studentId, enrollment.rollNumber]),
    );
    for (const record of session.records) {
      if (record.status === "HOLIDAY") continue;
      const current = rows.get(record.studentId) ?? {
        studentId: record.studentId,
        studentName: [
          record.student.firstName,
          record.student.middleName,
          record.student.lastName,
        ]
          .filter(Boolean)
          .join(" "),
        rollNumber: rolls.get(record.studentId) ?? null,
        workingDays: 0,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        percentage: 0,
      };
      current.workingDays += 1;
      if (record.status === "PRESENT") current.present += 1;
      if (record.status === "ABSENT") current.absent += 1;
      if (record.status === "LATE") current.late += 1;
      if (record.status === "LEAVE") current.leave += 1;
      rows.set(record.studentId, current);
    }
  }
  return [...rows.values()]
    .map((row) => ({
      ...row,
      percentage: row.workingDays
        ? Number(
            (((row.present + row.late) / row.workingDays) * 100).toFixed(2),
          )
        : 0,
    }))
    .sort(
      (a, b) =>
        (Number(a.rollNumber) || 9999) - (Number(b.rollNumber) || 9999) ||
        a.studentName.localeCompare(b.studentName),
    );
}

export type AttendanceTransaction = Prisma.TransactionClient;

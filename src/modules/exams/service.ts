import { AuditAction, Prisma } from "@/generated/prisma/client";

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { RequestMetadata } from "@/modules/audit/service";
import {
  calculateGpa,
  calculateSubjectResult,
} from "@/modules/exams/calculation";
import type {
  ExamInput,
  ExamSubjectInput,
  ExamTypeInput,
  GradingSchemeInput,
  MarkSheetInput,
} from "@/modules/exams/validation";

type ExamActor = {
  schoolId: string;
  userId: string;
  isSchoolAdmin?: boolean;
  canVerifyAny?: boolean;
  metadata: RequestMetadata;
};
const optional = <T>(value: T | "" | undefined) =>
  value === "" || value === undefined ? null : value;

function conflict(error: unknown, message: string): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
    throw new ConflictError(message);
  throw error;
}

export async function saveExamType(input: ExamTypeInput, actor: ExamActor) {
  try {
    return await prisma.$transaction(async (tx) => {
      const record = await tx.examType.upsert({
        where: {
          schoolId_code: {
            schoolId: actor.schoolId,
            code: input.code.toUpperCase(),
          },
        },
        update: {
          name: input.name,
          weight: input.weight,
          status: input.status,
        },
        create: {
          schoolId: actor.schoolId,
          name: input.name,
          code: input.code.toUpperCase(),
          weight: input.weight,
          status: input.status,
        },
      });
      await tx.auditLog.create({
        data: {
          schoolId: actor.schoolId,
          userId: actor.userId,
          action: AuditAction.EXAM_TYPE_SAVED,
          entityType: "ExamType",
          entityId: record.id,
          description: `Saved exam type ${record.name}.`,
          newValue: {
            code: record.code,
            weight: record.weight.toString(),
            status: record.status,
          },
          ...actor.metadata,
        },
      });
      return record;
    });
  } catch (error) {
    conflict(error, "An exam type with that code already exists.");
  }
}

export async function saveGradingScheme(
  input: GradingSchemeInput,
  actor: ExamActor,
) {
  const sorted = [...input.rules].sort(
    (a, b) => a.minimumPercentage - b.minimumPercentage,
  );
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].minimumPercentage <= sorted[index - 1].maximumPercentage)
      throw new ValidationError("Grade-rule percentage ranges cannot overlap.");
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const used = await tx.gradingScheme.findFirst({
        where: {
          schoolId: actor.schoolId,
          code: input.code.toUpperCase(),
          exams: { some: {} },
        },
      });
      if (used)
        throw new ValidationError(
          "This grading scheme is already used by an exam. Create a new code to preserve historical grades.",
        );
      if (input.isDefault)
        await tx.gradingScheme.updateMany({
          where: { schoolId: actor.schoolId, isDefault: true },
          data: { isDefault: false },
        });
      const scheme = await tx.gradingScheme.upsert({
        where: {
          schoolId_code: {
            schoolId: actor.schoolId,
            code: input.code.toUpperCase(),
          },
        },
        update: {
          name: input.name,
          description: input.description || null,
          isDefault: input.isDefault,
          status: "ACTIVE",
        },
        create: {
          schoolId: actor.schoolId,
          name: input.name,
          code: input.code.toUpperCase(),
          description: input.description || null,
          isDefault: input.isDefault,
        },
      });
      await tx.gradeRule.deleteMany({
        where: { schoolId: actor.schoolId, gradingSchemeId: scheme.id },
      });
      await tx.gradeRule.createMany({
        data: input.rules.map((rule) => ({
          schoolId: actor.schoolId,
          gradingSchemeId: scheme.id,
          minimumPercentage: rule.minimumPercentage,
          maximumPercentage: rule.maximumPercentage,
          grade: rule.grade,
          gradePoint: rule.gradePoint,
          description: rule.description || null,
        })),
      });
      await tx.auditLog.create({
        data: {
          schoolId: actor.schoolId,
          userId: actor.userId,
          action: AuditAction.GRADING_SCHEME_SAVED,
          entityType: "GradingScheme",
          entityId: scheme.id,
          description: `Saved grading scheme ${scheme.name} with ${input.rules.length} rules.`,
          ...actor.metadata,
        },
      });
      return scheme;
    });
  } catch (error) {
    conflict(error, "A grading scheme with that code already exists.");
  }
}

export async function saveExam(input: ExamInput, actor: ExamActor) {
  const [year, type, scheme] = await Promise.all([
    prisma.academicYear.findFirst({
      where: { id: input.academicYearId, schoolId: actor.schoolId },
    }),
    prisma.examType.findFirst({
      where: { id: input.examTypeId, schoolId: actor.schoolId },
    }),
    input.gradingSchemeId
      ? prisma.gradingScheme.findFirst({
          where: {
            id: input.gradingSchemeId,
            schoolId: actor.schoolId,
            status: "ACTIVE",
          },
        })
      : prisma.gradingScheme.findFirst({
          where: {
            schoolId: actor.schoolId,
            isDefault: true,
            status: "ACTIVE",
          },
        }),
  ]);
  if (!year || !type)
    throw new ValidationError(
      "Academic year and exam type must belong to your school.",
    );
  if (!scheme)
    throw new ValidationError(
      "Create or select an active grading scheme first.",
    );
  if (year.status !== "ACTIVE" || type.status !== "ACTIVE")
    throw new ValidationError("Use an active academic year and exam type.");
  if (input.startDate < year.startDate || input.endDate > year.endDate)
    throw new ValidationError("Exam dates must fall within the academic year.");
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.exam.findUnique({
        where: {
          schoolId_academicYearId_name: {
            schoolId: actor.schoolId,
            academicYearId: input.academicYearId,
            name: input.name,
          },
        },
      });
      if (
        existing &&
        (["PUBLISHED", "LOCKED"].includes(existing.status) ||
          (await tx.markSheet.count({
            where: {
              schoolId: actor.schoolId,
              examSubject: { examId: existing.id },
            },
          })))
      )
        throw new ValidationError(
          "This exam already has mark sheets. Its grading and dates cannot be overwritten.",
        );
      const record = existing
        ? await tx.exam.update({
            where: { id: existing.id },
            data: {
              examTypeId: input.examTypeId,
              gradingSchemeId: scheme.id,
              startDate: input.startDate,
              endDate: input.endDate,
              status: input.status,
              resultPublishDate: optional(input.resultPublishDate),
              remarks: input.remarks || null,
            },
          })
        : await tx.exam.create({
            data: {
              schoolId: actor.schoolId,
              academicYearId: input.academicYearId,
              examTypeId: input.examTypeId,
              gradingSchemeId: scheme.id,
              name: input.name,
              startDate: input.startDate,
              endDate: input.endDate,
              status: input.status,
              resultPublishDate: optional(input.resultPublishDate),
              remarks: input.remarks || null,
              createdById: actor.userId,
            },
          });
      await tx.auditLog.create({
        data: {
          schoolId: actor.schoolId,
          userId: actor.userId,
          action: AuditAction.EXAM_SAVED,
          entityType: "Exam",
          entityId: record.id,
          description: `Saved exam ${record.name}.`,
          newValue: {
            status: record.status,
            academicYearId: record.academicYearId,
          },
          ...actor.metadata,
        },
      });
      return record;
    });
  } catch (error) {
    conflict(
      error,
      "An exam with that name already exists in the academic year.",
    );
  }
}

export async function saveExamSubject(
  input: ExamSubjectInput,
  actor: ExamActor,
) {
  const [exam, schoolClass, subject, classSubject] = await Promise.all([
    prisma.exam.findFirst({
      where: { id: input.examId, schoolId: actor.schoolId },
    }),
    prisma.class.findFirst({
      where: { id: input.classId, schoolId: actor.schoolId },
    }),
    prisma.subject.findFirst({
      where: { id: input.subjectId, schoolId: actor.schoolId },
    }),
    prisma.exam
      .findFirst({
        where: { id: input.examId, schoolId: actor.schoolId },
        select: { academicYearId: true },
      })
      .then((found) =>
        found
          ? prisma.classSubject.findFirst({
              where: {
                schoolId: actor.schoolId,
                academicYearId: found.academicYearId,
                classId: input.classId,
                subjectId: input.subjectId,
                status: "ACTIVE",
              },
            })
          : null,
      ),
  ]);
  if (!exam || !schoolClass || !subject || !classSubject)
    throw new ValidationError(
      "The exam, class, and assigned subject must belong to your school.",
    );
  if (["PUBLISHED", "LOCKED"].includes(exam.status))
    throw new ValidationError("Published or locked exams cannot be changed.");
  if (
    input.examDate &&
    (input.examDate < exam.startDate || input.examDate > exam.endDate)
  )
    throw new ValidationError("Subject date must be within the exam dates.");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Exam" WHERE id = ${exam.id} FOR UPDATE`;
    const lockedExam = await tx.exam.findUniqueOrThrow({
      where: { id: exam.id },
    });
    if (["PUBLISHED", "LOCKED"].includes(lockedExam.status))
      throw new ValidationError("Published or locked exams cannot be changed.");
    if (
      input.examDate &&
      (input.examDate < lockedExam.startDate ||
        input.examDate > lockedExam.endDate)
    )
      throw new ValidationError("Subject date must be within the exam dates.");
    const used = await tx.examSubject.findFirst({
      where: {
        schoolId: actor.schoolId,
        examId: input.examId,
        classId: input.classId,
        subjectId: input.subjectId,
        markSheets: { some: {} },
      },
    });
    if (used)
      throw new ValidationError(
        "Marks already exist for this subject. Its assessment configuration is frozen.",
      );
    const record = await tx.examSubject.upsert({
      where: {
        schoolId_examId_classId_subjectId: {
          schoolId: actor.schoolId,
          examId: input.examId,
          classId: input.classId,
          subjectId: input.subjectId,
        },
      },
      update: {
        theoryFullMarks: input.theoryFullMarks,
        practicalFullMarks: input.practicalFullMarks,
        internalFullMarks: input.internalFullMarks,
        theoryPassMarks: input.theoryPassMarks ?? null,
        practicalPassMarks: input.practicalPassMarks ?? null,
        internalPassMarks: input.internalPassMarks ?? null,
        passMarks: optional(input.passMarks),
        creditHour: input.creditHour,
        examDate: optional(input.examDate),
        startTime: input.startTime || null,
        durationMinutes: optional(input.durationMinutes),
        status: "ACTIVE",
      },
      create: {
        schoolId: actor.schoolId,
        examId: input.examId,
        classId: input.classId,
        subjectId: input.subjectId,
        theoryFullMarks: input.theoryFullMarks,
        practicalFullMarks: input.practicalFullMarks,
        internalFullMarks: input.internalFullMarks,
        theoryPassMarks: input.theoryPassMarks ?? null,
        practicalPassMarks: input.practicalPassMarks ?? null,
        internalPassMarks: input.internalPassMarks ?? null,
        passMarks: optional(input.passMarks),
        creditHour: input.creditHour,
        examDate: optional(input.examDate),
        startTime: input.startTime || null,
        durationMinutes: optional(input.durationMinutes),
      },
    });
    await tx.auditLog.create({
      data: {
        schoolId: actor.schoolId,
        userId: actor.userId,
        action: AuditAction.EXAM_SUBJECT_CONFIGURED,
        entityType: "ExamSubject",
        entityId: record.id,
        description: `Configured ${subject.name} for ${schoolClass.name} in ${exam.name}.`,
        ...actor.metadata,
      },
    });
    return record;
  });
}

async function markScope(
  tx: Prisma.TransactionClient,
  examSubjectId: string,
  sectionId: string,
  actor: ExamActor,
  verification = false,
) {
  const subject = await tx.examSubject.findFirst({
    where: { id: examSubjectId, schoolId: actor.schoolId, status: "ACTIVE" },
    include: {
      exam: {
        include: {
          gradingScheme: {
            include: { rules: { where: { status: "ACTIVE" } } },
          },
        },
      },
    },
  });
  if (!subject?.exam.gradingScheme)
    throw new ValidationError(
      "Select an active exam subject with a grading scheme.",
    );
  await tx.$queryRaw`SELECT id FROM "Exam" WHERE id = ${subject.examId} FOR UPDATE`;
  const exam = await tx.exam.findUniqueOrThrow({
    where: { id: subject.examId },
  });
  if (["PUBLISHED", "LOCKED"].includes(exam.status))
    throw new ValidationError(
      "Unlock the published mark sheet before changing this exam.",
    );
  const section = await tx.section.findFirst({
    where: {
      id: sectionId,
      schoolId: actor.schoolId,
      classId: subject.classId,
    },
  });
  if (!section)
    throw new ValidationError("Section does not belong to the exam class.");
  if (!actor.isSchoolAdmin && !actor.canVerifyAny) {
    const assignment = await tx.teacherAssignment.findFirst({
      where: {
        schoolId: actor.schoolId,
        teacher: { userId: actor.userId, status: "ACTIVE" },
        academicYearId: subject.exam.academicYearId,
        classId: subject.classId,
        ...(verification
          ? { isClassTeacher: true }
          : { subjectId: subject.subjectId }),
        status: "ACTIVE",
        OR: [{ sectionId }, { sectionId: null }],
      },
    });
    if (!assignment)
      throw new ForbiddenError(
        verification
          ? "Only the assigned class teacher may verify this class."
          : "You can enter marks only for your assigned year, class, subject and section.",
      );
  }
  const classSubject = await tx.classSubject.findFirst({
    where: {
      schoolId: actor.schoolId,
      academicYearId: subject.exam.academicYearId,
      classId: subject.classId,
      subjectId: subject.subjectId,
    },
  });
  return { ...subject, isOptional: classSubject?.isOptional ?? false };
}

export async function saveMarkSheet(input: MarkSheetInput, actor: ExamActor) {
  return prisma.$transaction(
    async (tx) => {
      const subject = await markScope(
        tx,
        input.examSubjectId,
        input.sectionId,
        actor,
      );
      const roster = await tx.studentEnrollment.findMany({
        where: {
          schoolId: actor.schoolId,
          academicYearId: subject.exam.academicYearId,
          classId: subject.classId,
          sectionId: input.sectionId,
          ...(subject.isOptional
            ? { optionalSubjectIds: { has: subject.subjectId } }
            : {}),
          status: "ACTIVE",
          student: { status: "ACTIVE" },
        },
        select: { studentId: true },
      });
      const ids = new Set(input.rows.map((row) => row.studentId));
      if (
        ids.size !== input.rows.length ||
        roster.length !== ids.size ||
        roster.some((row) => !ids.has(row.studentId))
      )
        throw new ValidationError(
          "Reload the sheet and include every actively enrolled student exactly once.",
        );
      const existing = await tx.markSheet.findUnique({
        where: {
          schoolId_examSubjectId_sectionId: {
            schoolId: actor.schoolId,
            examSubjectId: input.examSubjectId,
            sectionId: input.sectionId,
          },
        },
      });
      if (existing && existing.status !== "DRAFT")
        throw new ForbiddenError("Unlock the mark sheet before editing.");
      const sheet =
        existing ??
        (await tx.markSheet.create({
          data: {
            schoolId: actor.schoolId,
            examSubjectId: input.examSubjectId,
            sectionId: input.sectionId,
            enteredById: actor.userId,
          },
        }));
      const rules = subject.exam.gradingScheme!.rules.map((rule) => ({
        minimumPercentage: Number(rule.minimumPercentage),
        maximumPercentage: Number(rule.maximumPercentage),
        grade: rule.grade,
        gradePoint: Number(rule.gradePoint),
      }));
      for (const row of input.rows) {
        let result;
        try {
          result = calculateSubjectResult({
            ...row,
            specialStatus: row.specialStatus || null,
            theoryFullMarks: Number(subject.theoryFullMarks),
            practicalFullMarks: Number(subject.practicalFullMarks),
            internalFullMarks: Number(subject.internalFullMarks),
            passMarks:
              subject.passMarks === null ? null : Number(subject.passMarks),
            theoryPassMarks:
              subject.theoryPassMarks === null
                ? null
                : Number(subject.theoryPassMarks),
            practicalPassMarks:
              subject.practicalPassMarks === null
                ? null
                : Number(subject.practicalPassMarks),
            internalPassMarks:
              subject.internalPassMarks === null
                ? null
                : Number(subject.internalPassMarks),
            rules,
          });
        } catch (error) {
          throw new ValidationError(
            error instanceof Error ? error.message : "Invalid marks.",
          );
        }
        const data = {
          theoryMarks: row.specialStatus ? null : (row.theoryMarks ?? null),
          practicalMarks: row.specialStatus
            ? null
            : (row.practicalMarks ?? null),
          internalMarks: row.specialStatus ? null : (row.internalMarks ?? null),
          specialStatus: row.specialStatus || null,
          totalMarks: result.totalMarks,
          percentage: result.percentage,
          grade: result.grade,
          gradePoint: result.gradePoint,
          remarks: row.remarks || null,
        };
        await tx.studentMark.upsert({
          where: {
            markSheetId_studentId: {
              markSheetId: sheet.id,
              studentId: row.studentId,
            },
          },
          update: data,
          create: {
            ...data,
            schoolId: actor.schoolId,
            markSheetId: sheet.id,
            studentId: row.studentId,
          },
        });
      }
      // Marks for students no longer on this draft roster must not leak into results.
      await tx.studentMark.deleteMany({
        where: { markSheetId: sheet.id, studentId: { notIn: [...ids] } },
      });
      await tx.studentResult.updateMany({
        where: { schoolId: actor.schoolId, examId: subject.examId },
        data: { resultStatus: "DRAFT", publishedAt: null },
      });
      await tx.auditLog.create({
        data: {
          schoolId: actor.schoolId,
          userId: actor.userId,
          action: "MARKS_SAVED",
          entityType: "MarkSheet",
          entityId: sheet.id,
          description: `Saved complete marks for ${input.rows.length} students.`,
          ...actor.metadata,
        },
      });
      return sheet;
    },
    { timeout: 30000 },
  );
}

export async function changeMarkSheetStatus(
  sheetId: string,
  status: "SUBMITTED" | "VERIFIED" | "APPROVED",
  actor: ExamActor,
) {
  return prisma.$transaction(async (tx) => {
    const original = await tx.markSheet.findFirst({
      where: { id: sheetId, schoolId: actor.schoolId },
    });
    if (!original) throw new NotFoundError("Mark sheet not found.");
    const subject = await markScope(
      tx,
      original.examSubjectId,
      original.sectionId,
      actor,
      status !== "SUBMITTED",
    );
    const sheet = await tx.markSheet.findUniqueOrThrow({
      where: { id: original.id },
      include: { marks: true },
    });
    const expected = {
      SUBMITTED: "DRAFT",
      VERIFIED: "SUBMITTED",
      APPROVED: "VERIFIED",
    } as const;
    if (sheet.status !== expected[status])
      throw new ValidationError(
        `Only ${expected[status].toLowerCase()} sheets can move to ${status.toLowerCase()}.`,
      );
    const roster = await tx.studentEnrollment.findMany({
      where: {
        schoolId: actor.schoolId,
        academicYearId: subject.exam.academicYearId,
        classId: subject.classId,
        sectionId: sheet.sectionId,
        ...(subject.isOptional
          ? { optionalSubjectIds: { has: subject.subjectId } }
          : {}),
        status: "ACTIVE",
        student: { status: "ACTIVE" },
      },
      select: { studentId: true },
    });
    if (
      !roster.length ||
      roster.length !== sheet.marks.length ||
      roster.some(
        (row) => !sheet.marks.some((mark) => mark.studentId === row.studentId),
      )
    )
      throw new ValidationError(
        "The roster changed or marks are incomplete. Unlock and reload the sheet.",
      );
    const now = new Date();
    const updated = await tx.markSheet.update({
      where: { id: sheet.id },
      data: {
        status,
        ...(status === "SUBMITTED" ? { submittedAt: now } : {}),
        ...(status === "VERIFIED"
          ? { verifiedAt: now, verifiedById: actor.userId }
          : {}),
        ...(status === "APPROVED"
          ? { approvedAt: now, approvedById: actor.userId, lockedAt: now }
          : {}),
      },
    });
    const action = {
      SUBMITTED: AuditAction.MARKS_SUBMITTED,
      VERIFIED: AuditAction.MARKS_VERIFIED,
      APPROVED: AuditAction.MARKS_APPROVED,
    }[status];
    await tx.auditLog.create({
      data: {
        schoolId: actor.schoolId,
        userId: actor.userId,
        action,
        entityType: "MarkSheet",
        entityId: sheet.id,
        description: `Moved mark sheet from ${sheet.status} to ${status}.`,
        ...actor.metadata,
      },
    });
    return updated;
  });
}

export async function unlockMarkSheet(
  sheetId: string,
  reason: string,
  actor: ExamActor,
) {
  if (reason.trim().length < 10)
    throw new ValidationError(
      "Provide an unlock reason of at least 10 characters.",
    );
  return prisma.$transaction(async (tx) => {
    const sheet = await tx.markSheet.findFirst({
      where: { id: sheetId, schoolId: actor.schoolId },
      include: { examSubject: true },
    });
    if (!sheet) throw new NotFoundError("Mark sheet not found.");
    await tx.$queryRaw`SELECT id FROM "Exam" WHERE id = ${sheet.examSubject.examId} FOR UPDATE`;
    if (sheet.status === "DRAFT")
      throw new ValidationError("This sheet is already a draft.");
    const updated = await tx.markSheet.update({
      where: { id: sheet.id },
      data: {
        status: "DRAFT",
        unlockedAt: new Date(),
        unlockReason: reason.trim(),
        submittedAt: null,
        verifiedAt: null,
        verifiedById: null,
        approvedAt: null,
        approvedById: null,
        lockedAt: null,
      },
    });
    // Withdraw the whole publication so old aggregates cannot remain visible.
    await tx.exam.update({
      where: { id: sheet.examSubject.examId },
      data: { status: "MARK_ENTRY" },
    });
    await tx.studentResult.updateMany({
      where: { schoolId: actor.schoolId, examId: sheet.examSubject.examId },
      data: { resultStatus: "DRAFT", publishedAt: null, issueDate: null },
    });
    await tx.auditLog.create({
      data: {
        schoolId: actor.schoolId,
        userId: actor.userId,
        action: "MARKS_UNLOCKED",
        entityType: "MarkSheet",
        entityId: sheet.id,
        description: `Unlocked marks and withdrew exam publication: ${reason.trim()}`,
        ...actor.metadata,
      },
    });
    return updated;
  });
}

async function calculateWithin(
  tx: Prisma.TransactionClient,
  examId: string,
  actor: ExamActor,
  publish: boolean,
) {
  await tx.$queryRaw`SELECT id FROM "Exam" WHERE id = ${examId} AND "schoolId" = ${actor.schoolId} FOR UPDATE`;
  const exam = await tx.exam.findFirst({
    where: { id: examId, schoolId: actor.schoolId },
    include: {
      gradingScheme: { include: { rules: true } },
      subjects: {
        where: { status: "ACTIVE" },
        include: {
          subject: true,
          markSheets: {
            where: { status: { in: ["APPROVED", "PUBLISHED", "LOCKED"] } },
            include: { marks: true },
          },
        },
      },
    },
  });
  if (!exam?.gradingScheme)
    throw new NotFoundError("Exam or grading scheme not found.");
  if (exam.status === "PUBLISHED" || exam.status === "LOCKED")
    throw new ValidationError(
      "Results are already published or locked. Unlock marks with a reason before recalculating.",
    );
  if (!exam.subjects.length)
    throw new ValidationError("Configure exam subjects first.");
  const roster = await tx.studentEnrollment.findMany({
    where: {
      schoolId: actor.schoolId,
      academicYearId: exam.academicYearId,
      classId: {
        in: [...new Set(exam.subjects.map((subject) => subject.classId))],
      },
      status: "ACTIVE",
      student: { status: "ACTIVE" },
    },
    include: { student: { select: { userId: true, studentId: true } } },
  });
  if (!roster.length)
    throw new ValidationError("No active enrollments for this examination.");
  const optionalLinks = await tx.classSubject.findMany({
    where: {
      schoolId: actor.schoolId,
      academicYearId: exam.academicYearId,
      isOptional: true,
    },
    select: { classId: true, subjectId: true },
  });
  const gradeRules = exam.gradingScheme.rules
    .filter((rule) => rule.status === "ACTIVE")
    .map((rule) => ({
      minimumPercentage: Number(rule.minimumPercentage),
      maximumPercentage: Number(rule.maximumPercentage),
      grade: rule.grade,
      gradePoint: Number(rule.gradePoint),
    }));
  // Fetch attendance once for the exam, instead of one query per student.
  const attendance = await tx.attendanceRecord.findMany({
    where: {
      schoolId: actor.schoolId,
      session: {
        academicYearId: exam.academicYearId,
        date: { lte: exam.endDate },
        status: { in: ["SUBMITTED", "LOCKED"] },
      },
    },
    select: {
      studentId: true,
      status: true,
      session: { select: { classId: true, sectionId: true } },
    },
  });
  const now = new Date();
  let publishedCount = 0;
  for (const enrollment of roster) {
    const subjects = exam.subjects.filter(
      (subject) =>
        subject.classId === enrollment.classId &&
        (!optionalLinks.some(
          (link) =>
            link.classId === enrollment.classId &&
            link.subjectId === subject.subjectId,
        ) ||
          enrollment.optionalSubjectIds.includes(subject.subjectId)),
    );
    const records = subjects.map((subject) => ({
      subject,
      mark: subject.markSheets
        .find((sheet) => sheet.sectionId === enrollment.sectionId)
        ?.marks.find((mark) => mark.studentId === enrollment.studentId),
    }));
    const missing = records.filter((record) => !record.mark);
    if (missing.length)
      throw new ValidationError(
        `Results are incomplete for student ${enrollment.student.studentId}: approve marks for ${missing.map((record) => record.subject.subject.name).join(", ")}.`,
      );
    const calculated = records.map(({ subject, mark }) => {
      const result = calculateSubjectResult({
        theoryMarks:
          mark!.theoryMarks === null ? null : Number(mark!.theoryMarks),
        practicalMarks:
          mark!.practicalMarks === null ? null : Number(mark!.practicalMarks),
        internalMarks:
          mark!.internalMarks === null ? null : Number(mark!.internalMarks),
        specialStatus: mark!.specialStatus,
        theoryFullMarks: Number(subject.theoryFullMarks),
        practicalFullMarks: Number(subject.practicalFullMarks),
        internalFullMarks: Number(subject.internalFullMarks),
        passMarks:
          subject.passMarks === null ? null : Number(subject.passMarks),
        theoryPassMarks:
          subject.theoryPassMarks === null
            ? null
            : Number(subject.theoryPassMarks),
        practicalPassMarks:
          subject.practicalPassMarks === null
            ? null
            : Number(subject.practicalPassMarks),
        internalPassMarks:
          subject.internalPassMarks === null
            ? null
            : Number(subject.internalPassMarks),
        rules: gradeRules,
      });
      return { subject, mark: mark!, result };
    });
    const included = calculated.filter(
      (record) => record.mark.specialStatus !== "EXEMPTED",
    );
    if (!included.length)
      throw new ValidationError(
        "A result needs at least one assessed subject.",
      );
    const totalFullMarks = included.reduce(
      (sum, { subject }) =>
        sum +
        Number(subject.theoryFullMarks) +
        Number(subject.practicalFullMarks) +
        Number(subject.internalFullMarks),
      0,
    );
    const totalObtainedMarks = included.reduce(
      (sum, { result }) => sum + (result.totalMarks ?? 0),
      0,
    );
    const gpa = calculateGpa(
      included.map(({ result, subject }) => ({
        gradePoint: result.gradePoint,
        passed: result.passed,
        creditHour: Number(subject.creditHour),
      })),
    );
    const outcome = calculated.some(
      (record) => record.mark.specialStatus === "WITHHELD",
    )
      ? "WITHHELD"
      : gpa.passed
        ? "PASS"
        : "FAIL";
    const publication = publish && outcome !== "WITHHELD";
    const grade = gpa.passed
      ? ([...gradeRules]
          .sort((a, b) => b.gradePoint - a.gradePoint)
          .find((rule) => gpa.gpa >= rule.gradePoint)?.grade ?? "NG")
      : "NG";
    const days = attendance.filter(
      (record) =>
        record.studentId === enrollment.studentId &&
        record.session.classId === enrollment.classId &&
        record.session.sectionId === enrollment.sectionId &&
        record.status !== "HOLIDAY",
    );
    const data = {
      enrollmentId: enrollment.id,
      totalFullMarks,
      totalObtainedMarks,
      percentage: Number(
        ((totalObtainedMarks / totalFullMarks) * 100).toFixed(2),
      ),
      gpa: gpa.gpa,
      finalGrade: grade,
      outcome: outcome as "PASS" | "FAIL" | "WITHHELD",
      resultStatus: publication
        ? ("PUBLISHED" as const)
        : (outcome as "PASS" | "FAIL" | "WITHHELD"),
      publishedAt: publication ? now : null,
      issueDate: publication ? now : null,
      attendanceDays: days.length,
      presentDays: days.filter((day) =>
        ["PRESENT", "LATE"].includes(day.status),
      ).length,
      calculatedAt: now,
    };
    await tx.studentResult.upsert({
      where: {
        schoolId_examId_studentId: {
          schoolId: actor.schoolId,
          examId,
          studentId: enrollment.studentId,
        },
      },
      update: data,
      create: {
        ...data,
        schoolId: actor.schoolId,
        examId,
        studentId: enrollment.studentId,
      },
    });
    if (publication) {
      publishedCount++;
      if (enrollment.student.userId)
        await tx.notification.create({
          data: {
            schoolId: actor.schoolId,
            userId: enrollment.student.userId,
            type: "RESULT",
            title: `${exam.name} result published`,
            body: "Your result is available in the student portal.",
            link: "/student",
            createdById: actor.userId,
          },
        });
    }
  }
  await tx.studentResult.updateMany({
    where: {
      schoolId: actor.schoolId,
      examId,
      studentId: { notIn: roster.map((row) => row.studentId) },
    },
    data: { resultStatus: "DRAFT", publishedAt: null, issueDate: null },
  });
  if (publish) {
    if (!publishedCount)
      throw new ValidationError(
        "All results are withheld; none can be published.",
      );
    await tx.exam.update({
      where: { id: examId },
      data: { status: "PUBLISHED", resultPublishDate: now },
    });
    await tx.markSheet.updateMany({
      where: {
        schoolId: actor.schoolId,
        examSubject: { examId },
        status: "APPROVED",
      },
      data: { status: "PUBLISHED", lockedAt: now },
    });
  }
  await tx.auditLog.create({
    data: {
      schoolId: actor.schoolId,
      userId: actor.userId,
      action: publish ? "RESULT_PUBLISHED" : "RESULT_CALCULATED",
      entityType: "Exam",
      entityId: examId,
      description: publish
        ? `Published ${publishedCount} results; withheld results remain private.`
        : `Calculated ${roster.length} complete results.`,
      ...actor.metadata,
    },
  });
  return publish ? publishedCount : roster.length;
}

export async function calculateExamResults(examId: string, actor: ExamActor) {
  return prisma.$transaction(
    (tx) => calculateWithin(tx, examId, actor, false),
    { timeout: 60000 },
  );
}
export async function publishExamResults(examId: string, actor: ExamActor) {
  return prisma.$transaction((tx) => calculateWithin(tx, examId, actor, true), {
    timeout: 60000,
  });
}

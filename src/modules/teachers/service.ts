import { AuditAction, Prisma } from "@/generated/prisma/client";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { makeTenantIdentityKey } from "@/lib/identity";
import { prisma } from "@/lib/prisma";
import { normalizeIdentity } from "@/lib/utils";
import type { RequestMetadata } from "@/modules/audit/service";
import { ROLE_CODES } from "@/modules/auth/constants";
import { hashPassword } from "@/modules/auth/password";
import { ensureTenantRole } from "@/modules/auth/rbac-service";
import type {
  TeacherAssignmentInput,
  TeacherInput,
} from "@/modules/teachers/validation";

type Actor = { schoolId: string; userId: string; metadata: RequestMetadata };
const optionalText = (value?: string) =>
  value === "" || value === undefined ? null : value;
const optionalDate = (value?: Date | "") =>
  value === "" || value === undefined ? null : value;
const normalizedName = (...parts: (string | undefined)[]) =>
  parts.filter(Boolean).join(" ").trim().toLocaleLowerCase("en-US");

async function assertCanDisableTeacherLogin(
  tx: Prisma.TransactionClient,
  schoolId: string,
  userId: string | null,
) {
  if (!userId) return;
  await tx.$queryRaw`SELECT id FROM "School" WHERE id = ${schoolId} FOR UPDATE`;
  const administrator = await tx.userRole.count({
    where: {
      schoolId,
      userId,
      role: { schoolId, code: ROLE_CODES.SCHOOL_ADMIN },
    },
  });
  if (
    administrator &&
    !(await tx.user.count({
      where: {
        schoolId,
        id: { not: userId },
        status: "ACTIVE",
        roles: {
          some: { schoolId, role: { schoolId, code: ROLE_CODES.SCHOOL_ADMIN } },
        },
      },
    }))
  )
    throw new ValidationError("Keep at least one active school administrator.");
}

export async function saveTeacher(input: TeacherInput, actor: Actor) {
  const passwordHash = input.createLogin
    ? await hashPassword(input.temporaryPassword ?? "")
    : null;
  try {
    return await prisma.$transaction(async (transaction) => {
      const existing = input.id
        ? await transaction.teacher.findFirst({
            where: { id: input.id, schoolId: actor.schoolId },
          })
        : null;
      if (input.id && !existing) throw new NotFoundError("Teacher not found.");
      if (input.status !== "ACTIVE")
        await assertCanDisableTeacherLogin(
          transaction,
          actor.schoolId,
          existing?.userId ?? null,
        );
      let userId = existing?.userId ?? null;
      if (input.createLogin && !userId) {
        const username = normalizeIdentity(input.username ?? "");
        const email = input.loginEmail
          ? normalizeIdentity(input.loginEmail)
          : null;
        const role = await ensureTenantRole(
          transaction,
          actor.schoolId,
          ROLE_CODES.TEACHER,
        );
        const user = await transaction.user.create({
          data: {
            schoolId: actor.schoolId,
            identityKey: makeTenantIdentityKey(actor.schoolId, username),
            username: input.username!.trim(),
            normalizedUsername: username,
            email: input.loginEmail || null,
            normalizedEmail: email,
            mobile: input.mobile,
            passwordHash: passwordHash!,
            firstName: input.firstName,
            middleName: optionalText(input.middleName),
            lastName: input.lastName,
            mustChangePassword: true,
            status: "ACTIVE",
            createdById: actor.userId,
            roles: {
              create: {
                schoolId: actor.schoolId,
                roleId: role.id,
                assignedBy: actor.userId,
              },
            },
          },
        });
        userId = user.id;
        if (
          existing &&
          (await transaction.teacherAssignment.count({
            where: {
              schoolId: actor.schoolId,
              teacherId: existing.id,
              status: "ACTIVE",
              isClassTeacher: true,
            },
          }))
        ) {
          const classRole = await ensureTenantRole(
            transaction,
            actor.schoolId,
            ROLE_CODES.CLASS_TEACHER,
          );
          await transaction.userRole.create({
            data: {
              schoolId: actor.schoolId,
              userId,
              roleId: classRole.id,
              assignedBy: actor.userId,
            },
          });
        }
      }
      const data = {
        schoolId: actor.schoolId,
        userId,
        teacherCode: input.teacherCode.toUpperCase(),
        firstName: input.firstName,
        middleName: optionalText(input.middleName),
        lastName: input.lastName,
        normalizedName: normalizedName(
          input.firstName,
          input.middleName,
          input.lastName,
        ),
        nameInNepali: optionalText(input.nameInNepali),
        gender: input.gender,
        dateOfBirth: optionalDate(input.dateOfBirth),
        mobile: input.mobile,
        email: input.email ? normalizeIdentity(input.email) : null,
        address: optionalText(input.address),
        qualification: optionalText(input.qualification),
        specialization: optionalText(input.specialization),
        joiningDate: input.joiningDate,
        employmentType: input.employmentType,
        status: input.status,
        citizenshipNumber: optionalText(input.citizenshipNumber),
        citizenshipIssueAt: optionalText(input.citizenshipIssueAt),
        archivedAt: input.status === "ARCHIVED" ? new Date() : null,
        archivedById: input.status === "ARCHIVED" ? actor.userId : null,
      };
      const teacher = input.id
        ? await transaction.teacher.update({ where: { id: input.id }, data })
        : await transaction.teacher.create({
            data: { ...data, createdById: actor.userId },
          });
      if (userId) {
        await transaction.user.update({
          where: { id: userId },
          data: {
            firstName: input.firstName,
            middleName: optionalText(input.middleName),
            lastName: input.lastName,
            ...(input.status !== "ACTIVE"
              ? { status: "INACTIVE", sessionVersion: { increment: 1 } }
              : {}),
          },
        });
        if (input.status !== "ACTIVE")
          await transaction.session.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
      }
      if (input.status !== "ACTIVE")
        await transaction.teacherAssignment.updateMany({
          where: {
            schoolId: actor.schoolId,
            teacherId: teacher.id,
            status: "ACTIVE",
          },
          data: { status: "INACTIVE" },
        });
      await transaction.auditLog.create({
        data: {
          schoolId: actor.schoolId,
          userId: actor.userId,
          action: input.id
            ? AuditAction.TEACHER_UPDATED
            : AuditAction.TEACHER_CREATED,
          entityType: "Teacher",
          entityId: teacher.id,
          description: `${input.id ? "Updated" : "Created"} teacher ${teacher.teacherCode}.`,
          newValue: {
            teacherCode: teacher.teacherCode,
            name: `${teacher.firstName} ${teacher.lastName}`,
            status: teacher.status,
            loginCreated: Boolean(input.createLogin && !existing?.userId),
          },
          ...actor.metadata,
        },
      });
      return teacher;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new ConflictError(
        "Teacher code, email, or login username is already in use in this school.",
      );
    throw error;
  }
}

export async function archiveTeacher(teacherId: string, actor: Actor) {
  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, schoolId: actor.schoolId },
  });
  if (!teacher) throw new NotFoundError("Teacher not found.");
  return prisma.$transaction(async (transaction) => {
    await assertCanDisableTeacherLogin(
      transaction,
      actor.schoolId,
      teacher.userId,
    );
    const updated = await transaction.teacher.update({
      where: { id: teacher.id },
      data: {
        status: "ARCHIVED",
        archivedAt: new Date(),
        archivedById: actor.userId,
      },
    });
    await transaction.teacherAssignment.updateMany({
      where: { schoolId: actor.schoolId, teacherId },
      data: { status: "ARCHIVED" },
    });
    if (teacher.userId) {
      await transaction.user.update({
        where: { id: teacher.userId },
        data: { status: "ARCHIVED", sessionVersion: { increment: 1 } },
      });
      await transaction.session.updateMany({
        where: { userId: teacher.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await transaction.auditLog.create({
      data: {
        schoolId: actor.schoolId,
        userId: actor.userId,
        action: AuditAction.TEACHER_ARCHIVED,
        entityType: "Teacher",
        entityId: teacher.id,
        description: `Archived teacher ${teacher.teacherCode}.`,
        ...actor.metadata,
      },
    });
    return updated;
  });
}

export async function saveTeacherAssignment(
  input: TeacherAssignmentInput,
  actor: Actor,
) {
  const [year, teacher, schoolClass, section, subject] = await Promise.all([
    prisma.academicYear.findFirst({
      where: { id: input.academicYearId, schoolId: actor.schoolId },
    }),
    prisma.teacher.findFirst({
      where: {
        id: input.teacherId,
        schoolId: actor.schoolId,
        status: { not: "ARCHIVED" },
      },
    }),
    prisma.class.findFirst({
      where: { id: input.classId, schoolId: actor.schoolId },
    }),
    input.sectionId
      ? prisma.section.findFirst({
          where: {
            id: input.sectionId,
            schoolId: actor.schoolId,
            classId: input.classId,
          },
        })
      : Promise.resolve(null),
    prisma.subject.findFirst({
      where: { id: input.subjectId, schoolId: actor.schoolId },
    }),
  ]);
  if (
    !year ||
    !teacher ||
    !schoolClass ||
    !subject ||
    (input.sectionId && !section)
  )
    throw new ValidationError(
      "All assignment selections must belong to your school and the selected section must belong to the class.",
    );
  if (input.status === "ACTIVE") {
    const linked = await prisma.classSubject.findFirst({
      where: {
        schoolId: actor.schoolId,
        academicYearId: input.academicYearId,
        classId: input.classId,
        subjectId: input.subjectId,
        status: "ACTIVE",
      },
    });
    if (
      !linked ||
      year.status !== "ACTIVE" ||
      teacher.status !== "ACTIVE" ||
      schoolClass.status !== "ACTIVE" ||
      subject.status !== "ACTIVE" ||
      (section && section.status !== "ACTIVE")
    )
      throw new ValidationError(
        "Use active records and assign this subject to the class and academic year in Class subjects first.",
      );
  }
  const assignmentKey = [
    actor.schoolId,
    input.academicYearId,
    input.teacherId,
    input.classId,
    input.sectionId || "ALL",
    input.subjectId,
  ].join(":");
  try {
    return await prisma.$transaction(async (transaction) => {
      if (
        input.id &&
        !(await transaction.teacherAssignment.findFirst({
          where: { id: input.id, schoolId: actor.schoolId },
        }))
      )
        throw new NotFoundError("Teacher assignment not found.");
      if (input.isClassTeacher && input.status === "ACTIVE")
        await transaction.teacherAssignment.updateMany({
          where: {
            schoolId: actor.schoolId,
            academicYearId: input.academicYearId,
            classId: input.classId,
            ...(input.sectionId
              ? { OR: [{ sectionId: input.sectionId }, { sectionId: null }] }
              : {}),
            isClassTeacher: true,
            ...(input.id ? { id: { not: input.id } } : {}),
          },
          data: { isClassTeacher: false },
        });
      const data = {
        schoolId: actor.schoolId,
        assignmentKey,
        academicYearId: input.academicYearId,
        teacherId: input.teacherId,
        classId: input.classId,
        sectionId: input.sectionId || null,
        subjectId: input.subjectId,
        isClassTeacher: input.isClassTeacher,
        status: input.status,
      };
      const assignment = input.id
        ? await transaction.teacherAssignment.update({
            where: { id: input.id },
            data,
          })
        : await transaction.teacherAssignment.create({
            data: { ...data, createdById: actor.userId },
          });
      await transaction.auditLog.create({
        data: {
          schoolId: actor.schoolId,
          userId: actor.userId,
          action: AuditAction.TEACHER_ASSIGNMENT_CREATED,
          entityType: "TeacherAssignment",
          entityId: assignment.id,
          description: `Assigned ${teacher.firstName} ${teacher.lastName} to ${schoolClass.name}${section ? ` ${section.name}` : ""} for ${subject.name}.`,
          newValue: {
            academicYearId: year.id,
            classId: schoolClass.id,
            sectionId: section?.id ?? null,
            subjectId: subject.id,
            isClassTeacher: input.isClassTeacher,
          },
          ...actor.metadata,
        },
      });
      // Assignment ownership controls class-teacher access, including the replaced teacher.
      const role = await ensureTenantRole(
        transaction,
        actor.schoolId,
        ROLE_CODES.CLASS_TEACHER,
      );
      const teachingUsers = await transaction.teacher.findMany({
        where: { schoolId: actor.schoolId, userId: { not: null } },
        select: {
          id: true,
          userId: true,
          assignments: {
            where: { status: "ACTIVE", isClassTeacher: true },
            select: { id: true },
            take: 1,
          },
        },
      });
      for (const linked of teachingUsers) {
        if (linked.assignments.length)
          await transaction.userRole.upsert({
            where: {
              userId_roleId: { userId: linked.userId!, roleId: role.id },
            },
            update: { schoolId: actor.schoolId },
            create: {
              schoolId: actor.schoolId,
              userId: linked.userId!,
              roleId: role.id,
            },
          });
        else
          await transaction.userRole.deleteMany({
            where: {
              schoolId: actor.schoolId,
              userId: linked.userId!,
              roleId: role.id,
            },
          });
      }
      return assignment;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new ConflictError("That teacher assignment already exists.");
    throw error;
  }
}

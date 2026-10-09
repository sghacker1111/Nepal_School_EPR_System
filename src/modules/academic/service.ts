import { AuditAction, Prisma } from "@/generated/prisma/client";

import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type {
  AcademicYearInput,
  ClassInput,
  ClassSubjectInput,
  SectionInput,
  SubjectInput,
} from "@/modules/academic/validation";
import type { RequestMetadata } from "@/modules/audit/service";

type Actor = { schoolId: string; userId: string; metadata: RequestMetadata };

function optional<T>(value: T | "" | undefined) {
  return value === "" || value === undefined ? null : value;
}

function conflict(error: unknown, message: string): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new ConflictError(message);
  }
  throw error;
}

export async function saveAcademicYear(input: AcademicYearInput, actor: Actor) {
  try {
    return await prisma.$transaction(async (transaction) => {
      if (input.id) {
        const existing = await transaction.academicYear.findFirst({
          where: { id: input.id, schoolId: actor.schoolId },
        });
        if (!existing) throw new NotFoundError("Academic year not found.");
      }
      if (input.isCurrent) {
        await transaction.academicYear.updateMany({
          where: {
            schoolId: actor.schoolId,
            isCurrent: true,
            ...(input.id ? { id: { not: input.id } } : {}),
          },
          data: { isCurrent: false },
        });
      }
      const data = {
        schoolId: actor.schoolId,
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        isCurrent: input.isCurrent,
        status: input.status,
        createdById: actor.userId,
      };
      const record = input.id
        ? await transaction.academicYear.update({
            where: { id: input.id },
            data,
          })
        : await transaction.academicYear.create({ data });
      await transaction.auditLog.create({
        data: {
          schoolId: actor.schoolId,
          userId: actor.userId,
          action: input.id
            ? AuditAction.ACADEMIC_YEAR_UPDATED
            : AuditAction.ACADEMIC_YEAR_CREATED,
          entityType: "AcademicYear",
          entityId: record.id,
          description: `${input.id ? "Updated" : "Created"} academic year ${record.name}.`,
          newValue: {
            name: record.name,
            isCurrent: record.isCurrent,
            status: record.status,
          },
          ...actor.metadata,
        },
      });
      return record;
    });
  } catch (error) {
    conflict(error, "An academic year with that name already exists.");
  }
}

export async function saveClass(input: ClassInput, actor: Actor) {
  try {
    return await prisma.$transaction(async (transaction) => {
      if (
        input.id &&
        !(await transaction.class.findFirst({
          where: { id: input.id, schoolId: actor.schoolId },
        }))
      )
        throw new NotFoundError("Class not found.");
      const data = {
        schoolId: actor.schoolId,
        name: input.name,
        numericLevel: optional(input.numericLevel),
        displayOrder: input.displayOrder,
        status: input.status,
        createdById: actor.userId,
      };
      const record = input.id
        ? await transaction.class.update({ where: { id: input.id }, data })
        : await transaction.class.create({ data });
      await transaction.auditLog.create({
        data: {
          schoolId: actor.schoolId,
          userId: actor.userId,
          action: input.id
            ? AuditAction.CLASS_UPDATED
            : AuditAction.CLASS_CREATED,
          entityType: "Class",
          entityId: record.id,
          description: `${input.id ? "Updated" : "Created"} class ${record.name}.`,
          newValue: { name: record.name, status: record.status },
          ...actor.metadata,
        },
      });
      return record;
    });
  } catch (error) {
    conflict(error, "A class with that name already exists.");
  }
}

export async function saveSection(input: SectionInput, actor: Actor) {
  const relatedClass = await prisma.class.findFirst({
    where: { id: input.classId, schoolId: actor.schoolId },
  });
  if (!relatedClass)
    throw new ValidationError("Select a class belonging to your school.");
  try {
    return await prisma.$transaction(async (transaction) => {
      if (input.id) {
        const existing = await transaction.section.findFirst({
          where: { id: input.id, schoolId: actor.schoolId },
        });
        if (!existing) throw new NotFoundError("Section not found.");
        if (existing.classId !== input.classId)
          throw new ValidationError(
            "A section cannot be moved to another class. Create a new section to preserve enrollment and exam history.",
          );
      }
      const data = {
        schoolId: actor.schoolId,
        classId: input.classId,
        name: input.name,
        capacity: optional(input.capacity),
        status: input.status,
        createdById: actor.userId,
      };
      const record = input.id
        ? await transaction.section.update({ where: { id: input.id }, data })
        : await transaction.section.create({ data });
      await transaction.auditLog.create({
        data: {
          schoolId: actor.schoolId,
          userId: actor.userId,
          action: input.id
            ? AuditAction.SECTION_UPDATED
            : AuditAction.SECTION_CREATED,
          entityType: "Section",
          entityId: record.id,
          description: `${input.id ? "Updated" : "Created"} section ${relatedClass.name} ${record.name}.`,
          newValue: {
            classId: record.classId,
            name: record.name,
            status: record.status,
          },
          ...actor.metadata,
        },
      });
      return record;
    });
  } catch (error) {
    conflict(error, "That section already exists for the selected class.");
  }
}

export async function saveSubject(input: SubjectInput, actor: Actor) {
  try {
    return await prisma.$transaction(async (transaction) => {
      if (
        input.id &&
        !(await transaction.subject.findFirst({
          where: { id: input.id, schoolId: actor.schoolId },
        }))
      )
        throw new NotFoundError("Subject not found.");
      const data = {
        schoolId: actor.schoolId,
        name: input.name,
        code: input.code.toUpperCase(),
        shortName: optional(input.shortName),
        subjectType: input.subjectType,
        theoryFullMarks: input.theoryFullMarks,
        practicalFullMarks: input.practicalFullMarks,
        internalFullMarks: input.internalFullMarks,
        passMarks: optional(input.passMarks),
        status: input.status,
        createdById: actor.userId,
      };
      const record = input.id
        ? await transaction.subject.update({ where: { id: input.id }, data })
        : await transaction.subject.create({ data });
      await transaction.auditLog.create({
        data: {
          schoolId: actor.schoolId,
          userId: actor.userId,
          action: input.id
            ? AuditAction.SUBJECT_UPDATED
            : AuditAction.SUBJECT_CREATED,
          entityType: "Subject",
          entityId: record.id,
          description: `${input.id ? "Updated" : "Created"} subject ${record.name}.`,
          newValue: {
            code: record.code,
            name: record.name,
            status: record.status,
          },
          ...actor.metadata,
        },
      });
      return record;
    });
  } catch (error) {
    conflict(error, "A subject with that code already exists.");
  }
}

export async function saveClassSubject(input: ClassSubjectInput, actor: Actor) {
  const [year, schoolClass, subject] = await Promise.all([
    prisma.academicYear.findFirst({
      where: { id: input.academicYearId, schoolId: actor.schoolId },
    }),
    prisma.class.findFirst({
      where: { id: input.classId, schoolId: actor.schoolId },
    }),
    prisma.subject.findFirst({
      where: { id: input.subjectId, schoolId: actor.schoolId },
    }),
  ]);
  if (!year || !schoolClass || !subject)
    throw new ValidationError(
      "Academic year, class, and subject must belong to your school.",
    );
  try {
    return await prisma.$transaction(async (transaction) => {
      if (input.id) {
        const existing = await transaction.classSubject.findFirst({
          where: { id: input.id, schoolId: actor.schoolId },
        });
        if (!existing)
          throw new NotFoundError("Class subject assignment not found.");
        if (
          existing.academicYearId !== input.academicYearId ||
          existing.classId !== input.classId ||
          existing.subjectId !== input.subjectId
        )
          throw new ValidationError(
            "Create a new class-subject link instead of moving an existing link used by teachers and exams.",
          );
        if (
          existing.isOptional !== (input.isOptional ?? false) &&
          (await transaction.examSubject.count({
            where: {
              schoolId: actor.schoolId,
              classId: existing.classId,
              subjectId: existing.subjectId,
              exam: { academicYearId: existing.academicYearId },
              markSheets: { some: {} },
            },
          }))
        )
          throw new ValidationError(
            "Optional status cannot change after marks exist. Configure the next academic year separately.",
          );
        if (input.status !== "ACTIVE") {
          const used = await transaction.teacherAssignment.count({
            where: {
              schoolId: actor.schoolId,
              academicYearId: existing.academicYearId,
              classId: existing.classId,
              subjectId: existing.subjectId,
              status: "ACTIVE",
            },
          });
          if (used)
            throw new ValidationError(
              "Deactivate linked teacher assignments before deactivating this class subject.",
            );
        }
      }
      const data = {
        schoolId: actor.schoolId,
        academicYearId: input.academicYearId,
        classId: input.classId,
        subjectId: input.subjectId,
        fullMarks: input.fullMarks,
        theoryMarks: input.theoryMarks,
        practicalMarks: input.practicalMarks,
        internalMarks: input.internalMarks,
        isOptional: input.isOptional ?? false,
        passMarks: optional(input.passMarks),
        creditHour: optional(input.creditHour),
        displayOrder: input.displayOrder,
        status: input.status,
        createdById: actor.userId,
      };
      const record = input.id
        ? await transaction.classSubject.update({
            where: { id: input.id },
            data,
          })
        : await transaction.classSubject.create({ data });
      await transaction.auditLog.create({
        data: {
          schoolId: actor.schoolId,
          userId: actor.userId,
          action: AuditAction.CLASS_SUBJECT_ASSIGNED,
          entityType: "ClassSubject",
          entityId: record.id,
          description: `Assigned ${subject.name} to ${schoolClass.name} for ${year.name}.`,
          newValue: {
            fullMarks: record.fullMarks,
            theoryMarks: record.theoryMarks,
            practicalMarks: record.practicalMarks,
          },
          ...actor.metadata,
        },
      });
      return record;
    });
  } catch (error) {
    conflict(
      error,
      "That subject is already assigned to the class for this academic year.",
    );
  }
}

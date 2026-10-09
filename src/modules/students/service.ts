import {
  AuditAction,
  Prisma,
  type GuardianRelationship,
  type StudentStatus,
} from "@/generated/prisma/client";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { makeTenantIdentityKey } from "@/lib/identity";
import { prisma } from "@/lib/prisma";
import { normalizeIdentity } from "@/lib/utils";
import type { RequestMetadata } from "@/modules/audit/service";
import { ROLE_CODES } from "@/modules/auth/constants";
import { hashPassword } from "@/modules/auth/password";
import { ensureTenantRole } from "@/modules/auth/rbac-service";
import {
  evaluateStudentDuplicate,
  type DuplicateMatch,
  type DuplicateProbe,
} from "@/modules/students/duplicates";
import type {
  EnrollmentInput,
  StudentInput,
} from "@/modules/students/validation";
type Actor = { schoolId: string; userId: string; metadata: RequestMetadata };
const optionalText = (value?: string) => value?.trim() || null;
const optionalDate = (value?: Date | "") =>
  value === "" || !value ? null : value;
const optionalWard = (value?: number | "") =>
  value === "" || value === undefined ? null : value;
const normalizedName = (...parts: (string | undefined)[]) =>
  parts.filter(Boolean).join(" ").trim().toLocaleLowerCase("en-US");
function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts.shift() ?? fullName;
  const lastName = parts.pop() ?? "-";
  return {
    firstName,
    middleName: parts.join(" ") || null,
    lastName,
    normalizedName: normalizedName(firstName, ...parts, lastName),
  };
}
function probeFromInput(input: StudentInput): DuplicateProbe {
  return {
    iemisId: input.iemisId || undefined,
    birthRegistrationNumber: input.birthRegistrationNumber || undefined,
    registrationNumber: input.registrationNumber || undefined,
    normalizedName: normalizedName(
      input.firstName,
      input.middleName,
      input.lastName,
    ),
    dateOfBirthAd:
      input.dateOfBirthAd instanceof Date ? input.dateOfBirthAd : undefined,
    fatherName: input.fatherName || undefined,
    motherName: input.motherName || undefined,
    guardianMobile: input.guardianMobile || undefined,
    previousSchool: input.previousSchool || undefined,
  };
}
export async function findPotentialStudentDuplicates(
  schoolId: string,
  input: StudentInput,
  excludeId?: string,
): Promise<DuplicateMatch[]> {
  const probe = probeFromInput(input);
  const candidates = await prisma.student.findMany({
    where: {
      schoolId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [
        { normalizedName: probe.normalizedName },
        ...(probe.iemisId ? [{ iemisId: probe.iemisId }] : []),
        ...(probe.birthRegistrationNumber
          ? [{ birthRegistrationNumber: probe.birthRegistrationNumber }]
          : []),
        ...(probe.registrationNumber
          ? [{ registrationNumber: probe.registrationNumber }]
          : []),
        ...(probe.dateOfBirthAd
          ? [{ dateOfBirthAd: probe.dateOfBirthAd }]
          : []),
        ...(probe.guardianMobile
          ? [
              {
                guardians: {
                  some: { guardian: { mobile: probe.guardianMobile } },
                },
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      studentId: true,
      admissionNumber: true,
      iemisId: true,
      birthRegistrationNumber: true,
      registrationNumber: true,
      normalizedName: true,
      dateOfBirthAd: true,
      previousSchool: true,
      guardians: {
        select: {
          relationship: true,
          guardian: { select: { normalizedName: true, mobile: true } },
        },
      },
    },
    take: 25,
  });
  return candidates
    .map((candidate) => evaluateStudentDuplicate(candidate, probe))
    .filter((item): item is DuplicateMatch => Boolean(item))
    .sort((a, b) =>
      a.confidence === b.confidence ? 0 : a.confidence === "HIGH" ? -1 : 1,
    );
}
async function verifyAcademic(
  transaction: Prisma.TransactionClient,
  actor: Actor,
  yearId?: string,
  classId?: string,
  sectionId?: string,
) {
  if (!yearId || !classId || !sectionId)
    throw new ValidationError("Select an academic year, class, and section.");
  const [year, schoolClass, section] = await Promise.all([
    transaction.academicYear.findFirst({
      where: { id: yearId, schoolId: actor.schoolId },
    }),
    transaction.class.findFirst({
      where: { id: classId, schoolId: actor.schoolId },
    }),
    transaction.section.findFirst({
      where: { id: sectionId, schoolId: actor.schoolId, classId },
    }),
  ]);
  if (!year || !schoolClass || !section)
    throw new ValidationError(
      "Academic year, class, and section must belong to your school.",
    );
  if (
    !["ACTIVE", "PLANNED"].includes(year.status) ||
    schoolClass.status !== "ACTIVE" ||
    section.status !== "ACTIVE"
  )
    throw new ValidationError(
      "Use an open academic year and active class and section.",
    );
  return { year, schoolClass, section };
}
type GuardianData = {
  name?: string;
  mobile?: string;
  occupation?: string;
  education?: string;
  email?: string;
  relationship: GuardianRelationship;
  primary: boolean;
  emergency: boolean;
};
async function saveGuardians(
  transaction: Prisma.TransactionClient,
  studentId: string,
  input: StudentInput,
  actor: Actor,
) {
  // The form represents father, mother, and one primary contact. Reconcile
  // links, not guardian master records, so clearing a field really clears it.
  const guardians: GuardianData[] = [
    {
      name: input.fatherName,
      mobile: input.fatherMobile,
      occupation: input.fatherOccupation,
      education: input.fatherEducation,
      relationship: "FATHER",
      primary: false,
      emergency: false,
    },
    {
      name: input.motherName,
      mobile: input.motherMobile,
      occupation: input.motherOccupation,
      education: input.motherEducation,
      relationship: "MOTHER",
      primary: false,
      emergency: false,
    },
  ].filter((entry) => entry.name && entry.mobile) as GuardianData[];
  let primary = guardians.find(
    (entry) => entry.relationship === input.guardianRelationship,
  );
  if (!primary && input.guardianName && input.guardianMobile) {
    primary = {
      name: input.guardianName,
      mobile: input.guardianMobile,
      relationship: input.guardianRelationship,
      primary: true,
      emergency: true,
    };
    guardians.push(primary);
  }
  primary ??= guardians[0];
  if (primary) {
    primary.primary = true;
    primary.emergency = true;
    primary.email = input.guardianEmail ?? "";
  }
  const existingLinks = await transaction.studentGuardian.findMany({
    where: { schoolId: actor.schoolId, studentId },
    include: {
      guardian: { include: { _count: { select: { students: true } } } },
    },
  });
  const retained: string[] = [];
  for (const entry of guardians) {
    const existingLink = existingLinks.find(
      (link) => link.relationship === entry.relationship,
    );
    const data = {
      ...splitName(entry.name!),
      mobile: entry.mobile!,
      occupation: optionalText(entry.occupation),
      education: optionalText(entry.education),
      email:
        entry.email === undefined
          ? (existingLink?.guardian.email ?? null)
          : entry.email
            ? normalizeIdentity(entry.email)
            : null,
    };
    const changed =
      existingLink &&
      Object.entries(data).some(
        ([key, value]) =>
          existingLink.guardian[key as keyof typeof data] !== value,
      );
    // Editing one student's contact must not silently change a sibling's profile.
    const canUpdate =
      existingLink && (!changed || existingLink.guardian._count.students === 1);
    const guardian = canUpdate
      ? await transaction.guardian.update({
          where: { id: existingLink.guardianId },
          data,
        })
      : await transaction.guardian.create({
          data: {
            ...data,
            schoolId: actor.schoolId,
            createdById: actor.userId,
            citizenshipNumber: existingLink?.guardian.citizenshipNumber,
            address: existingLink?.guardian.address,
          },
        });
    const link = existingLink
      ? await transaction.studentGuardian.update({
          where: { id: existingLink.id },
          data: {
            guardianId: guardian.id,
            isPrimary: entry.primary,
            isEmergency: entry.emergency,
          },
        })
      : await transaction.studentGuardian.create({
          data: {
            schoolId: actor.schoolId,
            studentId,
            guardianId: guardian.id,
            relationship: entry.relationship,
            isPrimary: entry.primary,
            isEmergency: entry.emergency,
          },
        });
    retained.push(link.id);
  }
  await transaction.studentGuardian.deleteMany({
    where: { schoolId: actor.schoolId, studentId, id: { notIn: retained } },
  });
}
export async function saveStudent(input: StudentInput, actor: Actor) {
  const passwordHash = input.createLogin
    ? await hashPassword(input.temporaryPassword ?? "")
    : null;
  try {
    return await prisma.$transaction(async (transaction) => {
      const existing = input.id
        ? await transaction.student.findFirst({
            where: { id: input.id, schoolId: actor.schoolId },
          })
        : null;
      if (input.id && !existing) throw new NotFoundError("Student not found.");
      if (!input.id)
        await verifyAcademic(
          transaction,
          actor,
          input.academicYearId,
          input.classId,
          input.sectionId,
        );
      if (
        input.admissionAcademicYearId &&
        !(await transaction.academicYear.findFirst({
          where: {
            id: input.admissionAcademicYearId,
            schoolId: actor.schoolId,
          },
        }))
      )
        throw new ValidationError(
          "Admission academic year must belong to your school.",
        );
      if (
        input.admissionClassId &&
        !(await transaction.class.findFirst({
          where: { id: input.admissionClassId, schoolId: actor.schoolId },
        }))
      )
        throw new ValidationError(
          "Admission class must belong to your school.",
        );
      let userId = existing?.userId ?? null;
      if (input.createLogin && !userId) {
        const username = normalizeIdentity(input.username ?? "");
        const role = await ensureTenantRole(
          transaction,
          actor.schoolId,
          ROLE_CODES.STUDENT,
        );
        const user = await transaction.user.create({
          data: {
            schoolId: actor.schoolId,
            identityKey: makeTenantIdentityKey(actor.schoolId, username),
            username: input.username!.trim(),
            normalizedUsername: username,
            email: input.loginEmail || null,
            normalizedEmail: input.loginEmail
              ? normalizeIdentity(input.loginEmail)
              : null,
            mobile: optionalText(input.mobile),
            passwordHash: passwordHash!,
            firstName: input.firstName,
            middleName: optionalText(input.middleName),
            lastName: input.lastName,
            status: "ACTIVE",
            mustChangePassword: true,
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
      }
      const permanent = {
        province: optionalText(input.permanentProvince),
        district: optionalText(input.permanentDistrict),
        localLevel: optionalText(input.permanentLocalLevel),
        ward: optionalWard(input.permanentWard),
        tole: optionalText(input.permanentTole),
        address: optionalText(input.permanentAddress),
      };
      const data = {
        schoolId: actor.schoolId,
        userId,
        studentId: input.studentId.trim(),
        admissionNumber: input.admissionNumber.trim(),
        iemisId: optionalText(input.iemisId),
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
        dateOfBirthBs: optionalText(input.dateOfBirthBs),
        dateOfBirthAd: optionalDate(input.dateOfBirthAd),
        bloodGroup: optionalText(input.bloodGroup),
        nationality: input.nationality,
        motherTongue: optionalText(input.motherTongue),
        religion: optionalText(input.religion),
        birthRegistrationNumber: optionalText(input.birthRegistrationNumber),
        citizenshipNumber: optionalText(input.citizenshipNumber),
        mobile: optionalText(input.mobile),
        email: input.email ? normalizeIdentity(input.email) : null,
        permanentProvince: permanent.province,
        permanentDistrict: permanent.district,
        permanentLocalLevel: permanent.localLevel,
        permanentWard: permanent.ward,
        permanentTole: permanent.tole,
        permanentAddress: permanent.address,
        temporarySameAsPermanent: input.temporarySameAsPermanent,
        temporaryProvince: input.temporarySameAsPermanent
          ? permanent.province
          : optionalText(input.temporaryProvince),
        temporaryDistrict: input.temporarySameAsPermanent
          ? permanent.district
          : optionalText(input.temporaryDistrict),
        temporaryLocalLevel: input.temporarySameAsPermanent
          ? permanent.localLevel
          : optionalText(input.temporaryLocalLevel),
        temporaryWard: input.temporarySameAsPermanent
          ? permanent.ward
          : optionalWard(input.temporaryWard),
        temporaryTole: input.temporarySameAsPermanent
          ? permanent.tole
          : optionalText(input.temporaryTole),
        temporaryAddress: input.temporarySameAsPermanent
          ? permanent.address
          : optionalText(input.temporaryAddress),
        admissionDate: input.admissionDate,
        admissionAcademicYearId: optionalText(input.admissionAcademicYearId),
        admissionClassId: optionalText(input.admissionClassId),
        previousSchool: optionalText(input.previousSchool),
        previousClass: optionalText(input.previousClass),
        previousSchoolIemisCode: optionalText(input.previousSchoolIemisCode),
        registrationNumber: optionalText(input.registrationNumber),
        scholarshipStatus: input.scholarshipStatus,
        scholarshipCategory: optionalText(input.scholarshipCategory),
        transportationRequired: input.transportationRequired,
        hostelStatus: input.hostelStatus,
        ethnicityCategory: optionalText(input.ethnicityCategory),
        disabilityStatus: input.disabilityStatus,
        disabilityType: optionalText(input.disabilityType),
        economicStatus: optionalText(input.economicStatus),
        medicalNotes: optionalText(input.medicalNotes),
        allergies: optionalText(input.allergies),
        metadata: input.emergencyContact
          ? { emergencyContact: input.emergencyContact }
          : Prisma.JsonNull,
        status: input.status,
        archivedAt: input.status === "ARCHIVED" ? new Date() : null,
        archivedById: input.status === "ARCHIVED" ? actor.userId : null,
      };
      const student = input.id
        ? await transaction.student.update({ where: { id: input.id }, data })
        : await transaction.student.create({
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
      await saveGuardians(transaction, student.id, input, actor);
      if (!input.id) {
        await transaction.studentEnrollment.create({
          data: {
            schoolId: actor.schoolId,
            studentId: student.id,
            academicYearId: input.academicYearId!,
            classId: input.classId!,
            sectionId: input.sectionId!,
            rollNumber: optionalText(input.rollNumber),
            enrollmentDate: input.enrollmentDate as Date,
            status: "ACTIVE",
            createdById: actor.userId,
          },
        });
      }
      const auditRows: Prisma.AuditLogCreateManyInput[] = [
        {
          schoolId: actor.schoolId,
          userId: actor.userId,
          action: input.id
            ? AuditAction.STUDENT_UPDATED
            : AuditAction.STUDENT_CREATED,
          entityType: "Student",
          entityId: student.id,
          description: `${input.id ? "Updated" : "Created"} student ${student.studentId}.`,
          newValue: {
            studentId: student.studentId,
            admissionNumber: student.admissionNumber,
            name: `${student.firstName} ${student.lastName}`,
            status: student.status,
          },
          ...actor.metadata,
        },
      ];
      if (!input.id)
        auditRows.push({
          schoolId: actor.schoolId,
          userId: actor.userId,
          action: AuditAction.STUDENT_ENROLLED,
          entityType: "StudentEnrollment",
          entityId: student.id,
          description: `Created initial enrollment for ${student.studentId}.`,
          ...actor.metadata,
        });
      if (input.duplicateOverride)
        auditRows.push({
          schoolId: actor.schoolId,
          userId: actor.userId,
          action: AuditAction.STUDENT_DUPLICATE_OVERRIDE,
          entityType: "Student",
          entityId: student.id,
          description: `Administrator overrode a duplicate warning for ${student.studentId}.`,
          ...actor.metadata,
        });
      await transaction.auditLog.createMany({ data: auditRows });
      return student;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new ConflictError(
        "Student ID, admission number, IEMIS ID, registration number, or roll number is already in use.",
      );
    throw error;
  }
}
export async function changeStudentStatus(
  studentId: string,
  status: StudentStatus,
  actor: Actor,
) {
  const existing = await prisma.student.findFirst({
    where: { id: studentId, schoolId: actor.schoolId },
  });
  if (!existing) throw new NotFoundError("Student not found.");
  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.student.update({
      where: { id: studentId },
      data: {
        status,
        archivedAt:
          status === "ARCHIVED"
            ? new Date()
            : status === "ACTIVE"
              ? null
              : existing.archivedAt,
        archivedById:
          status === "ARCHIVED"
            ? actor.userId
            : status === "ACTIVE"
              ? null
              : existing.archivedById,
      },
    });
    if (existing.userId) {
      await transaction.user.update({
        where: { id: existing.userId },
        data: {
          status: status === "ACTIVE" ? "ACTIVE" : "ARCHIVED",
          sessionVersion: { increment: 1 },
        },
      });
      await transaction.session.updateMany({
        where: { userId: existing.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await transaction.auditLog.create({
      data: {
        schoolId: actor.schoolId,
        userId: actor.userId,
        action:
          status === "ARCHIVED"
            ? AuditAction.STUDENT_ARCHIVED
            : status === "ACTIVE" && existing.status === "ARCHIVED"
              ? AuditAction.STUDENT_RESTORED
              : AuditAction.STUDENT_STATUS_CHANGED,
        entityType: "Student",
        entityId: studentId,
        description: `Student status changed from ${existing.status} to ${status}.`,
        oldValue: { status: existing.status },
        newValue: { status },
        ...actor.metadata,
      },
    });
    return updated;
  });
}
export async function saveEnrollment(input: EnrollmentInput, actor: Actor) {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, schoolId: actor.schoolId },
  });
  if (!student) throw new NotFoundError("Student not found.");
  return prisma.$transaction(async (transaction) => {
    const { year } = await verifyAcademic(
      transaction,
      actor,
      input.academicYearId,
      input.classId,
      input.sectionId,
    );
    if (
      input.enrollmentDate < year.startDate ||
      input.enrollmentDate > year.endDate
    )
      throw new ValidationError(
        "Enrollment date must fall within the selected academic year.",
      );
    const existingEnrollment = await transaction.studentEnrollment.findFirst({
      where: {
        schoolId: actor.schoolId,
        studentId: input.studentId,
        academicYearId: input.academicYearId,
      },
    });
    if (
      existingEnrollment &&
      (existingEnrollment.classId !== input.classId ||
        existingEnrollment.sectionId !== input.sectionId)
    ) {
      const history =
        (await transaction.attendanceRecord.count({
          where: {
            schoolId: actor.schoolId,
            studentId: input.studentId,
            session: { academicYearId: input.academicYearId },
          },
        })) +
        (await transaction.studentMark.count({
          where: {
            schoolId: actor.schoolId,
            studentId: input.studentId,
            markSheet: {
              examSubject: { exam: { academicYearId: input.academicYearId } },
            },
          },
        }));
      if (history)
        throw new ValidationError(
          "This enrollment has attendance or marks. Preserve its class and section; promote into a new academic year instead.",
        );
    }
    if (student.status !== "ACTIVE" && input.status === "ACTIVE")
      throw new ValidationError(
        "Restore the student profile before activating enrollment.",
      );
    const priorCount = await transaction.studentEnrollment.count({
      where: { schoolId: actor.schoolId, studentId: input.studentId },
    });
    const enrollment = await transaction.studentEnrollment.upsert({
      where: {
        schoolId_studentId_academicYearId: {
          schoolId: actor.schoolId,
          studentId: input.studentId,
          academicYearId: input.academicYearId,
        },
      },
      update: {
        classId: input.classId,
        sectionId: input.sectionId,
        rollNumber: optionalText(input.rollNumber),
        enrollmentDate: input.enrollmentDate,
        status: input.status,
        remarks: optionalText(input.remarks),
      },
      create: {
        schoolId: actor.schoolId,
        studentId: input.studentId,
        academicYearId: input.academicYearId,
        classId: input.classId,
        sectionId: input.sectionId,
        rollNumber: optionalText(input.rollNumber),
        enrollmentDate: input.enrollmentDate,
        status: input.status,
        remarks: optionalText(input.remarks),
        createdById: actor.userId,
      },
    });
    await transaction.auditLog.create({
      data: {
        schoolId: actor.schoolId,
        userId: actor.userId,
        action: priorCount
          ? AuditAction.STUDENT_PROMOTED
          : AuditAction.STUDENT_ENROLLED,
        entityType: "StudentEnrollment",
        entityId: enrollment.id,
        description: `${priorCount ? "Promoted/enrolled" : "Enrolled"} student ${student.studentId} for a school year.`,
        newValue: {
          academicYearId: input.academicYearId,
          classId: input.classId,
          sectionId: input.sectionId,
          rollNumber: input.rollNumber || null,
          status: input.status,
        },
        ...actor.metadata,
      },
    });
    return enrollment;
  });
}
export async function hideFromCurrentClass(studentId: string, actor: Actor) {
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { schoolId: actor.schoolId, studentId, status: "ACTIVE" },
    orderBy: { enrollmentDate: "desc" },
  });
  if (!enrollment) throw new NotFoundError("No active enrollment found.");
  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.studentEnrollment.update({
      where: { id: enrollment.id },
      data: { status: "INACTIVE" },
    });
    await transaction.auditLog.create({
      data: {
        schoolId: actor.schoolId,
        userId: actor.userId,
        action: AuditAction.STUDENT_STATUS_CHANGED,
        entityType: "StudentEnrollment",
        entityId: enrollment.id,
        description:
          "Student was hidden from the current class without deleting history.",
        oldValue: { status: enrollment.status },
        newValue: { status: "INACTIVE" },
        ...actor.metadata,
      },
    });
    return updated;
  });
}
export async function saveOptionalSubjects(
  enrollmentId: string,
  subjectIds: string[],
  actor: Actor,
) {
  return prisma.$transaction(async (tx) => {
    const enrollment = await tx.studentEnrollment.findFirst({
      where: { id: enrollmentId, schoolId: actor.schoolId },
    });
    if (!enrollment) throw new NotFoundError("Enrollment not found.");
    if (enrollment.status !== "ACTIVE")
      throw new ValidationError(
        "Subject choices require an active enrollment.",
      );
    const choices = [...new Set(subjectIds)];
    const available = await tx.classSubject.findMany({
      where: {
        schoolId: actor.schoolId,
        academicYearId: enrollment.academicYearId,
        classId: enrollment.classId,
        status: "ACTIVE",
        isOptional: true,
      },
      select: { subjectId: true },
    });
    if (
      choices.some((id) => !available.some((option) => option.subjectId === id))
    )
      throw new ValidationError(
        "Every optional subject must belong to this student's class and academic year.",
      );
    if (
      await tx.studentMark.count({
        where: {
          schoolId: actor.schoolId,
          studentId: enrollment.studentId,
          markSheet: {
            examSubject: {
              exam: { academicYearId: enrollment.academicYearId },
            },
          },
        },
      })
    )
      throw new ValidationError(
        "Subject choices cannot change after marks exist. Contact the administrator before recording marks.",
      );
    const updated = await tx.studentEnrollment.update({
      where: { id: enrollment.id },
      data: { optionalSubjectIds: choices },
    });
    await tx.auditLog.create({
      data: {
        schoolId: actor.schoolId,
        userId: actor.userId,
        action: "STUDENT_UPDATED",
        entityType: "StudentEnrollment",
        entityId: enrollment.id,
        description: "Updated optional subject choices.",
        oldValue: { subjectIds: enrollment.optionalSubjectIds },
        newValue: { subjectIds: choices },
        ...actor.metadata,
      },
    });
    return updated;
  });
}

import {
  AcademicCalendar,
  AuditAction,
  Prisma,
  RoleScope,
  type SchoolStatus,
} from "@/generated/prisma/client";

import { ConflictError, NotFoundError } from "@/lib/errors";
import { makeTenantIdentityKey } from "@/lib/identity";
import { prisma } from "@/lib/prisma";
import { normalizeIdentity, normalizeSchoolCode } from "@/lib/utils";
import { ROLE_CODES, SCHOOL_PERMISSIONS } from "@/modules/auth/constants";
import { ensureDefaultTenantRoles } from "@/modules/auth/rbac-service";
import { hashPassword } from "@/modules/auth/password";
import type { RequestMetadata } from "@/modules/audit/service";
import type {
  CreateSchoolInput,
  UpdateSchoolProfileInput,
} from "@/modules/schools/validation";

function optional(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts.shift() ?? fullName;
  const lastName = parts.pop() ?? "Admin";
  return { firstName, middleName: parts.join(" ") || null, lastName };
}

export async function createSchoolWithAdministrator(
  input: CreateSchoolInput,
  actorUserId: string,
  metadata: RequestMetadata,
) {
  const passwordHash = await hashPassword(input.temporaryPassword);
  const code = normalizeSchoolCode(input.code);
  const adminUsername = normalizeIdentity(input.adminUsername);
  const adminEmail = normalizeIdentity(input.adminEmail);
  const adminName = splitFullName(input.adminFullName);

  try {
    const created = await prisma.$transaction(async (transaction) => {
      const school = await transaction.school.create({
        data: {
          name: input.name,
          code,
          iemisCode: optional(input.iemisCode),
          type: input.type,
          level: input.level,
          establishmentYear: input.establishmentYear,
          registrationNumber: optional(input.registrationNumber),
          panVat: optional(input.panVat),
          province: input.province,
          district: input.district,
          localLevel: input.localLevel,
          ward: input.ward,
          tole: optional(input.tole),
          address: input.address,
          phone: optional(input.phone),
          mobile: input.mobile,
          email: input.email,
          website: optional(input.website),
          principalName: input.principalName,
          principalPhone: input.principalPhone,
          principalEmail: optional(input.principalEmail),
          status: input.status,
          createdById: actorUserId,
        },
      });

      await transaction.schoolSetting.create({
        data: {
          schoolId: school.id,
          calendarPreference: input.calendarPreference as AcademicCalendar,
          defaultAcademicYear: optional(input.defaultAcademicYear),
          defaultLanguage: input.defaultLanguage,
          attendanceEnabled: input.attendanceEnabled,
          examinationEnabled: input.examinationEnabled,
          questionBankEnabled: input.questionBankEnabled,
        },
      });

      const permissions = [];
      for (const [permissionCode, name] of SCHOOL_PERMISSIONS) {
        permissions.push(
          await transaction.permission.upsert({
            where: { identityKey: `global:${permissionCode}` },
            update: { name },
            create: {
              identityKey: `global:${permissionCode}`,
              code: permissionCode,
              name,
            },
          }),
        );
      }

      const role = await transaction.role.create({
        data: {
          schoolId: school.id,
          identityKey: `${school.id}:${ROLE_CODES.SCHOOL_ADMIN}`,
          code: ROLE_CODES.SCHOOL_ADMIN,
          name: "School Administrator",
          description: "Full administrative access within this school only.",
          scope: RoleScope.SCHOOL,
          isSystem: true,
          permissions: {
            create: permissions.map((permission) => ({
              schoolId: school.id,
              permissionId: permission.id,
            })),
          },
        },
      });

      await ensureDefaultTenantRoles(transaction, school.id);

      const administrator = await transaction.user.create({
        data: {
          schoolId: school.id,
          identityKey: makeTenantIdentityKey(school.id, adminUsername),
          username: input.adminUsername.trim(),
          normalizedUsername: adminUsername,
          email: input.adminEmail.trim(),
          normalizedEmail: adminEmail,
          mobile: input.adminMobile,
          passwordHash,
          ...adminName,
          status: "ACTIVE",
          mustChangePassword: true,
          createdById: actorUserId,
          roles: {
            create: {
              schoolId: school.id,
              roleId: role.id,
              assignedBy: actorUserId,
            },
          },
        },
      });

      await transaction.auditLog.createMany({
        data: [
          {
            schoolId: school.id,
            userId: actorUserId,
            action: AuditAction.SCHOOL_CREATED,
            entityType: "School",
            entityId: school.id,
            description: `School ${school.code} was created.`,
            newValue: {
              name: school.name,
              code: school.code,
              status: school.status,
            },
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
          },
          {
            schoolId: school.id,
            userId: actorUserId,
            action: AuditAction.SCHOOL_ADMIN_CREATED,
            entityType: "User",
            entityId: administrator.id,
            description: "The first School Administrator account was created.",
            newValue: {
              username: administrator.username,
              email: administrator.email,
            },
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
          },
        ],
      });

      return { school, administrator };
    });

    return {
      schoolId: created.school.id,
      schoolName: created.school.name,
      schoolCode: created.school.code,
      adminUsername: created.administrator.username,
      temporaryPassword: input.temporaryPassword,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictError(
        "That school code, IEMIS code, administrator username, or email is already in use.",
      );
    }
    throw error;
  }
}

export async function changeSchoolStatus(
  schoolId: string,
  status: SchoolStatus,
  actorUserId: string,
  metadata: RequestMetadata,
) {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new NotFoundError("School not found.");
  if (school.status === status) return school;

  const actionByStatus: Record<SchoolStatus, AuditAction> = {
    ACTIVE: AuditAction.SCHOOL_ACTIVATED,
    TRIAL: AuditAction.SCHOOL_RESTORED,
    SUSPENDED: AuditAction.SCHOOL_SUSPENDED,
    ARCHIVED: AuditAction.SCHOOL_ARCHIVED,
  };

  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.school.update({
      where: { id: schoolId },
      data: {
        status,
        archivedAt: status === "ARCHIVED" ? new Date() : null,
      },
    });

    if (["SUSPENDED", "ARCHIVED"].includes(status)) {
      await transaction.session.updateMany({
        where: { schoolId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await transaction.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: actionByStatus[status],
        entityType: "School",
        entityId: schoolId,
        description: `School status changed from ${school.status} to ${status}.`,
        oldValue: { status: school.status },
        newValue: { status },
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
    });
    return updated;
  });
}

export async function resetSchoolAdministratorPassword(input: {
  schoolId: string;
  userId: string;
  temporaryPassword: string;
  actorUserId: string;
  metadata: RequestMetadata;
}) {
  const administrator = await prisma.user.findFirst({
    where: {
      id: input.userId,
      schoolId: input.schoolId,
      roles: { some: { role: { code: ROLE_CODES.SCHOOL_ADMIN } } },
    },
  });
  if (!administrator)
    throw new NotFoundError("School Administrator not found.");

  const passwordHash = await hashPassword(input.temporaryPassword);
  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: administrator.id },
      data: {
        passwordHash,
        mustChangePassword: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        sessionVersion: { increment: 1 },
      },
    });
    await transaction.session.updateMany({
      where: { userId: administrator.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await transaction.auditLog.create({
      data: {
        schoolId: input.schoolId,
        userId: input.actorUserId,
        action: AuditAction.PASSWORD_RESET,
        entityType: "User",
        entityId: administrator.id,
        description: "Super Admin reset a School Administrator password.",
        ipAddress: input.metadata.ipAddress,
        userAgent: input.metadata.userAgent,
      },
    });
  });

  return {
    schoolId: input.schoolId,
    adminUsername: administrator.username,
    temporaryPassword: input.temporaryPassword,
  };
}

export async function updateSchoolProfile(
  input: UpdateSchoolProfileInput,
  actorUserId: string,
  metadata: RequestMetadata,
) {
  const existing = await prisma.school.findUnique({
    where: { id: input.schoolId },
  });
  if (!existing) throw new NotFoundError("School not found.");

  try {
    return await prisma.$transaction(async (transaction) => {
      const school = await transaction.school.update({
        where: { id: input.schoolId },
        data: {
          name: input.name,
          code: normalizeSchoolCode(input.code),
          iemisCode: optional(input.iemisCode),
          type: input.type,
          level: input.level,
          establishmentYear: input.establishmentYear,
          registrationNumber: optional(input.registrationNumber),
          panVat: optional(input.panVat),
          province: input.province,
          district: input.district,
          localLevel: input.localLevel,
          ward: input.ward,
          tole: optional(input.tole),
          address: input.address,
          phone: optional(input.phone),
          mobile: input.mobile,
          email: input.email,
          website: optional(input.website),
          principalName: input.principalName,
          principalPhone: input.principalPhone,
          principalEmail: optional(input.principalEmail),
        },
      });
      await transaction.auditLog.create({
        data: {
          schoolId: school.id,
          userId: actorUserId,
          action: AuditAction.SCHOOL_UPDATED,
          entityType: "School",
          entityId: school.id,
          description: `School ${school.code} profile was updated.`,
          oldValue: {
            name: existing.name,
            code: existing.code,
            email: existing.email,
            principalName: existing.principalName,
          },
          newValue: {
            name: school.name,
            code: school.code,
            email: school.email,
            principalName: school.principalName,
          },
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      });
      return school;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictError(
        "That school code or IEMIS code is already in use.",
      );
    }
    throw error;
  }
}

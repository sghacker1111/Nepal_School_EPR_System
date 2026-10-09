import { RoleScope, type Prisma } from "@/generated/prisma/client";

import {
  ROLE_CODES,
  SCHOOL_PERMISSIONS,
  CLASS_TEACHER_PERMISSIONS,
  EXAM_COORDINATOR_PERMISSIONS,
  STUDENT_PERMISSIONS,
  TEACHER_PERMISSIONS,
} from "@/modules/auth/constants";

const permissionNames = new Map<string, string>(SCHOOL_PERMISSIONS);

const roleDefinitions = {
  [ROLE_CODES.TEACHER]: {
    name: "Teacher",
    description: "Teacher access to assigned academic and student information.",
    permissions: TEACHER_PERMISSIONS,
  },
  [ROLE_CODES.STUDENT]: {
    name: "Student",
    description: "Student self-service access.",
    permissions: STUDENT_PERMISSIONS,
  },
  [ROLE_CODES.CLASS_TEACHER]: {
    name: "Class Teacher",
    description:
      "Teacher access plus submitted-marks verification for assigned classes.",
    permissions: CLASS_TEACHER_PERMISSIONS,
  },
  [ROLE_CODES.EXAM_COORDINATOR]: {
    name: "Exam Coordinator",
    description:
      "Examination setup, verification, approval, results, and paper-generation coordination.",
    permissions: EXAM_COORDINATOR_PERMISSIONS,
  },
} as const;

export async function ensureTenantRole(
  transaction: Prisma.TransactionClient,
  schoolId: string,
  code: keyof typeof roleDefinitions,
) {
  const definition = roleDefinitions[code];
  const role = await transaction.role.upsert({
    where: { identityKey: `${schoolId}:${code}` },
    update: { name: definition.name, description: definition.description },
    create: {
      schoolId,
      identityKey: `${schoolId}:${code}`,
      code,
      name: definition.name,
      description: definition.description,
      scope: RoleScope.SCHOOL,
      isSystem: true,
    },
  });

  for (const permissionCode of definition.permissions) {
    const permission = await transaction.permission.upsert({
      where: { identityKey: `global:${permissionCode}` },
      update: { name: permissionNames.get(permissionCode) ?? permissionCode },
      create: {
        identityKey: `global:${permissionCode}`,
        code: permissionCode,
        name: permissionNames.get(permissionCode) ?? permissionCode,
      },
    });
    await transaction.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: role.id, permissionId: permission.id },
      },
      update: { schoolId },
      create: { schoolId, roleId: role.id, permissionId: permission.id },
    });
  }

  return role;
}

export async function ensureDefaultTenantRoles(
  transaction: Prisma.TransactionClient,
  schoolId: string,
) {
  const roles = [];
  for (const code of [
    ROLE_CODES.TEACHER,
    ROLE_CODES.STUDENT,
    ROLE_CODES.CLASS_TEACHER,
    ROLE_CODES.EXAM_COORDINATOR,
  ] as const)
    roles.push(await ensureTenantRole(transaction, schoolId, code));
  return roles;
}

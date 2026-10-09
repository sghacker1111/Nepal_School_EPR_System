import { ForbiddenError } from "@/lib/errors";

export function assertTenantOwnership(
  sessionSchoolId: string | null,
  resourceSchoolId: string,
) {
  if (!sessionSchoolId || sessionSchoolId !== resourceSchoolId) {
    throw new ForbiddenError();
  }
}

export function hasPermission(
  permissions: ReadonlySet<string>,
  permission: string,
  isSuperAdmin = false,
) {
  return isSuperAdmin || permissions.has(permission);
}

export function assertPermission(
  permissions: ReadonlySet<string>,
  permission: string,
  isSuperAdmin = false,
) {
  if (!hasPermission(permissions, permission, isSuperAdmin)) {
    throw new ForbiddenError();
  }
}

import { normalizeIdentity } from "@/lib/utils";

export function makeTenantIdentityKey(schoolId: string, username: string) {
  return `${schoolId}:${normalizeIdentity(username)}`;
}

export function makePlatformIdentityKey(username: string) {
  return `global:${normalizeIdentity(username)}`;
}

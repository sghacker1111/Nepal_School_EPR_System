import { describe, expect, it } from "vitest";

import { ForbiddenError } from "@/lib/errors";
import { makeTenantIdentityKey } from "@/lib/identity";
import {
  assertPermission,
  assertTenantOwnership,
  hasPermission,
} from "@/modules/auth/authorization";
import { isSchoolLoginAllowed } from "@/modules/auth/school-access";

describe("tenant and authorization boundaries", () => {
  it("rejects a School A session requesting a School B resource", () => {
    expect(() => assertTenantOwnership("school-a", "school-b")).toThrow(
      ForbiddenError,
    );
  });

  it("accepts only an exact authenticated school match", () => {
    expect(() => assertTenantOwnership("school-a", "school-a")).not.toThrow();
    expect(() => assertTenantOwnership(null, "school-a")).toThrow(
      ForbiddenError,
    );
  });

  it("allows the same username in different schools without identity collision", () => {
    expect(makeTenantIdentityKey("school-a", "admin")).not.toBe(
      makeTenantIdentityKey("school-b", "admin"),
    );
    expect(makeTenantIdentityKey("school-a", "Admin")).toBe(
      makeTenantIdentityKey("school-a", "admin"),
    );
  });

  it("denies school login for suspended and archived tenants", () => {
    expect(isSchoolLoginAllowed("ACTIVE")).toBe(true);
    expect(isSchoolLoginAllowed("TRIAL")).toBe(true);
    expect(isSchoolLoginAllowed("SUSPENDED")).toBe(false);
    expect(isSchoolLoginAllowed("ARCHIVED")).toBe(false);
  });

  it("enforces permissions server-side while retaining Super Admin override", () => {
    const permissions = new Set(["dashboard.view"]);
    expect(hasPermission(permissions, "dashboard.view")).toBe(true);
    expect(() =>
      assertPermission(permissions, "school.settings.manage"),
    ).toThrow(ForbiddenError);
    expect(hasPermission(permissions, "school.settings.manage", true)).toBe(
      true,
    );
  });
});

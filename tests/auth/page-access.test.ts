import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

// The cookie-backed session is the external boundary. Exercise the real page.
const access = vi.hoisted(() => ({ failure: new Error("unset") }));
vi.mock("@/modules/auth/session", () => ({
  requireSchoolContext: async () => {
    throw access.failure;
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import SchoolUsersPage from "@/app/(dashboard)/dashboard/users/page";

describe("protected page access feedback", () => {
  beforeEach(() => {
    access.failure = new ForbiddenError();
  });
  it("shows access denied rather than an application crash for missing permission", async () => {
    await expect(
      SchoolUsersPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toMatchObject({
      digest: "NEXT_REDIRECT;replace;/access-denied;307;",
    });
  });
  it("returns an expired session to login", async () => {
    access.failure = new UnauthorizedError();
    await expect(
      SchoolUsersPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toMatchObject({
      digest: "NEXT_REDIRECT;replace;/login;307;",
    });
  });
  it("does not hide unexpected server failures behind an access-denied redirect", async () => {
    access.failure = new Error("Database unavailable");
    await expect(
      SchoolUsersPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toBe(access.failure);
  });
});

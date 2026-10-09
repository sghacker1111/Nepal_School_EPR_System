import type { User } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { normalizeIdentity, normalizeSchoolCode } from "@/lib/utils";
import {
  LOCKOUT_MINUTES,
  MAX_FAILED_LOGIN_ATTEMPTS,
  ROLE_CODES,
  SCHOOL_UNAVAILABLE_MESSAGE,
} from "@/modules/auth/constants";
import { hashPassword, verifyPassword } from "@/modules/auth/password";
import { isSchoolLoginAllowed } from "@/modules/auth/school-access";

export type AuthenticationResult =
  | { ok: true; user: User }
  | {
      ok: false;
      unavailable?: boolean;
      userId?: string;
      schoolId?: string | null;
    };

async function consumeUnknownPassword(password: string) {
  const fallback = await hashPassword("TimingOnly@Password123");
  await verifyPassword(fallback, password);
}

async function recordFailure(user: User) {
  const attempts = user.failedLoginAttempts + 1;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: { increment: 1 },
      lockedUntil:
        attempts >= MAX_FAILED_LOGIN_ATTEMPTS
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1_000)
          : null,
    },
  });
}

async function checkPassword(user: User | null, password: string) {
  if (!user) {
    await consumeUnknownPassword(password);
    return false;
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) return false;
  if (user.status !== "ACTIVE") return false;

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) await recordFailure(user);
  return valid;
}

async function recordSuccess(user: User) {
  return prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });
}

export async function authenticateSchoolAccount(input: {
  schoolCode: string;
  identity: string;
  password: string;
}): Promise<AuthenticationResult> {
  const school = await prisma.school.findUnique({
    where: { code: normalizeSchoolCode(input.schoolCode) },
  });

  if (!school) {
    await consumeUnknownPassword(input.password);
    return { ok: false };
  }

  if (!isSchoolLoginAllowed(school.status)) {
    return { ok: false, unavailable: true, schoolId: school.id };
  }

  const identity = normalizeIdentity(input.identity);
  const user = await prisma.user.findFirst({
    where: {
      schoolId: school.id,
      OR: [{ normalizedUsername: identity }, { normalizedEmail: identity }],
    },
  });

  if (!(await checkPassword(user, input.password)) || !user) {
    return { ok: false, userId: user?.id, schoolId: school.id };
  }

  return { ok: true, user: await recordSuccess(user) };
}

export async function authenticateSuperAdmin(input: {
  identity: string;
  password: string;
}): Promise<AuthenticationResult> {
  const identity = normalizeIdentity(input.identity);
  const user = await prisma.user.findFirst({
    where: {
      schoolId: null,
      OR: [{ normalizedUsername: identity }, { normalizedEmail: identity }],
      roles: {
        some: { role: { code: ROLE_CODES.SUPER_ADMIN, scope: "GLOBAL" } },
      },
    },
  });

  if (!(await checkPassword(user, input.password)) || !user) {
    return { ok: false, userId: user?.id, schoolId: null };
  }

  return { ok: true, user: await recordSuccess(user) };
}

export function authenticationErrorMessage(result: AuthenticationResult) {
  return result.ok
    ? null
    : result.unavailable
      ? SCHOOL_UNAVAILABLE_MESSAGE
      : null;
}

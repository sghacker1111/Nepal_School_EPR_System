import { createHmac, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { getRuntimeEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/modules/auth/authorization";
import { modulePermissions } from "./module-permissions";
import { ROLE_CODES } from "@/modules/auth/constants";
import type { RequestMetadata } from "@/modules/audit/service";

const productionCookie = "__Host-nepal-school-erp-session";
const developmentCookie = "nepal-school-erp-session";

export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? productionCookie : developmentCookie;

function hashToken(token: string) {
  return createHmac("sha256", getRuntimeEnv().AUTH_SECRET)
    .update(token)
    .digest("hex");
}

function sessionExpiry() {
  const { SESSION_TTL_HOURS } = getRuntimeEnv();
  return new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1_000);
}

export type SessionContext = {
  sessionId: string;
  user: {
    id: string;
    schoolId: string | null;
    username: string;
    email: string | null;
    firstName: string;
    middleName: string | null;
    lastName: string;
    mustChangePassword: boolean;
  };
  school: {
    id: string;
    name: string;
    code: string;
    status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  } | null;
  roles: ReadonlySet<string>;
  permissions: ReadonlySet<string>;
  isSuperAdmin: boolean;
};

export async function createSession(
  user: { id: string; schoolId: string | null; sessionVersion: number },
  metadata: RequestMetadata = {},
) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = sessionExpiry();

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId: user.id,
      schoolId: user.schoolId,
      userVersion: user.sessionVersion,
      expiresAt,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
}

async function readSession(): Promise<SessionContext | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const now = new Date();
  const record = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          school: { include: { settings: true } },
          roles: {
            include: {
              role: {
                include: {
                  permissions: { include: { permission: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (
    !record ||
    record.revokedAt ||
    record.expiresAt <= now ||
    record.user.status !== "ACTIVE" ||
    record.userVersion !== record.user.sessionVersion
  ) {
    return null;
  }

  const validRoles = record.user.roles.filter(
    (link) =>
      link.schoolId === record.user.schoolId &&
      link.role.schoolId === record.user.schoolId &&
      (record.user.schoolId
        ? link.role.scope === "SCHOOL" &&
          link.role.code !== ROLE_CODES.SUPER_ADMIN
        : link.role.scope === "GLOBAL"),
  );
  const roleCodes = new Set(validRoles.map(({ role }) => role.code));
  const permissions = new Set(
    validRoles.flatMap(({ role }) =>
      role.permissions.map(({ permission }) => permission.code),
    ),
  );
  const isSuperAdmin = roleCodes.has(ROLE_CODES.SUPER_ADMIN);

  if (!isSuperAdmin) {
    if (!record.user.school || record.schoolId !== record.user.schoolId)
      return null;
    if (!["ACTIVE", "TRIAL"].includes(record.user.school.status)) return null;
  }

  return {
    sessionId: record.id,
    user: {
      id: record.user.id,
      schoolId: record.user.schoolId,
      username: record.user.username,
      email: record.user.email,
      firstName: record.user.firstName,
      middleName: record.user.middleName,
      lastName: record.user.lastName,
      mustChangePassword: record.user.mustChangePassword,
    },
    school: record.user.school
      ? {
          id: record.user.school.id,
          name: record.user.school.name,
          code: record.user.school.code,
          status: record.user.school.status,
        }
      : null,
    roles: roleCodes,
    permissions: modulePermissions(permissions, record.user.school?.settings),
    isSuperAdmin,
  };
}

export const getCurrentSession = cache(readSession);

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function requireAuthenticatedUser(options?: {
  allowPasswordChange?: boolean;
}) {
  const session = await getCurrentSession();
  if (!session) throw new UnauthorizedError();
  if (session.user.mustChangePassword && !options?.allowPasswordChange) {
    redirect("/change-password");
  }
  return session;
}

export async function requireSuperAdmin(options?: {
  allowPasswordChange?: boolean;
}) {
  const session = await requireAuthenticatedUser(options);
  if (!session.isSuperAdmin || session.user.schoolId !== null) {
    throw new ForbiddenError();
  }
  return session;
}

export async function requireSchoolContext(permission?: string) {
  const session = await requireAuthenticatedUser();
  if (session.isSuperAdmin || !session.user.schoolId || !session.school) {
    throw new ForbiddenError();
  }
  if (permission) {
    assertPermission(session.permissions, permission, session.isSuperAdmin);
  }
  return {
    ...session,
    schoolId: session.user.schoolId,
    school: session.school,
  };
}

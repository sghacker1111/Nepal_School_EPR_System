"use server";

import { redirect } from "next/navigation";

import { AuditAction } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  LOGIN_FAILURE_MESSAGE,
  ROLE_CODES,
  SUPER_ADMIN_LOGIN_FAILURE_MESSAGE,
} from "@/modules/auth/constants";
import {
  authenticateSchoolAccount,
  authenticateSuperAdmin,
  authenticationErrorMessage,
} from "@/modules/auth/authentication";
import { hashPassword, verifyPassword } from "@/modules/auth/password";
import { getRequestMetadata } from "@/modules/auth/request-metadata";
import {
  createSession,
  requireAuthenticatedUser,
  revokeCurrentSession,
} from "@/modules/auth/session";
import {
  changePasswordSchema,
  schoolLoginSchema,
  superAdminLoginSchema,
} from "@/modules/auth/validation";
import { writeAudit } from "@/modules/audit/service";

export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function schoolLoginAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = schoolLoginSchema.safeParse({
    schoolCode: formData.get("schoolCode"),
    identity: formData.get("identity"),
    password: formData.get("password"),
    rememberSchool: formData.get("rememberSchool") === "on",
  });
  if (!parsed.success) {
    return { error: LOGIN_FAILURE_MESSAGE };
  }

  const metadata = await getRequestMetadata();
  const result = await authenticateSchoolAccount(parsed.data);
  if (!result.ok) {
    if (result.userId) {
      await writeAudit({
        ...metadata,
        schoolId: result.schoolId,
        userId: result.userId,
        action: AuditAction.LOGIN_FAILED,
        entityType: "User",
        entityId: result.userId,
        description: "School account login failed.",
      }).catch(() => undefined);
    }
    return {
      error: authenticationErrorMessage(result) ?? LOGIN_FAILURE_MESSAGE,
    };
  }

  await createSession(result.user, metadata);
  await writeAudit({
    ...metadata,
    schoolId: result.user.schoolId,
    userId: result.user.id,
    action: AuditAction.LOGIN_SUCCEEDED,
    entityType: "User",
    entityId: result.user.id,
    description: "School account login succeeded.",
  });
  if (result.user.mustChangePassword) redirect("/change-password");
  const roles = await prisma.userRole.findMany({
    where: { userId: result.user.id },
    select: { role: { select: { code: true } } },
  });
  const roleCodes = new Set(roles.map(({ role }) => role.code));
  redirect(
    roleCodes.has(ROLE_CODES.STUDENT)
      ? "/student"
      : roleCodes.has(ROLE_CODES.TEACHER)
        ? "/teacher"
        : "/dashboard",
  );
}

export async function superAdminLoginAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = superAdminLoginSchema.safeParse({
    identity: formData.get("identity"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: SUPER_ADMIN_LOGIN_FAILURE_MESSAGE };

  const metadata = await getRequestMetadata();
  const result = await authenticateSuperAdmin(parsed.data);
  if (!result.ok) {
    if (result.userId) {
      await writeAudit({
        ...metadata,
        userId: result.userId,
        action: AuditAction.LOGIN_FAILED,
        entityType: "User",
        entityId: result.userId,
        description: "Super Admin login failed.",
      }).catch(() => undefined);
    }
    return { error: SUPER_ADMIN_LOGIN_FAILURE_MESSAGE };
  }

  await createSession(result.user, metadata);
  await writeAudit({
    ...metadata,
    userId: result.user.id,
    action: AuditAction.LOGIN_SUCCEEDED,
    entityType: "User",
    entityId: result.user.id,
    description: "Super Admin login succeeded.",
  });
  redirect(
    result.user.mustChangePassword ? "/change-password" : "/super-admin",
  );
}

export async function changePasswordAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const session = await requireAuthenticatedUser({ allowPasswordChange: true });
  const parsed = changePasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      error: "Please meet every password requirement.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "Your session is no longer valid." };
  if (await verifyPassword(user.passwordHash, parsed.data.newPassword)) {
    return {
      error: "Choose a password different from your temporary password.",
    };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  const updated = await prisma.$transaction(async (transaction) => {
    const changed = await transaction.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        sessionVersion: { increment: 1 },
      },
    });
    await transaction.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await transaction.auditLog.create({
      data: {
        schoolId: user.schoolId,
        userId: user.id,
        action: AuditAction.PASSWORD_CHANGED,
        entityType: "User",
        entityId: user.id,
        description: "User replaced a temporary password.",
      },
    });
    return changed;
  });

  await createSession(updated, await getRequestMetadata());
  redirect(
    session.isSuperAdmin
      ? "/super-admin"
      : session.roles.has(ROLE_CODES.STUDENT)
        ? "/student"
        : session.roles.has(ROLE_CODES.TEACHER)
          ? "/teacher"
          : "/dashboard",
  );
}

export async function logoutAction() {
  const session = await requireAuthenticatedUser({
    allowPasswordChange: true,
  }).catch(() => null);
  await revokeCurrentSession();
  if (session) {
    await writeAudit({
      schoolId: session.user.schoolId,
      userId: session.user.id,
      action: AuditAction.LOGOUT,
      entityType: "User",
      entityId: session.user.id,
      description: "User signed out.",
    }).catch(() => undefined);
  }
  redirect(session?.isSuperAdmin ? "/super-admin/login" : "/login");
}

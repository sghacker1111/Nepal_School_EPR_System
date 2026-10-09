import { Prisma } from "@/generated/prisma/client";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { makeTenantIdentityKey } from "@/lib/identity";
import { prisma } from "@/lib/prisma";
import { normalizeIdentity } from "@/lib/utils";
import type { RequestMetadata } from "@/modules/audit/service";
import { hashPassword } from "@/modules/auth/password";
import { ensureTenantRole } from "@/modules/auth/rbac-service";
import type { ManagedUserInput } from "./validation";

export async function saveManagedUser(
  input: ManagedUserInput,
  actor: {
    schoolId: string;
    userId: string;
    metadata: RequestMetadata;
    isSchoolAdmin: boolean;
  },
) {
  if (!actor.isSchoolAdmin)
    throw new ForbiddenError(
      "Only a school administrator can change login access.",
    );
  if (input.id === actor.userId)
    throw new ValidationError(
      "Use Security to change your password. Another administrator must change your role or access.",
    );
  const passwordHash = input.temporaryPassword
    ? await hashPassword(input.temporaryPassword)
    : undefined;
  try {
    return await prisma.$transaction(async (tx) => {
      // Serializes access changes, including the last-active-administrator check.
      await tx.$queryRaw`SELECT id FROM "School" WHERE id = ${actor.schoolId} FOR UPDATE`;
      const existing = input.id
        ? await tx.user.findFirst({
            where: { id: input.id, schoolId: actor.schoolId },
            include: {
              teacher: true,
              student: true,
              roles: { include: { role: true } },
            },
          })
        : null;
      if (input.id && !existing)
        throw new NotFoundError("School user not found.");
      if (
        (input.role === "TEACHER" || input.role === "CLASS_TEACHER") &&
        !existing?.teacher
      )
        throw new ValidationError(
          "Create teacher logins from Teachers so the login is linked to a teacher profile.",
        );
      if (input.role === "STUDENT" && !existing?.student)
        throw new ValidationError(
          "Create student logins from Students so the login is linked to a student profile.",
        );
      if (existing?.student && input.role !== "STUDENT")
        throw new ValidationError(
          "A student login cannot be converted to staff access.",
        );
      if (
        input.status === "ACTIVE" &&
        ((existing?.teacher && existing.teacher.status !== "ACTIVE") ||
          (existing?.student && existing.student.status !== "ACTIVE"))
      )
        throw new ValidationError(
          "Restore the linked teacher or student profile before enabling its login.",
        );
      if (
        existing?.roles.some((link) => link.role.code === "SCHOOL_ADMIN") &&
        (input.role !== "SCHOOL_ADMIN" || input.status !== "ACTIVE")
      ) {
        const others = await tx.user.count({
          where: {
            schoolId: actor.schoolId,
            id: { not: existing.id },
            status: "ACTIVE",
            roles: {
              some: {
                role: { schoolId: actor.schoolId, code: "SCHOOL_ADMIN" },
              },
            },
          },
        });
        if (!others)
          throw new ValidationError(
            "Keep at least one active school administrator.",
          );
      }
      const role =
        input.role === "SCHOOL_ADMIN"
          ? await tx.role.findFirst({
              where: {
                schoolId: actor.schoolId,
                code: "SCHOOL_ADMIN",
                scope: "SCHOOL",
              },
            })
          : await ensureTenantRole(tx, actor.schoolId, input.role);
      if (!role)
        throw new ValidationError(
          "The school administrator role is not configured.",
        );
      const username = normalizeIdentity(input.username);
      const email = input.email ? normalizeIdentity(input.email) : null;
      const collision = await tx.user.findFirst({
        where: {
          schoolId: actor.schoolId,
          ...(existing ? { id: { not: existing.id } } : {}),
          OR: [
            { normalizedUsername: username },
            { normalizedEmail: username },
            ...(email
              ? [{ normalizedUsername: email }, { normalizedEmail: email }]
              : []),
          ],
        },
        select: { id: true },
      });
      if (collision)
        throw new ConflictError(
          "That username or email is already used by a school account.",
        );
      const data = {
        firstName: input.firstName,
        lastName: input.lastName,
        username: input.username,
        normalizedUsername: username,
        identityKey: makeTenantIdentityKey(actor.schoolId, username),
        email,
        normalizedEmail: email,
        status: input.status,
        ...(passwordHash ? { passwordHash, mustChangePassword: true } : {}),
      };
      const user = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: {
              ...data,
              sessionVersion: { increment: 1 },
              failedLoginAttempts: 0,
              lockedUntil: null,
            },
          })
        : await tx.user.create({
            data: {
              ...data,
              schoolId: actor.schoolId,
              passwordHash: passwordHash!,
              mustChangePassword: true,
              createdById: actor.userId,
            },
          });
      await tx.userRole.deleteMany({
        where: { userId: user.id, schoolId: actor.schoolId },
      });
      await tx.userRole.create({
        data: {
          schoolId: actor.schoolId,
          userId: user.id,
          roleId: role.id,
          assignedBy: actor.userId,
        },
      });
      if (
        existing?.teacher &&
        ["TEACHER", "CLASS_TEACHER"].includes(input.role)
      ) {
        const teacherRole = await ensureTenantRole(
          tx,
          actor.schoolId,
          "TEACHER",
        );
        await tx.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId: teacherRole.id } },
          update: {},
          create: {
            schoolId: actor.schoolId,
            userId: user.id,
            roleId: teacherRole.id,
          },
        });
        const assigned = await tx.teacherAssignment.count({
          where: {
            schoolId: actor.schoolId,
            teacherId: existing.teacher.id,
            status: "ACTIVE",
            isClassTeacher: true,
          },
        });
        if (input.role === "CLASS_TEACHER" && !assigned)
          throw new ValidationError(
            "Assign this teacher as a class teacher in Teacher Assignments first.",
          );
        if (assigned) {
          const classRole = await ensureTenantRole(
            tx,
            actor.schoolId,
            "CLASS_TEACHER",
          );
          await tx.userRole.upsert({
            where: { userId_roleId: { userId: user.id, roleId: classRole.id } },
            update: {},
            create: {
              schoolId: actor.schoolId,
              userId: user.id,
              roleId: classRole.id,
            },
          });
        }
      }
      await tx.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          schoolId: actor.schoolId,
          userId: actor.userId,
          action: existing ? "USER_UPDATED" : "USER_CREATED",
          entityType: "User",
          entityId: user.id,
          description: `${existing ? "Updated" : "Created"} school login ${user.username}.`,
          newValue: {
            status: input.status,
            role: input.role,
            passwordReset: Boolean(passwordHash),
          },
          ...actor.metadata,
        },
      });
      return { id: user.id };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new ConflictError("That username or email is already in use.");
    throw error;
  }
}

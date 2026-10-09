import { AuditAction } from "@/generated/prisma/client";

import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { RequestMetadata } from "@/modules/audit/service";
import { ROLE_CODES } from "@/modules/auth/constants";
import type { NotificationInput } from "@/modules/notifications/validation";

type NotificationActor = {
  schoolId: string;
  userId: string;
  metadata: RequestMetadata;
};

export async function createSchoolNotification(
  input: NotificationInput,
  actor: NotificationActor,
) {
  return prisma.$transaction(async (tx) => {
    let recipientIds: string[] = [];
    if (input.target !== "ALL") {
      const targetRole =
        input.target === "STUDENTS"
          ? ROLE_CODES.STUDENT
          : input.target === "TEACHERS"
            ? ROLE_CODES.TEACHER
            : ROLE_CODES.SCHOOL_ADMIN;
      const recipients = await tx.user.findMany({
        where: {
          schoolId: actor.schoolId,
          status: "ACTIVE",
          roles: {
            some: {
              schoolId: actor.schoolId,
              role: {
                schoolId: actor.schoolId,
                code: {
                  in:
                    input.target === "TEACHERS"
                      ? [
                          ROLE_CODES.TEACHER,
                          ROLE_CODES.CLASS_TEACHER,
                          ROLE_CODES.EXAM_COORDINATOR,
                        ]
                      : [targetRole],
                },
              },
            },
          },
        },
        select: { id: true },
      });
      recipientIds = recipients.map((user) => user.id);
      if (!recipientIds.length)
        throw new ValidationError(
          "No active login accounts match this recipient group.",
        );
    }
    const data = {
      schoolId: actor.schoolId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link || null,
      expiresAt: input.expiresAt ?? null,
      createdById: actor.userId,
    };
    if (input.target === "ALL") await tx.notification.create({ data });
    else if (recipientIds.length)
      await tx.notification.createMany({
        data: recipientIds.map((userId) => ({ ...data, userId })),
      });
    await tx.auditLog.create({
      data: {
        schoolId: actor.schoolId,
        userId: actor.userId,
        action: AuditAction.NOTIFICATION_CREATED,
        entityType: "Notification",
        description: `Created ${input.target.toLowerCase()} notification: ${input.title}.`,
        newValue: {
          target: input.target,
          recipients:
            input.target === "ALL" ? "broadcast" : recipientIds.length,
          type: input.type,
        },
        ...actor.metadata,
      },
    });
    return input.target === "ALL" ? 1 : recipientIds.length;
  });
}

export async function markNotificationRead(
  notificationId: string,
  actor: NotificationActor,
) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      schoolId: actor.schoolId,
      OR: [{ userId: actor.userId }, { userId: null }],
    },
  });
  if (!notification) throw new NotFoundError("Notification not found.");
  await prisma.$transaction(async (tx) => {
    if (notification.userId) {
      if (notification.userId !== actor.userId) throw new ForbiddenError();
      await tx.notification.update({
        where: { id: notification.id },
        data: { readAt: notification.readAt ?? new Date() },
      });
    } else {
      await tx.notificationReceipt.upsert({
        where: {
          notificationId_userId: {
            notificationId: notification.id,
            userId: actor.userId,
          },
        },
        update: { readAt: new Date() },
        create: {
          schoolId: actor.schoolId,
          notificationId: notification.id,
          userId: actor.userId,
        },
      });
    }
    await tx.auditLog.create({
      data: {
        schoolId: actor.schoolId,
        userId: actor.userId,
        action: AuditAction.NOTIFICATION_READ,
        entityType: "Notification",
        entityId: notification.id,
        description: "Marked a notification as read.",
        ...actor.metadata,
      },
    });
  });
}

export async function getUserNotifications(
  schoolId: string,
  userId: string,
  take = 50,
) {
  const now = new Date();
  const notifications = await prisma.notification.findMany({
    where: {
      schoolId,
      OR: [{ userId }, { userId: null }],
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
    },
    include: { receipts: { where: { userId }, select: { readAt: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });
  return notifications.map((notification) => ({
    ...notification,
    isRead: notification.userId
      ? Boolean(notification.readAt)
      : notification.receipts.length > 0,
  }));
}

import type { AuditAction, Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export type RequestMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

type AuditInput = RequestMetadata & {
  schoolId?: string | null;
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  description: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
};

export function writeAudit(input: AuditInput) {
  return prisma.auditLog.create({
    data: {
      schoolId: input.schoolId,
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      description: input.description,
      oldValue: input.oldValue,
      newValue: input.newValue,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
}

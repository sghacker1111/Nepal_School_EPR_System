"use server";

import { revalidatePath } from "next/cache";

import { toPublicMessage } from "@/lib/errors";
import { getRequestMetadata } from "@/modules/auth/request-metadata";
import { requireSchoolContext } from "@/modules/auth/session";
import {
  createSchoolNotification,
  markNotificationRead,
} from "@/modules/notifications/service";
import { notificationSchema } from "@/modules/notifications/validation";

export type NotificationActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
};
const value = (data: FormData, key: string) => {
  const found = data.get(key);
  return found === "" || found === null ? undefined : found;
};

export async function createNotificationAction(
  _previous: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  const parsed = notificationSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    body: formData.get("body"),
    link: value(formData, "link"),
    target: formData.get("target"),
    expiresAt: value(formData, "expiresAt"),
  });
  if (!parsed.success)
    return {
      error: "Please correct the notification details.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  try {
    const session = await requireSchoolContext("notification.manage");
    const count = await createSchoolNotification(parsed.data, {
      schoolId: session.schoolId,
      userId: session.user.id,
      metadata: await getRequestMetadata(),
    });
    revalidatePath("/dashboard/notifications");
    revalidatePath("/teacher");
    revalidatePath("/student");
    return {
      success: `Notification created for ${count === 1 && parsed.data.target === "ALL" ? "the school" : `${count} recipients`}.`,
    };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}

export async function markNotificationReadAction(notificationId: string) {
  const session = await requireSchoolContext("notification.view");
  await markNotificationRead(notificationId, {
    schoolId: session.schoolId,
    userId: session.user.id,
    metadata: await getRequestMetadata(),
  });
  revalidatePath("/dashboard/notifications");
  revalidatePath("/teacher");
  revalidatePath("/student");
}

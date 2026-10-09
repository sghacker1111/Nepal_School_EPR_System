"use server";

import { revalidatePath } from "next/cache";

import { AuditAction } from "@/generated/prisma/client";
import { toPublicMessage } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { generateStrongPassword } from "@/modules/auth/password-policy";
import { getRequestMetadata } from "@/modules/auth/request-metadata";
import {
  requireSchoolContext,
  requireSuperAdmin,
} from "@/modules/auth/session";
import {
  changeSchoolStatus,
  createSchoolWithAdministrator,
  resetSchoolAdministratorPassword,
  updateSchoolProfile,
} from "@/modules/schools/service";
import {
  createSchoolSchema,
  resetSchoolAdminPasswordSchema,
  schoolStatusSchema,
  updateSchoolSettingsSchema,
  updateSchoolProfileSchema,
} from "@/modules/schools/validation";

export type CredentialResult = {
  schoolId: string;
  schoolName?: string;
  schoolCode?: string;
  adminUsername: string;
  temporaryPassword: string;
};

export type SchoolActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  credentials?: CredentialResult;
};

function formBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export async function createSchoolAction(
  _previous: SchoolActionState,
  formData: FormData,
): Promise<SchoolActionState> {
  const session = await requireSuperAdmin();
  const raw = Object.fromEntries(formData.entries());
  const parsed = createSchoolSchema.safeParse({
    ...raw,
    establishmentYear: raw.establishmentYear || undefined,
    attendanceEnabled: formBoolean(formData, "attendanceEnabled"),
    examinationEnabled: formBoolean(formData, "examinationEnabled"),
    questionBankEnabled: formBoolean(formData, "questionBankEnabled"),
  });

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted school and administrator details.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const credentials = await createSchoolWithAdministrator(
      parsed.data,
      session.user.id,
      await getRequestMetadata(),
    );
    revalidatePath("/super-admin");
    revalidatePath("/super-admin/schools");
    return { credentials };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}

export async function setSchoolStatusAction(formData: FormData) {
  const session = await requireSuperAdmin();
  const parsed = schoolStatusSchema.safeParse({
    schoolId: formData.get("schoolId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  await changeSchoolStatus(
    parsed.data.schoolId,
    parsed.data.status,
    session.user.id,
    await getRequestMetadata(),
  );
  revalidatePath("/super-admin");
  revalidatePath("/super-admin/schools");
  revalidatePath(`/super-admin/schools/${parsed.data.schoolId}`);
}

export async function resetSchoolAdminPasswordAction(
  _previous: SchoolActionState,
  formData: FormData,
): Promise<SchoolActionState> {
  const session = await requireSuperAdmin();
  const generated =
    formData.get("temporaryPassword") || generateStrongPassword();
  const parsed = resetSchoolAdminPasswordSchema.safeParse({
    schoolId: formData.get("schoolId"),
    userId: formData.get("userId"),
    temporaryPassword: generated,
    confirmPassword: formData.get("confirmPassword") || generated,
  });
  if (!parsed.success) {
    return {
      error: "The temporary password does not meet the security requirements.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const credentials = await resetSchoolAdministratorPassword({
      ...parsed.data,
      actorUserId: session.user.id,
      metadata: await getRequestMetadata(),
    });
    revalidatePath(`/super-admin/schools/${parsed.data.schoolId}`);
    return { credentials };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}

export type SettingsActionState = { error?: string; success?: string };

export async function updateSchoolSettingsAction(
  _previous: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const session = await requireSchoolContext("school.settings.manage");
  const parsed = updateSchoolSettingsSchema.safeParse({
    calendarPreference: formData.get("calendarPreference"),
    defaultAcademicYear: formData.get("defaultAcademicYear"),
    defaultLanguage: formData.get("defaultLanguage"),
    attendanceEnabled: formBoolean(formData, "attendanceEnabled"),
    examinationEnabled: formBoolean(formData, "examinationEnabled"),
    questionBankEnabled: formBoolean(formData, "questionBankEnabled"),
  });
  if (!parsed.success)
    return { error: "Please check the settings and try again." };

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.schoolSetting.update({
        where: { schoolId: session.schoolId },
        data: {
          ...parsed.data,
          defaultAcademicYear: parsed.data.defaultAcademicYear || null,
        },
      });
      await transaction.auditLog.create({
        data: {
          schoolId: session.schoolId,
          userId: session.user.id,
          action: AuditAction.SCHOOL_UPDATED,
          entityType: "SchoolSetting",
          entityId: session.schoolId,
          description: "School system defaults were updated.",
          newValue: parsed.data,
        },
      });
    });
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/settings");
    return { success: "School settings saved." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}

export async function updateSchoolProfileAction(
  _previous: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const session = await requireSuperAdmin();
  const raw = Object.fromEntries(formData.entries());
  const parsed = updateSchoolProfileSchema.safeParse({
    ...raw,
    establishmentYear: raw.establishmentYear || undefined,
  });
  if (!parsed.success)
    return { error: "Please correct the school profile details." };
  try {
    await updateSchoolProfile(
      parsed.data,
      session.user.id,
      await getRequestMetadata(),
    );
    revalidatePath("/super-admin/schools");
    revalidatePath(`/super-admin/schools/${parsed.data.schoolId}`);
    return { success: "School profile updated." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}

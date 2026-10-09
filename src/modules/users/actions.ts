"use server";
import { revalidatePath } from "next/cache";
import { toPublicMessage } from "@/lib/errors";
import { requireSchoolContext } from "@/modules/auth/session";
import { getRequestMetadata } from "@/modules/auth/request-metadata";
import { saveManagedUser } from "./service";
import { managedUserSchema } from "./validation";

export type UserActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
};
export async function saveManagedUserAction(
  _: UserActionState,
  form: FormData,
): Promise<UserActionState> {
  const session = await requireSchoolContext("user.manage");
  const parsed = managedUserSchema.safeParse({
    ...Object.fromEntries(form),
    id: form.get("id") || undefined,
    temporaryPassword: form.get("temporaryPassword") || undefined,
  });
  if (!parsed.success)
    return {
      error: "Check the fields below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  try {
    await saveManagedUser(parsed.data, {
      schoolId: session.schoolId,
      userId: session.user.id,
      isSchoolAdmin: session.roles.has("SCHOOL_ADMIN"),
      metadata: await getRequestMetadata(),
    });
    revalidatePath("/dashboard/users");
    return {
      success:
        "Account saved. Existing sessions were signed out; a new temporary password must be changed at next login.",
    };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}

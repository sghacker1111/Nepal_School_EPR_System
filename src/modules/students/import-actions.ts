"use server";
import { revalidatePath } from "next/cache";
import { toPublicMessage } from "@/lib/errors";
import { getRequestMetadata } from "@/modules/auth/request-metadata";
import { requireSchoolContext } from "@/modules/auth/session";
import { confirmStudentImport } from "@/modules/students/import";
import type { StudentActionState } from "@/modules/students/actions";
export async function confirmStudentImportAction(
  _previous: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const batchId = formData.get("batchId");
  if (typeof batchId !== "string") return { error: "Import batch is missing." };
  try {
    const session = await requireSchoolContext("student.import");
    const result = await confirmStudentImport(batchId, {
      schoolId: session.schoolId,
      userId: session.user.id,
      metadata: await getRequestMetadata(),
    });
    revalidatePath("/dashboard/students");
    revalidatePath("/dashboard");
    return {
      success: `Imported ${result.imported} students. ${result.duplicates} duplicates and ${result.errors} invalid rows were skipped.`,
    };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}

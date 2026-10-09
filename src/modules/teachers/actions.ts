"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toPublicMessage } from "@/lib/errors";
import { getRequestMetadata } from "@/modules/auth/request-metadata";
import { requireSchoolContext } from "@/modules/auth/session";
import {
  archiveTeacher,
  saveTeacher,
  saveTeacherAssignment,
} from "@/modules/teachers/service";
import {
  teacherAssignmentSchema,
  teacherSchema,
} from "@/modules/teachers/validation";
export type TeacherActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
};
const value = (formData: FormData, key: string) => {
  const found = formData.get(key);
  return found === "" || found === null ? undefined : found;
};
async function actor(permission: string) {
  const session = await requireSchoolContext(permission);
  return {
    schoolId: session.schoolId,
    userId: session.user.id,
    metadata: await getRequestMetadata(),
  };
}
export async function saveTeacherAction(
  _previous: TeacherActionState,
  formData: FormData,
): Promise<TeacherActionState> {
  const parsed = teacherSchema.safeParse({
    id: value(formData, "id"),
    teacherCode: formData.get("teacherCode"),
    firstName: formData.get("firstName"),
    middleName: value(formData, "middleName"),
    lastName: formData.get("lastName"),
    nameInNepali: value(formData, "nameInNepali"),
    gender: formData.get("gender"),
    dateOfBirth: value(formData, "dateOfBirth"),
    mobile: formData.get("mobile"),
    email: value(formData, "email"),
    address: value(formData, "address"),
    qualification: value(formData, "qualification"),
    specialization: value(formData, "specialization"),
    joiningDate: formData.get("joiningDate"),
    employmentType: formData.get("employmentType"),
    status: formData.get("status"),
    citizenshipNumber: value(formData, "citizenshipNumber"),
    citizenshipIssueAt: value(formData, "citizenshipIssueAt"),
    createLogin: formData.get("createLogin") === "on",
    username: value(formData, "username"),
    loginEmail: value(formData, "loginEmail"),
    temporaryPassword: value(formData, "temporaryPassword"),
    confirmPassword: value(formData, "confirmPassword"),
  });
  if (!parsed.success)
    return {
      error: "Please correct the highlighted information.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  try {
    const editing = Boolean(parsed.data.id);
    await saveTeacher(
      parsed.data,
      await actor(editing ? "teacher.edit" : "teacher.create"),
    );
    revalidatePath("/dashboard/teachers");
    return { success: "Teacher saved successfully." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}
export async function archiveTeacherAction(formData: FormData) {
  const id = formData.get("teacherId");
  if (typeof id !== "string") return;
  await archiveTeacher(id, await actor("teacher.archive"));
  revalidatePath("/dashboard/teachers");
  redirect("/dashboard/teachers");
}
export async function saveTeacherAssignmentAction(
  _previous: TeacherActionState,
  formData: FormData,
): Promise<TeacherActionState> {
  const parsed = teacherAssignmentSchema.safeParse({
    id: value(formData, "id"),
    academicYearId: formData.get("academicYearId"),
    teacherId: formData.get("teacherId"),
    classId: formData.get("classId"),
    sectionId: value(formData, "sectionId"),
    subjectId: formData.get("subjectId"),
    isClassTeacher: formData.get("isClassTeacher") === "on",
    status: formData.get("status"),
  });
  if (!parsed.success)
    return {
      error: "Please correct the assignment.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  try {
    await saveTeacherAssignment(parsed.data, await actor("teacher.assign"));
    revalidatePath("/dashboard/teacher-assignments");
    return { success: "Teacher assignment saved." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}

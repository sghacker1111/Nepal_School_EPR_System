"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { StudentStatus } from "@/generated/prisma/client";
import { toPublicMessage } from "@/lib/errors";
import { getRequestMetadata } from "@/modules/auth/request-metadata";
import { requireSchoolContext } from "@/modules/auth/session";
import {
  changeStudentStatus,
  findPotentialStudentDuplicates,
  hideFromCurrentClass,
  saveEnrollment,
  saveStudent,
  saveOptionalSubjects,
} from "@/modules/students/service";
import { enrollmentSchema, studentSchema } from "@/modules/students/validation";
import type { DuplicateMatch } from "@/modules/students/duplicates";
export type StudentActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
  duplicates?: DuplicateMatch[];
  studentId?: string;
};
const value = (data: FormData, key: string) => {
  const found = data.get(key);
  return found === "" || found === null ? undefined : found;
};
const checkbox = (data: FormData, key: string) => data.get(key) === "on";
async function actor(permission: string) {
  const session = await requireSchoolContext(permission);
  return {
    session,
    actor: {
      schoolId: session.schoolId,
      userId: session.user.id,
      metadata: await getRequestMetadata(),
    },
  };
}
function studentPayload(formData: FormData) {
  const keys = [
    "id",
    "studentId",
    "admissionNumber",
    "iemisId",
    "firstName",
    "middleName",
    "lastName",
    "nameInNepali",
    "gender",
    "dateOfBirthBs",
    "dateOfBirthAd",
    "bloodGroup",
    "nationality",
    "motherTongue",
    "religion",
    "birthRegistrationNumber",
    "citizenshipNumber",
    "mobile",
    "email",
    "permanentProvince",
    "permanentDistrict",
    "permanentLocalLevel",
    "permanentWard",
    "permanentTole",
    "permanentAddress",
    "temporaryProvince",
    "temporaryDistrict",
    "temporaryLocalLevel",
    "temporaryWard",
    "temporaryTole",
    "temporaryAddress",
    "admissionDate",
    "admissionAcademicYearId",
    "admissionClassId",
    "previousSchool",
    "previousClass",
    "previousSchoolIemisCode",
    "registrationNumber",
    "scholarshipCategory",
    "ethnicityCategory",
    "disabilityType",
    "economicStatus",
    "medicalNotes",
    "allergies",
    "academicYearId",
    "classId",
    "sectionId",
    "rollNumber",
    "enrollmentDate",
    "fatherName",
    "fatherOccupation",
    "fatherEducation",
    "fatherMobile",
    "motherName",
    "motherOccupation",
    "motherEducation",
    "motherMobile",
    "guardianName",
    "guardianRelationship",
    "guardianMobile",
    "guardianEmail",
    "emergencyContact",
    "username",
    "loginEmail",
    "temporaryPassword",
    "confirmPassword",
    "status",
  ] as const;
  const payload: Record<string, unknown> = {};
  for (const key of keys) payload[key] = value(formData, key);
  for (const key of [
    "duplicateOverride",
    "temporarySameAsPermanent",
    "scholarshipStatus",
    "transportationRequired",
    "hostelStatus",
    "disabilityStatus",
    "createLogin",
  ] as const)
    payload[key] = checkbox(formData, key);
  return payload;
}
export async function saveStudentAction(
  _previous: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const parsed = studentSchema.safeParse(studentPayload(formData));
  if (!parsed.success)
    return {
      error: "Please correct the highlighted student information.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  try {
    const editing = Boolean(parsed.data.id);
    const context = await actor(editing ? "student.edit" : "student.create");
    if (!editing) {
      const duplicates = await findPotentialStudentDuplicates(
        context.session.schoolId,
        parsed.data,
      );
      if (duplicates.length && !parsed.data.duplicateOverride)
        return {
          error:
            "Possible duplicate student found. Review the matches before continuing.",
          duplicates,
        };
      if (duplicates.length && parsed.data.duplicateOverride)
        await requireSchoolContext("student.duplicate.override");
    }
    const student = await saveStudent(parsed.data, context.actor);
    revalidatePath("/dashboard/students");
    revalidatePath("/dashboard");
    return { success: "Student saved successfully.", studentId: student.id };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}
const statusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "TRANSFERRED",
  "GRADUATED",
  "DROPPED",
  "ARCHIVED",
]);
export async function changeStudentStatusAction(formData: FormData) {
  const id = z.string().cuid().safeParse(formData.get("studentId"));
  const status = statusSchema.safeParse(formData.get("status"));
  if (!id.success || !status.success) return;
  const permission =
    status.data === "ACTIVE" ? "student.restore" : "student.archive";
  const context = await actor(permission);
  await changeStudentStatus(
    id.data,
    status.data as StudentStatus,
    context.actor,
  );
  revalidatePath("/dashboard/students");
  revalidatePath(`/dashboard/students/${id.data}`);
  redirect(
    status.data === "ARCHIVED"
      ? "/dashboard/students?status=ARCHIVED"
      : `/dashboard/students/${id.data}`,
  );
}
export async function hideFromCurrentClassAction(formData: FormData) {
  const id = z.string().cuid().safeParse(formData.get("studentId"));
  if (!id.success) return;
  const context = await actor("student.enroll");
  await hideFromCurrentClass(id.data, context.actor);
  revalidatePath(`/dashboard/students/${id.data}`);
}
export async function saveEnrollmentAction(
  _previous: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const parsed = enrollmentSchema.safeParse({
    studentId: formData.get("studentId"),
    academicYearId: formData.get("academicYearId"),
    classId: formData.get("classId"),
    sectionId: formData.get("sectionId"),
    rollNumber: value(formData, "rollNumber"),
    enrollmentDate: formData.get("enrollmentDate"),
    status: formData.get("status"),
    remarks: value(formData, "remarks"),
  });
  if (!parsed.success)
    return {
      error: "Please correct the enrollment information.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  try {
    const context = await actor("student.enroll");
    await saveEnrollment(parsed.data, context.actor);
    revalidatePath(`/dashboard/students/${parsed.data.studentId}`);
    return { success: "Enrollment history saved." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}
export async function saveOptionalSubjectsAction(
  _previous: StudentActionState,
  form: FormData,
): Promise<StudentActionState> {
  const parsed = z
    .object({
      enrollmentId: z.string().cuid(),
      subjectIds: z.array(z.string().cuid()).max(30),
    })
    .safeParse({
      enrollmentId: form.get("enrollmentId"),
      subjectIds: form.getAll("subjectId"),
    });
  if (!parsed.success) return { error: "Invalid subject choices." };
  try {
    const { actor: context } = await actor("student.enroll");
    const result = await saveOptionalSubjects(
      parsed.data.enrollmentId,
      parsed.data.subjectIds,
      context,
    );
    revalidatePath("/dashboard/students/" + result.studentId);
    revalidatePath("/dashboard/exams/marks");
    return { success: "Subject choices saved." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}

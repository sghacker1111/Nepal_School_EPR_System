"use server";

import { revalidatePath } from "next/cache";

import { toPublicMessage } from "@/lib/errors";
import {
  saveAcademicYear,
  saveClass,
  saveClassSubject,
  saveSection,
  saveSubject,
} from "@/modules/academic/service";
import {
  academicYearSchema,
  classSchema,
  classSubjectSchema,
  sectionSchema,
  subjectSchema,
} from "@/modules/academic/validation";
import { getRequestMetadata } from "@/modules/auth/request-metadata";
import { requireSchoolContext } from "@/modules/auth/session";

export type ResourceActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
};

function value(formData: FormData, key: string) {
  const found = formData.get(key);
  return found === "" || found === null ? undefined : found;
}

async function actor() {
  const session = await requireSchoolContext("academic.manage");
  return {
    schoolId: session.schoolId,
    userId: session.user.id,
    metadata: await getRequestMetadata(),
  };
}

function invalid(error: {
  flatten(): { fieldErrors: Record<string, string[]> };
}): ResourceActionState {
  return {
    error: "Please correct the highlighted information.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

export async function saveAcademicYearAction(
  _previous: ResourceActionState,
  formData: FormData,
): Promise<ResourceActionState> {
  const parsed = academicYearSchema.safeParse({
    id: value(formData, "id"),
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    isCurrent: formData.get("isCurrent") === "on",
    status: formData.get("status"),
  });
  if (!parsed.success) return invalid(parsed.error);
  try {
    await saveAcademicYear(parsed.data, await actor());
    revalidatePath("/dashboard/academic-years");
    revalidatePath("/dashboard");
    return { success: "Academic year saved." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}

export async function saveClassAction(
  _previous: ResourceActionState,
  formData: FormData,
): Promise<ResourceActionState> {
  const parsed = classSchema.safeParse({
    id: value(formData, "id"),
    name: formData.get("name"),
    numericLevel: value(formData, "numericLevel"),
    displayOrder: formData.get("displayOrder"),
    status: formData.get("status"),
  });
  if (!parsed.success) return invalid(parsed.error);
  try {
    await saveClass(parsed.data, await actor());
    revalidatePath("/dashboard/classes");
    return { success: "Class saved." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}

export async function saveSectionAction(
  _previous: ResourceActionState,
  formData: FormData,
): Promise<ResourceActionState> {
  const parsed = sectionSchema.safeParse({
    id: value(formData, "id"),
    classId: formData.get("classId"),
    name: formData.get("name"),
    capacity: value(formData, "capacity"),
    status: formData.get("status"),
  });
  if (!parsed.success) return invalid(parsed.error);
  try {
    await saveSection(parsed.data, await actor());
    revalidatePath("/dashboard/sections");
    return { success: "Section saved." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}

export async function saveSubjectAction(
  _previous: ResourceActionState,
  formData: FormData,
): Promise<ResourceActionState> {
  const parsed = subjectSchema.safeParse({
    id: value(formData, "id"),
    name: formData.get("name"),
    code: formData.get("code"),
    shortName: value(formData, "shortName"),
    subjectType: formData.get("subjectType"),
    theoryFullMarks: formData.get("theoryFullMarks"),
    practicalFullMarks: formData.get("practicalFullMarks"),
    internalFullMarks: value(formData, "internalFullMarks"),
    passMarks: value(formData, "passMarks"),
    status: formData.get("status"),
  });
  if (!parsed.success) return invalid(parsed.error);
  try {
    await saveSubject(parsed.data, await actor());
    revalidatePath("/dashboard/subjects");
    return { success: "Subject saved." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}

export async function saveClassSubjectAction(
  _previous: ResourceActionState,
  formData: FormData,
): Promise<ResourceActionState> {
  const parsed = classSubjectSchema.safeParse({
    isOptional: formData.get("isOptional") === "on",
    id: value(formData, "id"),
    academicYearId: formData.get("academicYearId"),
    classId: formData.get("classId"),
    subjectId: formData.get("subjectId"),
    fullMarks: formData.get("fullMarks"),
    theoryMarks: formData.get("theoryMarks"),
    practicalMarks: formData.get("practicalMarks"),
    internalMarks: value(formData, "internalMarks"),
    passMarks: value(formData, "passMarks"),
    creditHour: value(formData, "creditHour"),
    displayOrder: formData.get("displayOrder"),
    status: formData.get("status"),
  });
  if (!parsed.success) return invalid(parsed.error);
  try {
    await saveClassSubject(parsed.data, await actor());
    revalidatePath("/dashboard/class-subjects");
    return { success: "Class subject assignment saved." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}

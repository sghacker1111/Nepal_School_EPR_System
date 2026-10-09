"use server";

import { revalidatePath } from "next/cache";

import { toPublicMessage, ValidationError } from "@/lib/errors";
import { ROLE_CODES } from "@/modules/auth/constants";
import { getRequestMetadata } from "@/modules/auth/request-metadata";
import { requireSchoolContext } from "@/modules/auth/session";
import {
  calculateExamResults,
  changeMarkSheetStatus,
  publishExamResults,
  saveExam,
  saveExamSubject,
  saveExamType,
  saveGradingScheme,
  saveMarkSheet,
  unlockMarkSheet,
} from "@/modules/exams/service";
import {
  examSchema,
  examSubjectSchema,
  examTypeSchema,
  gradingSchemeSchema,
  markSheetSchema,
} from "@/modules/exams/validation";

export type ExamActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
};
const value = (formData: FormData, key: string) => {
  const found = formData.get(key);
  return found === "" || found === null ? undefined : found;
};
const invalid = (error: {
  flatten(): { fieldErrors: Record<string, string[]> };
}): ExamActionState => ({
  error: "Please correct the highlighted information.",
  fieldErrors: error.flatten().fieldErrors,
});
async function actor(permission: string) {
  const session = await requireSchoolContext(permission);
  return {
    schoolId: session.schoolId,
    userId: session.user.id,
    isSchoolAdmin: session.roles.has(ROLE_CODES.SCHOOL_ADMIN),
    canVerifyAny: session.roles.has(ROLE_CODES.EXAM_COORDINATOR),
    metadata: await getRequestMetadata(),
  };
}

export async function saveExamTypeAction(
  _previous: ExamActionState,
  formData: FormData,
): Promise<ExamActionState> {
  const parsed = examTypeSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    weight: formData.get("weight"),
    status: formData.get("status"),
  });
  if (!parsed.success) return invalid(parsed.error);
  try {
    await saveExamType(parsed.data, await actor("exam.manage"));
    revalidatePath("/dashboard/exams");
    return { success: "Exam type saved." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}

function parseRules(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [
        minimumPercentage,
        maximumPercentage,
        grade,
        gradePoint,
        ...description
      ] = line.split("|").map((part) => part.trim());
      if (!minimumPercentage || !maximumPercentage || !grade || !gradePoint)
        throw new ValidationError(
          `Grade rule line ${index + 1} must use min|max|grade|grade point|description.`,
        );
      return {
        minimumPercentage,
        maximumPercentage,
        grade,
        gradePoint,
        description: description.join(" | "),
      };
    });
}

export async function saveGradingSchemeAction(
  _previous: ExamActionState,
  formData: FormData,
): Promise<ExamActionState> {
  try {
    const parsed = gradingSchemeSchema.safeParse({
      name: formData.get("name"),
      code: formData.get("code"),
      description: value(formData, "description"),
      isDefault: formData.get("isDefault") === "on",
      rules: parseRules(String(formData.get("rules") ?? "")),
    });
    if (!parsed.success) return invalid(parsed.error);
    await saveGradingScheme(parsed.data, await actor("exam.manage"));
    revalidatePath("/dashboard/exams");
    return { success: "Grading scheme saved." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}

export async function saveExamAction(
  _previous: ExamActionState,
  formData: FormData,
): Promise<ExamActionState> {
  const parsed = examSchema.safeParse({
    academicYearId: formData.get("academicYearId"),
    examTypeId: formData.get("examTypeId"),
    gradingSchemeId: value(formData, "gradingSchemeId"),
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    status: formData.get("status"),
    resultPublishDate: value(formData, "resultPublishDate"),
    remarks: value(formData, "remarks"),
  });
  if (!parsed.success) return invalid(parsed.error);
  try {
    await saveExam(parsed.data, await actor("exam.manage"));
    revalidatePath("/dashboard/exams");
    revalidatePath("/dashboard/exams/subjects");
    return { success: "Exam saved." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}

export async function saveExamSubjectAction(
  _previous: ExamActionState,
  formData: FormData,
): Promise<ExamActionState> {
  const parsed = examSubjectSchema.safeParse({
    examId: formData.get("examId"),
    classId: formData.get("classId"),
    subjectId: formData.get("subjectId"),
    theoryFullMarks: formData.get("theoryFullMarks"),
    practicalFullMarks: formData.get("practicalFullMarks"),
    internalFullMarks: formData.get("internalFullMarks"),
    theoryPassMarks: value(formData, "theoryPassMarks"),
    practicalPassMarks: value(formData, "practicalPassMarks"),
    internalPassMarks: value(formData, "internalPassMarks"),
    passMarks: value(formData, "passMarks"),
    creditHour: formData.get("creditHour"),
    examDate: value(formData, "examDate"),
    startTime: value(formData, "startTime"),
    durationMinutes: value(formData, "durationMinutes"),
  });
  if (!parsed.success) return invalid(parsed.error);
  try {
    await saveExamSubject(parsed.data, await actor("exam.manage"));
    revalidatePath("/dashboard/exams/subjects");
    revalidatePath("/dashboard/exams/marks");
    return { success: "Exam subject configured." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}

export async function saveMarkSheetAction(
  _previous: ExamActionState,
  formData: FormData,
): Promise<ExamActionState> {
  const studentIds = formData.getAll("studentId").map(String);
  const parsed = markSheetSchema.safeParse({
    examSubjectId: formData.get("examSubjectId"),
    sectionId: formData.get("sectionId"),
    rows: studentIds.map((studentId) => ({
      studentId,
      theoryMarks: value(formData, `theory:${studentId}`),
      practicalMarks: value(formData, `practical:${studentId}`),
      internalMarks: value(formData, `internal:${studentId}`),
      specialStatus: value(formData, `special:${studentId}`),
      remarks: value(formData, `remarks:${studentId}`),
    })),
  });
  if (!parsed.success) return invalid(parsed.error);
  try {
    await saveMarkSheet(parsed.data, await actor("marks.enter"));
    revalidatePath("/dashboard/exams/marks");
    return { success: "Marks draft saved and recalculated." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}

export async function submitMarkSheetAction(sheetId: string) {
  await changeMarkSheetStatus(sheetId, "SUBMITTED", await actor("marks.enter"));
  revalidatePath("/dashboard/exams/marks");
}
export async function verifyMarkSheetAction(sheetId: string) {
  await changeMarkSheetStatus(sheetId, "VERIFIED", await actor("marks.verify"));
  revalidatePath("/dashboard/exams/marks");
}
export async function approveMarkSheetAction(sheetId: string) {
  await changeMarkSheetStatus(
    sheetId,
    "APPROVED",
    await actor("marks.approve"),
  );
  revalidatePath("/dashboard/exams/marks");
}
export async function unlockMarkSheetAction(
  sheetId: string,
  formData: FormData,
) {
  await unlockMarkSheet(
    sheetId,
    String(formData.get("reason") ?? ""),
    await actor("marks.unlock"),
  );
  revalidatePath("/dashboard/exams/marks");
}
export async function calculateResultsAction(examId: string) {
  await calculateExamResults(examId, await actor("result.publish"));
  revalidatePath("/dashboard/results");
}
export async function publishResultsAction(examId: string) {
  await publishExamResults(examId, await actor("result.publish"));
  revalidatePath("/dashboard/results");
  revalidatePath("/student");
}

export async function examWorkflowAction(
  _: ExamActionState,
  form: FormData,
): Promise<ExamActionState> {
  const id = String(form.get("id") ?? "");
  const intent = String(form.get("intent") ?? "");
  try {
    if (intent === "submit") await submitMarkSheetAction(id);
    else if (intent === "verify") await verifyMarkSheetAction(id);
    else if (intent === "approve") await approveMarkSheetAction(id);
    else if (intent === "unlock") await unlockMarkSheetAction(id, form);
    else if (intent === "calculate") await calculateResultsAction(id);
    else if (intent === "publish") await publishResultsAction(id);
    else throw new ValidationError("Unknown workflow action.");
    revalidatePath("/dashboard/results");
    revalidatePath("/student");
    return { success: "Workflow updated successfully." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}

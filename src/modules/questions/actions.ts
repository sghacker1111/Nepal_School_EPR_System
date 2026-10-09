"use server";

import { revalidatePath } from "next/cache";

import { toPublicMessage, ValidationError } from "@/lib/errors";
import { getRequestMetadata } from "@/modules/auth/request-metadata";
import { requireSchoolContext } from "@/modules/auth/session";
import {
  approveQuestion,
  generateQuestionPapers,
  movePaperItem,
  removePaperItem,
  replacePaperItem,
  saveChapter,
  saveQuestion,
  saveSpecificationGrid,
  saveTopic,
  togglePaperItemLock,
} from "@/modules/questions/service";
import {
  chapterSchema,
  paperGenerationSchema,
  questionSchema,
  specificationGridSchema,
  topicSchema,
} from "@/modules/questions/validation";

export type QuestionActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
};
const value = (data: FormData, key: string) => {
  const found = data.get(key);
  return found === "" || found === null ? undefined : found;
};
const invalid = (error: {
  flatten(): { fieldErrors: Record<string, string[]> };
}): QuestionActionState => ({
  error: "Please correct the highlighted information.",
  fieldErrors: error.flatten().fieldErrors,
});
async function actor(permission: string) {
  const session = await requireSchoolContext(permission);
  return {
    schoolId: session.schoolId,
    userId: session.user.id,
    metadata: await getRequestMetadata(),
  };
}

export async function saveChapterAction(
  _previous: QuestionActionState,
  formData: FormData,
): Promise<QuestionActionState> {
  const parsed = chapterSchema.safeParse({
    classId: formData.get("classId"),
    subjectId: formData.get("subjectId"),
    name: formData.get("name"),
    code: value(formData, "code"),
    displayOrder: formData.get("displayOrder"),
    status: formData.get("status"),
  });
  if (!parsed.success) return invalid(parsed.error);
  try {
    await saveChapter(parsed.data, await actor("question.manage"));
    revalidatePath("/dashboard/question-bank");
    return { success: "Chapter saved." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}
export async function saveTopicAction(
  _previous: QuestionActionState,
  formData: FormData,
): Promise<QuestionActionState> {
  const parsed = topicSchema.safeParse({
    chapterId: formData.get("chapterId"),
    name: formData.get("name"),
    displayOrder: formData.get("displayOrder"),
    status: formData.get("status"),
  });
  if (!parsed.success) return invalid(parsed.error);
  try {
    await saveTopic(parsed.data, await actor("question.manage"));
    revalidatePath("/dashboard/question-bank");
    return { success: "Topic saved." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}
function parseOptions(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [label, text, correct] = line.split("|").map((part) => part.trim());
      if (!label || !text)
        throw new ValidationError(
          `Option line ${index + 1} must use label|text|true-or-false.`,
        );
      return { label, text, isCorrect: correct?.toLowerCase() === "true" };
    });
}
export async function saveQuestionAction(
  _previous: QuestionActionState,
  formData: FormData,
): Promise<QuestionActionState> {
  try {
    const parsed = questionSchema.safeParse({
      id: value(formData, "id"),
      classId: formData.get("classId"),
      subjectId: formData.get("subjectId"),
      chapterId: formData.get("chapterId"),
      topicId: value(formData, "topicId"),
      questionType: formData.get("questionType"),
      questionText: formData.get("questionText"),
      marks: formData.get("marks"),
      difficulty: formData.get("difficulty"),
      cognitiveLevel: formData.get("cognitiveLevel"),
      estimatedMinutes: value(formData, "estimatedMinutes"),
      specificationGroup: value(formData, "specificationGroup"),
      learningOutcome: value(formData, "learningOutcome"),
      curriculumCode: value(formData, "curriculumCode"),
      answer: value(formData, "answer"),
      solution: value(formData, "solution"),
      options: parseOptions(String(formData.get("options") ?? "")),
    });
    if (!parsed.success) return invalid(parsed.error);
    await saveQuestion(parsed.data, await actor("question.manage"));
    revalidatePath("/dashboard/question-bank");
    return { success: "Question saved as draft." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}
export async function approveQuestionAction(questionId: string) {
  await approveQuestion(questionId, await actor("question.approve"));
  revalidatePath("/dashboard/question-bank");
}
export async function saveSpecificationGridAction(
  _previous: QuestionActionState,
  formData: FormData,
): Promise<QuestionActionState> {
  try {
    const allocations = JSON.parse(String(formData.get("allocations") ?? "[]"));
    const parsed = specificationGridSchema.safeParse({
      academicYearId: formData.get("academicYearId"),
      classId: formData.get("classId"),
      subjectId: formData.get("subjectId"),
      examTypeId: formData.get("examTypeId"),
      name: formData.get("name"),
      fullMarks: formData.get("fullMarks"),
      durationMinutes: formData.get("durationMinutes"),
      saveAsDraft: formData.get("intent") === "draft",
      allocations,
    });
    if (!parsed.success) return invalid(parsed.error);
    const grid = await saveSpecificationGrid(
      parsed.data,
      await actor("paper.manage"),
    );
    revalidatePath("/dashboard/exams/specification-grid");
    return { success: `Grid saved as ${grid.status.toLowerCase()}.` };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}
export async function generatePapersAction(
  _previous: QuestionActionState,
  formData: FormData,
): Promise<QuestionActionState> {
  const parsed = paperGenerationSchema.safeParse({
    gridId: formData.get("gridId"),
    examId: value(formData, "examId"),
    title: formData.get("title"),
    passMarks: value(formData, "passMarks"),
    instructions: value(formData, "instructions"),
    setCodes: formData.getAll("setCode").map(String),
  });
  if (!parsed.success) return invalid(parsed.error);
  try {
    const papers = await generateQuestionPapers(
      parsed.data,
      await actor("paper.generate"),
    );
    revalidatePath("/dashboard/exams/paper-generator");
    return { success: `${papers.length} equivalent paper sets generated.` };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}
export async function togglePaperLockAction(itemId: string, paperId: string) {
  await togglePaperItemLock(itemId, await actor("paper.generate"));
  revalidatePath(`/dashboard/exams/papers/${paperId}`);
}
export async function movePaperItemAction(
  itemId: string,
  paperId: string,
  direction: "up" | "down",
) {
  await movePaperItem(itemId, direction, await actor("paper.generate"));
  revalidatePath(`/dashboard/exams/papers/${paperId}`);
}
export async function replacePaperItemAction(itemId: string, paperId: string) {
  await replacePaperItem(itemId, await actor("paper.generate"));
  revalidatePath(`/dashboard/exams/papers/${paperId}`);
}
export async function removePaperItemAction(itemId: string, paperId: string) {
  await removePaperItem(itemId, await actor("paper.generate"));
  revalidatePath(`/dashboard/exams/papers/${paperId}`);
}
export async function approveQuestionFormAction(
  _previous: QuestionActionState,
  form: FormData,
): Promise<QuestionActionState> {
  try {
    await approveQuestionAction(String(form.get("id") ?? ""));
    return { success: "Question approved." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}
export async function paperItemFormAction(
  itemId: string,
  paperId: string,
  intent: "lock" | "up" | "down" | "replace" | "remove",
  _previous: QuestionActionState,
  _form: FormData,
): Promise<QuestionActionState> {
  void [_previous, _form];
  try {
    switch (intent) {
      case "lock":
        await togglePaperLockAction(itemId, paperId);
        break;
      case "up":
      case "down":
        await movePaperItemAction(itemId, paperId, intent);
        break;
      case "replace":
        await replacePaperItemAction(itemId, paperId);
        break;
      case "remove":
        await removePaperItemAction(itemId, paperId);
        break;
      default:
        throw new ValidationError("Unknown paper action.");
    }
    return { success: "Paper updated." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}

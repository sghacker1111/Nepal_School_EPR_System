import { z } from "zod";

const recordStatus = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]);
const optionalCuid = z.string().cuid().optional().or(z.literal(""));

export const chapterSchema = z.object({
  classId: z.string().cuid(),
  subjectId: z.string().cuid(),
  name: z.string().trim().min(2).max(150),
  code: z.string().trim().max(30).optional().or(z.literal("")),
  displayOrder: z.coerce.number().int().min(0).max(999),
  status: recordStatus,
});

export const topicSchema = z.object({
  chapterId: z.string().cuid(),
  name: z.string().trim().min(2).max(150),
  displayOrder: z.coerce.number().int().min(0).max(999),
  status: recordStatus,
});

export const questionOptionSchema = z.object({
  label: z.string().trim().min(1).max(10),
  text: z.string().trim().min(1).max(500),
  isCorrect: z.boolean(),
});

export const questionSchema = z
  .object({
    id: optionalCuid,
    classId: z.string().cuid(),
    subjectId: z.string().cuid(),
    chapterId: z.string().cuid(),
    topicId: optionalCuid,
    questionType: z.enum([
      "MCQ",
      "TRUE_FALSE",
      "FILL_IN_BLANK",
      "VERY_SHORT",
      "SHORT",
      "LONG",
      "NUMERICAL",
      "MATCHING",
      "CUSTOM",
    ]),
    questionText: z.string().trim().min(3).max(10000),
    marks: z.coerce.number().positive().max(1000),
    difficulty: z.enum(["VERY_EASY", "EASY", "MEDIUM", "HARD", "VERY_HARD"]),
    cognitiveLevel: z.enum([
      "KNOWLEDGE",
      "UNDERSTANDING",
      "APPLICATION",
      "HIGHER_ABILITY",
    ]),
    estimatedMinutes: z.coerce.number().int().positive().max(1440).optional(),
    specificationGroup: z.string().trim().max(100).optional().or(z.literal("")),
    learningOutcome: z.string().trim().max(1000).optional().or(z.literal("")),
    curriculumCode: z.string().trim().max(100).optional().or(z.literal("")),
    answer: z.string().trim().max(10000).optional().or(z.literal("")),
    solution: z.string().trim().max(20000).optional().or(z.literal("")),
    options: z.array(questionOptionSchema).max(10),
  })
  .superRefine((question, context) => {
    if (
      new Set(question.options.map((option) => option.label.toUpperCase()))
        .size !== question.options.length
    )
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Option labels must be unique.",
      });
    if (question.questionType === "MCQ") {
      if (question.options.length < 2)
        context.addIssue({
          code: "custom",
          path: ["options"],
          message: "MCQ questions require at least two options.",
        });
      if (question.options.filter((option) => option.isCorrect).length !== 1)
        context.addIssue({
          code: "custom",
          path: ["options"],
          message: "MCQ questions require exactly one correct option.",
        });
    }
  });

export const gridAllocationSchema = z.object({
  chapterId: optionalCuid,
  topicId: optionalCuid,
  questionType: z
    .enum([
      "MCQ",
      "TRUE_FALSE",
      "FILL_IN_BLANK",
      "VERY_SHORT",
      "SHORT",
      "LONG",
      "NUMERICAL",
      "MATCHING",
      "CUSTOM",
    ])
    .optional()
    .or(z.literal("")),
  cognitiveLevel: z
    .enum(["KNOWLEDGE", "UNDERSTANDING", "APPLICATION", "HIGHER_ABILITY"])
    .optional()
    .or(z.literal("")),
  difficulty: z
    .enum(["VERY_EASY", "EASY", "MEDIUM", "HARD", "VERY_HARD"])
    .optional()
    .or(z.literal("")),
  marksPerQuestion: z.coerce.number().positive().max(1000),
  questionCount: z.coerce.number().int().positive().max(100),
});

export const specificationGridSchema = z.object({
  academicYearId: z.string().cuid(),
  classId: z.string().cuid(),
  subjectId: z.string().cuid(),
  examTypeId: z.string().cuid(),
  name: z.string().trim().min(2).max(150),
  fullMarks: z.coerce.number().positive().max(1000),
  durationMinutes: z.coerce.number().int().positive().max(1440),
  saveAsDraft: z.boolean(),
  allocations: z.array(gridAllocationSchema).min(1).max(100),
});

export const paperGenerationSchema = z.object({
  gridId: z.string().cuid(),
  examId: optionalCuid,
  title: z.string().trim().min(2).max(200),
  passMarks: z.coerce.number().min(0).max(1000).optional(),
  instructions: z.string().trim().max(3000).optional().or(z.literal("")),
  setCodes: z.array(z.string().trim().min(1).max(10)).min(1).max(8),
});

export type ChapterInput = z.infer<typeof chapterSchema>;
export type TopicInput = z.infer<typeof topicSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type SpecificationGridInput = z.infer<typeof specificationGridSchema>;
export type PaperGenerationInput = z.infer<typeof paperGenerationSchema>;

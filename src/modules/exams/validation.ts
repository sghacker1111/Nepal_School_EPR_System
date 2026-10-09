import { z } from "zod";

const optionalCuid = z.string().cuid().optional().or(z.literal(""));
const optionalNumber = z.coerce.number().min(0).optional();

export const examTypeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/),
  weight: z.coerce.number().min(0).max(100),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
});

export const gradeRuleSchema = z
  .object({
    minimumPercentage: z.coerce.number().min(0).max(100),
    maximumPercentage: z.coerce.number().min(0).max(100),
    grade: z.string().trim().min(1).max(10),
    gradePoint: z.coerce.number().min(0).max(4),
    description: z.string().trim().max(100).optional().or(z.literal("")),
  })
  .refine((rule) => rule.maximumPercentage >= rule.minimumPercentage, {
    path: ["maximumPercentage"],
    message: "Maximum percentage must not be below minimum percentage.",
  });

export const gradingSchemeSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    code: z
      .string()
      .trim()
      .min(2)
      .max(30)
      .regex(/^[A-Za-z0-9_-]+$/),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    isDefault: z.boolean(),
    rules: z.array(gradeRuleSchema).min(1).max(30),
  })
  .superRefine((scheme, context) => {
    const rules = [...scheme.rules].sort(
      (a, b) => a.minimumPercentage - b.minimumPercentage,
    );
    if (
      rules[0].minimumPercentage !== 0 ||
      rules.at(-1)!.maximumPercentage !== 100
    )
      context.addIssue({
        code: "custom",
        path: ["rules"],
        message: "Rules must cover 0 through 100 percent.",
      });
    for (let i = 1; i < rules.length; i++) {
      if (
        Math.round(rules[i].minimumPercentage * 100) !==
        Math.round(rules[i - 1].maximumPercentage * 100) + 1
      )
        context.addIssue({
          code: "custom",
          path: ["rules"],
          message:
            "Use continuous two-decimal ranges without overlaps or gaps, for example 80–89.99 then 90–100.",
        });
    }
    if (
      new Set(rules.map((rule) => rule.grade.toUpperCase())).size !==
      rules.length
    )
      context.addIssue({
        code: "custom",
        path: ["rules"],
        message: "Each grade label must be unique.",
      });
  });

export const examSchema = z
  .object({
    academicYearId: z.string().cuid(),
    examTypeId: z.string().cuid(),
    gradingSchemeId: optionalCuid,
    name: z.string().trim().min(2).max(150),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    status: z.enum(["DRAFT", "ACTIVE", "MARK_ENTRY", "VERIFICATION"]),
    resultPublishDate: z.coerce.date().optional(),
    remarks: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .refine((exam) => exam.endDate >= exam.startDate, {
    path: ["endDate"],
    message: "End date must not be before start date.",
  });

export const examSubjectSchema = z
  .object({
    examId: z.string().cuid(),
    classId: z.string().cuid(),
    subjectId: z.string().cuid(),
    theoryFullMarks: z.coerce.number().min(0).max(1000),
    practicalFullMarks: z.coerce.number().min(0).max(1000),
    internalFullMarks: z.coerce.number().min(0).max(1000),
    theoryPassMarks: optionalNumber,
    practicalPassMarks: optionalNumber,
    internalPassMarks: optionalNumber,
    passMarks: optionalNumber,
    creditHour: z.coerce.number().positive().max(50),
    examDate: z.coerce.date().optional(),
    startTime: z.string().trim().max(10).optional().or(z.literal("")),
    durationMinutes: z.coerce.number().int().min(1).max(1440).optional(),
  })
  .superRefine((subject, context) => {
    for (const component of ["theory", "practical", "internal"] as const) {
      const pass = subject[`${component}PassMarks`];
      if (pass !== undefined && pass > subject[`${component}FullMarks`])
        context.addIssue({
          code: "custom",
          path: [`${component}PassMarks`],
          message: "Component pass marks cannot exceed component full marks.",
        });
    }
    const fullMarks =
      subject.theoryFullMarks +
      subject.practicalFullMarks +
      subject.internalFullMarks;
    if (fullMarks <= 0)
      context.addIssue({
        code: "custom",
        path: ["theoryFullMarks"],
        message: "Total full marks must be greater than zero.",
      });
    if (subject.passMarks !== undefined && subject.passMarks > fullMarks)
      context.addIssue({
        code: "custom",
        path: ["passMarks"],
        message: "Pass marks cannot exceed total full marks.",
      });
  });

export const markRowSchema = z.object({
  studentId: z.string().cuid(),
  theoryMarks: optionalNumber,
  practicalMarks: optionalNumber,
  internalMarks: optionalNumber,
  specialStatus: z
    .enum(["ABSENT", "WITHHELD", "EXEMPTED"])
    .optional()
    .or(z.literal("")),
  remarks: z.string().trim().max(250).optional().or(z.literal("")),
});

export const markSheetSchema = z.object({
  examSubjectId: z.string().cuid(),
  sectionId: z.string().cuid(),
  rows: z.array(markRowSchema).min(1),
});

export type ExamTypeInput = z.infer<typeof examTypeSchema>;
export type GradingSchemeInput = z.infer<typeof gradingSchemeSchema>;
export type ExamInput = z.infer<typeof examSchema>;
export type ExamSubjectInput = z.infer<typeof examSubjectSchema>;
export type MarkSheetInput = z.infer<typeof markSheetSchema>;

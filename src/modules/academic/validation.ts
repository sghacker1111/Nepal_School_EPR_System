import { z } from "zod";

const optionalId = z.string().cuid().optional().or(z.literal(""));
const status = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]);

export const academicYearSchema = z
  .object({
    id: optionalId,
    name: z.string().trim().min(2).max(50),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    isCurrent: z.boolean(),
    status: z.enum(["PLANNED", "ACTIVE", "CLOSED", "ARCHIVED"]),
  })
  .refine((data) => data.endDate > data.startDate, {
    path: ["endDate"],
    message: "End date must be after start date.",
  })
  .refine((data) => !data.isCurrent || data.status === "ACTIVE", {
    path: ["isCurrent"],
    message: "The current academic year must be active.",
  });

export const classSchema = z.object({
  id: optionalId,
  name: z.string().trim().min(1).max(80),
  numericLevel: z.coerce.number().int().min(-2).max(20).optional(),
  displayOrder: z.coerce.number().int().min(0).max(999),
  status,
});

export const sectionSchema = z.object({
  id: optionalId,
  classId: z.string().cuid(),
  name: z.string().trim().min(1).max(40),
  capacity: z.coerce.number().int().min(1).max(500).optional(),
  status,
});

export const subjectSchema = z
  .object({
    id: optionalId,
    name: z.string().trim().min(2).max(120),
    code: z
      .string()
      .trim()
      .min(2)
      .max(30)
      .regex(/^[A-Za-z0-9_-]+$/),
    shortName: z.string().trim().max(30).optional().or(z.literal("")),
    subjectType: z.enum(["THEORY", "PRACTICAL", "MIXED", "OPTIONAL"]),
    theoryFullMarks: z.coerce.number().int().min(0).max(1000),
    practicalFullMarks: z.coerce.number().int().min(0).max(1000),
    internalFullMarks: z.coerce.number().int().min(0).max(1000).default(0),
    passMarks: z.coerce.number().int().min(0).max(1000).optional(),
    status,
  })
  .superRefine((data, context) => {
    const total =
      data.theoryFullMarks + data.practicalFullMarks + data.internalFullMarks;
    if (total <= 0) {
      context.addIssue({
        code: "custom",
        path: ["theoryFullMarks"],
        message: "Total full marks must be greater than zero.",
      });
    }
    if (data.passMarks !== undefined && data.passMarks > total) {
      context.addIssue({
        code: "custom",
        path: ["passMarks"],
        message: "Pass marks cannot exceed full marks.",
      });
    }
  });

export const classSubjectSchema = z
  .object({
    isOptional: z.boolean().optional(),
    id: optionalId,
    academicYearId: z.string().cuid(),
    classId: z.string().cuid(),
    subjectId: z.string().cuid(),
    fullMarks: z.coerce.number().int().min(1).max(1000),
    theoryMarks: z.coerce.number().int().min(0).max(1000),
    practicalMarks: z.coerce.number().int().min(0).max(1000),
    internalMarks: z.coerce.number().int().min(0).max(1000).default(0),
    passMarks: z.coerce.number().int().min(0).max(1000).optional(),
    creditHour: z.coerce.number().positive().max(50).optional(),
    displayOrder: z.coerce.number().int().min(0).max(999),
    status,
  })
  .superRefine((data, context) => {
    if (
      data.theoryMarks + data.practicalMarks + data.internalMarks !==
      data.fullMarks
    ) {
      context.addIssue({
        code: "custom",
        path: ["fullMarks"],
        message:
          "Full marks must equal theory plus practical plus internal marks.",
      });
    }
    if (data.passMarks !== undefined && data.passMarks > data.fullMarks) {
      context.addIssue({
        code: "custom",
        path: ["passMarks"],
        message: "Pass marks cannot exceed full marks.",
      });
    }
  });

export type AcademicYearInput = z.infer<typeof academicYearSchema>;
export type ClassInput = z.infer<typeof classSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
export type SubjectInput = z.infer<typeof subjectSchema>;
export type ClassSubjectInput = z.infer<typeof classSubjectSchema>;

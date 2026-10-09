import { z } from "zod";

export const attendanceStatusSchema = z.enum([
  "PRESENT",
  "ABSENT",
  "LATE",
  "LEAVE",
  "HOLIDAY",
]);

export const attendanceSheetSchema = z.object({
  academicYearId: z.string().cuid(),
  classId: z.string().cuid(),
  sectionId: z.string().cuid(),
  date: z.coerce.date(),
  submit: z.boolean().default(false),
  records: z
    .array(
      z.object({
        studentId: z.string().cuid(),
        status: attendanceStatusSchema,
        remarks: z.string().trim().max(250).optional().or(z.literal("")),
      }),
    )
    .min(1, "At least one enrolled student is required."),
});

export type AttendanceSheetInput = z.infer<typeof attendanceSheetSchema>;

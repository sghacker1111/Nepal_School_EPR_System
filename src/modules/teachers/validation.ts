import { z } from "zod";

const optionalText = z.string().trim().max(200).optional().or(z.literal(""));
const optionalDate = z.union([z.coerce.date(), z.literal("")]).optional();

export const teacherSchema = z
  .object({
    id: z.string().cuid().optional().or(z.literal("")),
    teacherCode: z
      .string()
      .trim()
      .min(2)
      .max(30)
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "Use letters, numbers, hyphens, or underscores.",
      ),
    firstName: z.string().trim().min(2).max(80),
    middleName: optionalText,
    lastName: z.string().trim().min(1).max(80),
    nameInNepali: optionalText,
    gender: z.enum(["MALE", "FEMALE", "OTHER", "NOT_SPECIFIED"]),
    dateOfBirth: optionalDate,
    mobile: z.string().trim().min(7).max(20),
    email: z.union([z.string().trim().email(), z.literal("")]).optional(),
    address: optionalText,
    qualification: optionalText,
    specialization: optionalText,
    joiningDate: z.coerce.date(),
    employmentType: z.enum([
      "PERMANENT",
      "TEMPORARY",
      "CONTRACT",
      "PART_TIME",
      "VOLUNTEER",
    ]),
    status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE", "RESIGNED", "ARCHIVED"]),
    citizenshipNumber: optionalText,
    citizenshipIssueAt: optionalText,
    createLogin: z.boolean(),
    username: optionalText,
    loginEmail: z.union([z.string().trim().email(), z.literal("")]).optional(),
    temporaryPassword: z.string().optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, context) => {
    if (!data.createLogin) return;
    if (!data.username || data.username.length < 3)
      context.addIssue({
        code: "custom",
        path: ["username"],
        message: "Username must contain at least 3 characters.",
      });
    const password = data.temporaryPassword ?? "";
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/\d/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    )
      context.addIssue({
        code: "custom",
        path: ["temporaryPassword"],
        message:
          "Use 8+ characters with uppercase, lowercase, number, and special character.",
      });
    if (password !== data.confirmPassword)
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
  });

export const teacherAssignmentSchema = z.object({
  id: z.string().cuid().optional().or(z.literal("")),
  academicYearId: z.string().cuid(),
  teacherId: z.string().cuid(),
  classId: z.string().cuid(),
  sectionId: z.string().cuid().optional().or(z.literal("")),
  subjectId: z.string().cuid(),
  isClassTeacher: z.boolean(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
});

export type TeacherInput = z.infer<typeof teacherSchema>;
export type TeacherAssignmentInput = z.infer<typeof teacherAssignmentSchema>;

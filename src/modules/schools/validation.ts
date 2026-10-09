import { z } from "zod";

import { validatePassword } from "@/modules/auth/password-policy";

const optionalText = z.string().trim().max(180).optional().or(z.literal(""));
const optionalEmail = z.string().trim().email().optional().or(z.literal(""));
const optionalUrl = z.string().trim().url().optional().or(z.literal(""));

export const createSchoolSchema = z
  .object({
    name: z.string().trim().min(3).max(180),
    code: z
      .string()
      .trim()
      .min(3)
      .max(24)
      .regex(/^[A-Za-z0-9-]+$/, "Use only letters, numbers, and hyphens."),
    iemisCode: optionalText,
    type: z.enum([
      "COMMUNITY",
      "INSTITUTIONAL",
      "RELIGIOUS",
      "SPECIAL",
      "OTHER",
    ]),
    level: z.string().trim().min(2).max(100),
    establishmentYear: z.coerce.number().int().min(1900).max(2200).optional(),
    registrationNumber: optionalText,
    panVat: optionalText,
    province: z.string().trim().min(2).max(100),
    district: z.string().trim().min(2).max(100),
    localLevel: z.string().trim().min(2).max(140),
    ward: z.coerce.number().int().min(1).max(99),
    tole: optionalText,
    address: z.string().trim().min(3).max(300),
    phone: optionalText,
    mobile: z.string().trim().min(7).max(24),
    email: z.string().trim().email().max(180),
    website: optionalUrl,
    principalName: z.string().trim().min(3).max(160),
    principalPhone: z.string().trim().min(7).max(24),
    principalEmail: optionalEmail,
    calendarPreference: z.enum(["BS", "AD", "BOTH"]),
    defaultAcademicYear: optionalText,
    defaultLanguage: z.enum(["en", "ne"]),
    status: z.enum(["TRIAL", "ACTIVE"]),
    attendanceEnabled: z.boolean(),
    examinationEnabled: z.boolean(),
    questionBankEnabled: z.boolean(),
    adminFullName: z.string().trim().min(3).max(160),
    adminUsername: z
      .string()
      .trim()
      .min(3)
      .max(50)
      .regex(
        /^[A-Za-z0-9._-]+$/,
        "Use letters, numbers, dots, underscores, or hyphens.",
      ),
    adminEmail: z.string().trim().email().max(180),
    adminMobile: z.string().trim().min(7).max(24),
    temporaryPassword: z.string().max(256),
    confirmPassword: z.string().max(256),
  })
  .superRefine((data, context) => {
    for (const message of validatePassword(data.temporaryPassword).errors) {
      context.addIssue({
        code: "custom",
        path: ["temporaryPassword"],
        message,
      });
    }
    if (data.temporaryPassword !== data.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
  });

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;

export const schoolStatusSchema = z.object({
  schoolId: z.string().cuid(),
  status: z.enum(["TRIAL", "ACTIVE", "SUSPENDED", "ARCHIVED"]),
});

export const resetSchoolAdminPasswordSchema = z
  .object({
    schoolId: z.string().cuid(),
    userId: z.string().cuid(),
    temporaryPassword: z.string().max(256),
    confirmPassword: z.string().max(256),
  })
  .superRefine((data, context) => {
    for (const message of validatePassword(data.temporaryPassword).errors) {
      context.addIssue({
        code: "custom",
        message,
        path: ["temporaryPassword"],
      });
    }
    if (data.temporaryPassword !== data.confirmPassword) {
      context.addIssue({
        code: "custom",
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      });
    }
  });

export const updateSchoolSettingsSchema = z.object({
  calendarPreference: z.enum(["BS", "AD", "BOTH"]),
  defaultAcademicYear: z.string().trim().max(50).optional().or(z.literal("")),
  defaultLanguage: z.enum(["en", "ne"]),
  attendanceEnabled: z.boolean(),
  examinationEnabled: z.boolean(),
  questionBankEnabled: z.boolean(),
});

export const updateSchoolProfileSchema = z.object({
  schoolId: z.string().cuid(),
  name: z.string().trim().min(3).max(180),
  code: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[A-Za-z0-9-]+$/),
  iemisCode: optionalText,
  type: z.enum(["COMMUNITY", "INSTITUTIONAL", "RELIGIOUS", "SPECIAL", "OTHER"]),
  level: z.string().trim().min(2).max(100),
  establishmentYear: z.coerce.number().int().min(1900).max(2200).optional(),
  registrationNumber: optionalText,
  panVat: optionalText,
  province: z.string().trim().min(2).max(100),
  district: z.string().trim().min(2).max(100),
  localLevel: z.string().trim().min(2).max(140),
  ward: z.coerce.number().int().min(1).max(99),
  tole: optionalText,
  address: z.string().trim().min(3).max(300),
  phone: optionalText,
  mobile: z.string().trim().min(7).max(24),
  email: z.string().trim().email().max(180),
  website: optionalUrl,
  principalName: z.string().trim().min(3).max(160),
  principalPhone: z.string().trim().min(7).max(24),
  principalEmail: optionalEmail,
});

export type UpdateSchoolProfileInput = z.infer<
  typeof updateSchoolProfileSchema
>;

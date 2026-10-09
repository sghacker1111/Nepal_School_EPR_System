import { z } from "zod";

import { validatePassword } from "@/modules/auth/password-policy";

export const schoolLoginSchema = z.object({
  schoolCode: z.string().trim().min(2).max(24),
  identity: z.string().trim().min(2).max(160),
  password: z.string().min(1).max(256),
  rememberSchool: z.boolean().optional(),
});

export const superAdminLoginSchema = z.object({
  identity: z.string().trim().min(2).max(160),
  password: z.string().min(1).max(256),
});

export const changePasswordSchema = z
  .object({
    newPassword: z.string().max(256),
    confirmPassword: z.string().max(256),
  })
  .superRefine((data, context) => {
    const check = validatePassword(data.newPassword);
    for (const message of check.errors) {
      context.addIssue({ code: "custom", message, path: ["newPassword"] });
    }
    if (data.newPassword !== data.confirmPassword) {
      context.addIssue({
        code: "custom",
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      });
    }
  });

import { z } from "zod";
import { validatePassword } from "@/modules/auth/password-policy";

export const managedRoleCodes = [
  "SCHOOL_ADMIN",
  "TEACHER",
  "CLASS_TEACHER",
  "EXAM_COORDINATOR",
  "STUDENT",
] as const;
export const managedUserSchema = z
  .object({
    id: z.string().cuid().optional(),
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    username: z
      .string()
      .trim()
      .min(3)
      .max(60)
      .regex(
        /^[a-zA-Z0-9_.-]+$/,
        "Use letters, numbers, dots, hyphens or underscores.",
      ),
    email: z.string().trim().email().optional().or(z.literal("")),
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
    role: z.enum(managedRoleCodes),
    temporaryPassword: z.string().max(128).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.id || data.temporaryPassword) {
      const checked = validatePassword(data.temporaryPassword ?? "");
      if (!checked.valid)
        ctx.addIssue({
          code: "custom",
          path: ["temporaryPassword"],
          message: checked.errors.join(" "),
        });
    }
  });
export type ManagedUserInput = z.infer<typeof managedUserSchema>;

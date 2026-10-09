import { z } from "zod";

export const notificationSchema = z.object({
  type: z.enum([
    "GENERAL",
    "ATTENDANCE",
    "EXAM",
    "RESULT",
    "SECURITY",
    "SYSTEM",
  ]),
  title: z.string().trim().min(2).max(150),
  body: z.string().trim().min(3).max(2000),
  link: z
    .string()
    .trim()
    .max(500)
    .regex(/^\/(?!\/)[^\\\s]*$/, "Use a local page path, such as /student.")
    .optional()
    .or(z.literal("")),
  target: z.enum(["ALL", "STUDENTS", "TEACHERS", "ADMINS"]),
  expiresAt: z.coerce.date().optional(),
});

export type NotificationInput = z.infer<typeof notificationSchema>;

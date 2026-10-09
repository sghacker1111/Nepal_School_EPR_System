import { z } from "zod";

const runtimeEnvSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgresql://")),
  AUTH_SECRET: z.string().min(32),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(12),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export function getRuntimeEnv() {
  const parsed = runtimeEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(
      `Invalid server environment: ${parsed.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ")}`,
    );
  }

  return parsed.data;
}

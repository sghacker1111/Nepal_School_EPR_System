import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/modules/auth/password";
import {
  generateStrongPassword,
  validatePassword,
} from "@/modules/auth/password-policy";

describe("password security", () => {
  it("rejects passwords that miss required character classes", () => {
    const result = validatePassword("password");
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "Add an uppercase letter.",
        "Add a number.",
        "Add a special character.",
      ]),
    );
  });

  it("generates a strong password without ambiguous characters", () => {
    const password = generateStrongPassword(18);
    expect(password).toHaveLength(18);
    expect(validatePassword(password)).toEqual({ valid: true, errors: [] });
    expect(password).not.toMatch(/[01IOlo]/);
  });

  it("stores and verifies an Argon2id hash, never the plaintext", async () => {
    const plaintext = "Secure@School123";
    const hash = await hashPassword(plaintext);
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain(plaintext);
    await expect(verifyPassword(hash, plaintext)).resolves.toBe(true);
    await expect(verifyPassword(hash, "Wrong@School123")).resolves.toBe(false);
  });
});

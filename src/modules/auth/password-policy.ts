const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const NUMBER = "23456789";
const SPECIAL = "!@#$%^&*";
const ALL = `${UPPER}${LOWER}${NUMBER}${SPECIAL}`;

function secureRandomInt(maximum: number) {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0] % maximum;
}

export type PasswordCheck = {
  valid: boolean;
  errors: string[];
};

export function validatePassword(password: string): PasswordCheck {
  const errors: string[] = [];
  if (password.length < 8) errors.push("Use at least 8 characters.");
  if (!/[A-Z]/.test(password)) errors.push("Add an uppercase letter.");
  if (!/[a-z]/.test(password)) errors.push("Add a lowercase letter.");
  if (!/\d/.test(password)) errors.push("Add a number.");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("Add a special character.");
  return { valid: errors.length === 0, errors };
}

export function generateStrongPassword(length = 16) {
  if (length < 12)
    throw new Error("Generated passwords must be at least 12 characters.");

  const chars = [
    UPPER[secureRandomInt(UPPER.length)],
    LOWER[secureRandomInt(LOWER.length)],
    NUMBER[secureRandomInt(NUMBER.length)],
    SPECIAL[secureRandomInt(SPECIAL.length)],
  ];

  while (chars.length < length) chars.push(ALL[secureRandomInt(ALL.length)]);

  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomInt(index + 1);
    [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
  }

  return chars.join("");
}

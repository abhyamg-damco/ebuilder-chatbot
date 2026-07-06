import { generateId } from "ai";
import { genSaltSync, hashSync } from "bcrypt-ts";

/** Normalizes emails for storage and lookup (case-insensitive login). */
export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateHashedPassword(password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  return hash;
}

export function generateDummyPassword() {
  const password = generateId();
  const hashedPassword = generateHashedPassword(password);

  return hashedPassword;
}

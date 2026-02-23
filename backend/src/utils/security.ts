import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(value: string): Promise<string> {
  return bcrypt.hash(value, BCRYPT_ROUNDS);
}

export async function verifyPassword(value: string, hash: string): Promise<boolean> {
  return bcrypt.compare(value, hash);
}

export function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createSessionId(): string {
  return randomUUID();
}

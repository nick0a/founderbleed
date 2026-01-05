import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function getKey(): Buffer {
  const rawKey = process.env.ENCRYPTION_KEY;

  if (!rawKey) {
    throw new Error("ENCRYPTION_KEY not set");
  }

  const normalized = rawKey.replace(/^"|"$/g, "");
  const key = /^[0-9a-fA-F]{64}$/.test(normalized)
    ? Buffer.from(normalized, "hex")
    : Buffer.from(normalized, "base64");

  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes");
  }

  return key;
}

export function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

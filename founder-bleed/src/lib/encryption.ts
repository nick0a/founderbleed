import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export type EncryptedPayload = {
  iv: string;
  content: string;
  tag: string;
};

function loadKey(): Buffer {
  const rawKey = process.env.ENCRYPTION_KEY;

  if (!rawKey) {
    throw new Error("ENCRYPTION_KEY is not set");
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

export function encryptText(value: string): EncryptedPayload {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, loadKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    content: encrypted.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptText(payload: EncryptedPayload): string {
  const iv = Buffer.from(payload.iv, "base64");
  const content = Buffer.from(payload.content, "base64");
  const tag = Buffer.from(payload.tag, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, loadKey(), iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(content), decipher.final()]);

  return decrypted.toString("utf8");
}

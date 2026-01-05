import crypto from 'crypto';

const IV_LENGTH = 12;
const TAG_LENGTH = 16;

const isHexKey = (value: string) => /^[0-9a-fA-F]{64}$/.test(value);

const getKey = () => {
  const rawKey = process.env.ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error('ENCRYPTION_KEY is not set');
  }

  if (isHexKey(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }

  const buffer = Buffer.from(rawKey, 'base64');
  if (buffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes');
  }

  return buffer;
};

export const encryptString = (value: string) => {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString('base64');
};

export const decryptString = (payload: string) => {
  const key = getKey();
  const buffer = Buffer.from(payload, 'base64');
  const iv = buffer.subarray(0, IV_LENGTH);
  const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;
const SALT = 'agora:integration-connector:v1';

function getKeyFromEnv(): Buffer {
  const raw = process.env.WORKFLOW_CONNECTOR_ENCRYPTION_KEY;
  if (!raw || !raw.trim()) {
    throw new Error(
      'WORKFLOW_CONNECTOR_ENCRYPTION_KEY no está configurada (Base64 de 32 bytes). Requerida para cifrar contraseñas de conectores.',
    );
  }
  const buf = Buffer.from(raw.trim(), 'base64');
  if (buf.length === KEY_LEN) {
    return buf;
  }
  if (raw.length >= 32) {
    return scryptSync(raw, SALT, KEY_LEN) as Buffer;
  }
  throw new Error('WORKFLOW_CONNECTOR_ENCRYPTION_KEY: debe ser Base64 de exactamente 32 bytes, o use una frase de al menos 32 caracteres (derivación scrypt).');
}

export function encryptSecret(plain: string): string {
  if (plain == null || plain === '') {
    return '';
  }
  const key = getKeyFromEnv();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptSecret(cipherB64: string | null | undefined): string {
  if (!cipherB64) {
    return '';
  }
  const key = getKeyFromEnv();
  const raw = Buffer.from(cipherB64, 'base64');
  if (raw.length < IV_LEN + TAG_LEN) {
    throw new Error('Ciphertext de conector inválido o corrupto');
  }
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = raw.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

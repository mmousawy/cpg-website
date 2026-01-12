import crypto from 'crypto';

const ENCRYPTION_KEY: string = process.env.ENCRYPT_KEY || ''; // Must be 256 bits (32 characters)
const IV_LENGTH: number = 16; // For AES, this is always 16

export function keyGen() {
  return crypto.randomBytes(32).toString('hex');
}

export function encrypt(plainText: string, keyHex: string = ENCRYPTION_KEY): string {
  const iv = crypto.randomBytes(IV_LENGTH); // Directly use Buffer returned by randomBytes
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(keyHex, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);

  // Return iv and encrypted data as hex, combined in one line
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string, keyHex: string = ENCRYPTION_KEY): string {
  if (!keyHex || keyHex.length !== 64) { // 32 bytes = 64 hex characters
    throw new Error('Encryption key is missing or invalid. ENCRYPT_KEY must be 32 bytes (64 hex characters).');
  }

  const [ivHex, encryptedHex] = text.split(':');
  if (!ivHex || !encryptedHex) {
    throw new Error('Invalid or corrupted cipher format - token must contain iv:encrypted format');
  }

  if (ivHex.length !== 32) { // 16 bytes = 32 hex characters
    throw new Error('Invalid IV length');
  }

  try {
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(keyHex, 'hex'), Buffer.from(ivHex, 'hex'));
    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);

    return decrypted.toString();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
    throw new Error('Decryption failed: Unknown error');
  }
}

import crypto from 'node:crypto';

/**
 * Derives a secure password hash using scrypt with a unique 32-byte salt.
 * @param {string} password - The plaintext password
 * @param {string} [salt] - Optional existing salt (hex)
 * @returns {{ salt: string, hash: string }}
 */
export function hashPassword(password, salt = null) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  const actualSalt = salt || crypto.randomBytes(32).toString('hex');
  const derivedKey = crypto.scryptSync(password, actualSalt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 32 * 1024 * 1024
  });
  return {
    salt: actualSalt,
    hash: derivedKey.toString('hex')
  };
}

/**
 * Validates a password in constant-time using timingSafeEqual to eliminate side-channel leaks.
 * @param {string} password - Plaintext attempt
 * @param {string} salt - Stored user salt
 * @param {string} storedHash - Stored scrypt hash
 * @returns {boolean}
 */
export function verifyPassword(password, salt, storedHash) {
  if (!password || !salt || !storedHash || typeof password !== 'string') {
    return false;
  }
  try {
    const candidateKey = crypto.scryptSync(password, salt, 64, {
      N: 16384,
      r: 8,
      p: 1,
      maxmem: 32 * 1024 * 1024
    });
    const storedBuf = Buffer.from(storedHash, 'hex');
    if (candidateKey.length !== storedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(candidateKey, storedBuf);
  } catch {
    return false;
  }
}

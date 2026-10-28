import * as argon2 from 'argon2';

/**
 * Hashes a plain text password using the Argon2id algorithm.
 *
 * @param password - Plain text password to hash.
 * @returns Argon2 hash string.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

/**
 * Verifies a plain text password against a stored Argon2 hash.
 *
 * @param hash - Stored Argon2 hash.
 * @param plain - Plain text password provided by the user.
 * @returns True if password matches, false otherwise.
 */
export async function verifyPassword(
  hash: string,
  plain: string,
): Promise<boolean> {
  return argon2.verify(hash, plain);
}

import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password.util.js';

describe('password.util', () => {
  it('should hash a password using Argon2', async () => {
    const plain = 'mySecretPassword123';
    const hash = await hashPassword(plain);

    expect(hash).toBeDefined();
    expect(hash).toMatch(/^\$argon2/);
    expect(hash).not.toBe(plain);
  });

  it('should verify a correct password', async () => {
    const plain = 'correctHorseBatteryStaple';
    const hash = await hashPassword(plain);

    const isMatch = await verifyPassword(hash, plain);
    expect(isMatch).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const plain = 'myPassword';
    const hash = await hashPassword(plain);

    const isMatch = await verifyPassword(hash, 'wrongPassword');
    expect(isMatch).toBe(false);
  });
});

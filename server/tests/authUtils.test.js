import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

// Set before importing authUtils.js, which reads process.env.JWT_SECRET at
// call time (not at import time), so this only needs to run before the
// tests actually invoke a token function - kept isolated from any real
// .env so this suite never depends on local server setup.
before(() => {
  process.env.JWT_SECRET = 'test-only-secret-do-not-use-in-production';
  process.env.JWT_EXPIRE = '1h';
});

const {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  generateCustomerToken,
  generateCustomerSetupToken,
  verifyCustomerSetupToken,
  sanitizeUser,
  DEFAULT_STAFF_PASSWORD,
} = await import('../src/utils/authUtils.js');

describe('hashPassword / comparePassword', () => {
  test('a hashed password verifies against the original', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    assert.equal(await comparePassword('correct-horse-battery-staple', hash), true);
  });

  test('a wrong password does not verify', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    assert.equal(await comparePassword('wrong-password', hash), false);
  });

  test('hashing the same password twice produces different hashes (salted)', async () => {
    const [a, b] = await Promise.all([hashPassword('same-input'), hashPassword('same-input')]);
    assert.notEqual(a, b);
  });
});

describe('generateToken / verifyToken (staff)', () => {
  test('a token round-trips back to the payload it was signed with', () => {
    const user = { user_id: 7, first_name: 'Dulani', last_name: 'Perera', email: 'dulani@propet.lk', role: 'veterinarian' };
    const token = generateToken(user);
    const decoded = verifyToken(token);
    assert.equal(decoded.user_id, 7);
    assert.equal(decoded.role, 'veterinarian');
  });

  test('a tampered token fails verification', () => {
    const token = generateToken({ user_id: 1, role: 'admin' });
    assert.throws(() => verifyToken(token.slice(0, -2) + 'xx'), /Invalid or expired token/);
  });
});

describe('generateCustomerToken', () => {
  test('carries type: customer and role: pet_owner so it can never satisfy staff auth', () => {
    const token = generateCustomerToken({ customer_id: 'CUST-0002', first_name: 'Nishantha', last_name: 'Rajapaksa', email: 'n@example.com', phone: '0771234567' });
    const decoded = verifyToken(token);
    assert.equal(decoded.type, 'customer');
    assert.equal(decoded.role, 'pet_owner');
    assert.equal(decoded.customer_id, 'CUST-0002');
  });
});

describe('generateCustomerSetupToken / verifyCustomerSetupToken', () => {
  test('a setup token verifies and carries type: customer-setup', () => {
    const token = generateCustomerSetupToken({ customer_id: 'CUST-0002' });
    const decoded = verifyCustomerSetupToken(token);
    assert.equal(decoded.type, 'customer-setup');
    assert.equal(decoded.customer_id, 'CUST-0002');
  });

  test('a regular staff token is rejected by verifyCustomerSetupToken (wrong type)', () => {
    const staffToken = generateToken({ user_id: 1, role: 'admin' });
    assert.throws(() => verifyCustomerSetupToken(staffToken), /Invalid or expired setup token/);
  });
});

describe('sanitizeUser', () => {
  test('strips password_hash but keeps everything else', () => {
    const user = { user_id: 1, email: 'a@b.com', role: 'admin', password_hash: 'secret-hash' };
    const sanitized = sanitizeUser(user);
    assert.equal(sanitized.password_hash, undefined);
    assert.equal(sanitized.email, 'a@b.com');
  });
});

describe('DEFAULT_STAFF_PASSWORD', () => {
  test('is a non-empty placeholder, always paired with password_must_change in callers', () => {
    assert.equal(typeof DEFAULT_STAFF_PASSWORD, 'string');
    assert.ok(DEFAULT_STAFF_PASSWORD.length > 0);
  });
});

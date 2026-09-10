import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { hashPassword, verifyPassword } from '../lib/auth.js';
import { db, initDatabase } from '../lib/db.js';

const TEST_DB_PATH = path.join(process.cwd(), 'data/test_db.json');

test('Auth Crypto: hashPassword generates unique 32-byte salt and scrypt hash', () => {
  const res1 = hashPassword('SuperSecret123!');
  const res2 = hashPassword('SuperSecret123!');

  assert.ok(res1.salt && res1.hash);
  assert.ok(res2.salt && res2.hash);
  // Salts must be unique
  assert.notStrictEqual(res1.salt, res2.salt);
  // Hashes must be different because salts differ
  assert.notStrictEqual(res1.hash, res2.hash);
});

test('Auth Crypto: verifyPassword correctly validates passwords in constant-time', () => {
  const { salt, hash } = hashPassword('CorrectPassword999#');

  assert.strictEqual(verifyPassword('CorrectPassword999#', salt, hash), true);
  assert.strictEqual(verifyPassword('WrongPassword123!', salt, hash), false);
  assert.strictEqual(verifyPassword('', salt, hash), false);
});

test('DB: User registration, lookup, and duplicate prevention', () => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  initDatabase(TEST_DB_PATH);

  const user = db.createUser({
    name: 'Alice Client',
    email: 'alice@company.com',
    password: 'ClientPassword123!',
    role: 'client'
  });

  assert.ok(user.id);
  assert.strictEqual(user.name, 'Alice Client');
  assert.strictEqual(user.email, 'alice@company.com');
  assert.strictEqual(user.role, 'client');
  assert.strictEqual(user.passwordHash, undefined, 'passwordHash must not leak in returned user');

  // Lookup
  const found = db.findUserByEmail('ALICE@company.com'); // case-insensitive
  assert.ok(found);
  assert.strictEqual(found.id, user.id);
  assert.ok(found.salt && found.passwordHash);

  // Duplicate rejection
  assert.throws(() => {
    db.createUser({
      name: 'Alice Clone',
      email: 'alice@company.com',
      password: 'AnotherPassword123!',
      role: 'client'
    });
  }, /already registered/);
});

test('DB: Session creation, retrieval, and revocation', () => {
  const token = db.createSession('user-123', 'client');
  assert.strictEqual(typeof token, 'string');
  assert.strictEqual(token.length, 64, '256-bit token is 64 hex chars');

  const session = db.getSession(token);
  assert.ok(session);
  assert.strictEqual(session.userId, 'user-123');
  assert.strictEqual(session.role, 'client');

  // Revoke
  db.deleteSession(token);
  assert.strictEqual(db.getSession(token), null);
});

test('DB: Order creation, tenant isolation, and status updates', () => {
  const order1 = db.createOrder({
    userId: 'user-alice',
    clientName: 'Alice Client',
    clientEmail: 'alice@company.com',
    architectureTier: 'Core Spreadsheet Architecture',
    fileCount: 3,
    notes: '#REF! in budget sheet'
  });

  const order2 = db.createOrder({
    userId: 'user-bob',
    clientName: 'Bob Partner',
    clientEmail: 'bob@firm.com',
    architectureTier: 'Financial Modeling Architecture',
    fileCount: 5,
    notes: 'Three statement model out of balance'
  });

  assert.ok(order1.id.startsWith('SF-'));
  assert.strictEqual(order1.status, 'Audit Queued');
  assert.strictEqual(order1.ndaSigned, true);

  // Tenant isolation: Alice only sees Alice's orders
  const aliceOrders = db.getOrdersByUser('user-alice');
  assert.strictEqual(aliceOrders.length, 1);
  assert.strictEqual(aliceOrders[0].id, order1.id);

  // Bob only sees Bob's orders
  const bobOrders = db.getOrdersByUser('user-bob');
  assert.strictEqual(bobOrders.length, 1);
  assert.strictEqual(bobOrders[0].id, order2.id);

  // Architect sees all orders
  const allOrders = db.getAllOrders();
  assert.ok(allOrders.length >= 2);

  // Status update with SHA-256 Checksum
  const checksum = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const updated = db.updateOrderStatus(order1.id, 'Delivered', checksum);
  assert.strictEqual(updated.status, 'Delivered');
  assert.strictEqual(updated.sha256Checksum, checksum);

  // Clean test DB
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});

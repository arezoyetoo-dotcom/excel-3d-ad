import { test, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { server, PORT, resetRateLimits } from '../server.js';
import { db } from '../lib/db.js';

let BASE_URL = `http://127.0.0.1:${PORT}`;

before((t, done) => {
  if (!server.listening) {
    server.listen(0, '127.0.0.1', () => {
      const assignedPort = server.address().port;
      BASE_URL = `http://127.0.0.1:${assignedPort}`;
      resetRateLimits();
      done();
    });
  } else {
    resetRateLimits();
    done();
  }
});

after((t, done) => {
  if (server.listening) {
    server.close(done);
  } else {
    done();
  }
});

function request(path, options = {}, payload = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search
    };

    if (payload) {
      const bodyStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: data,
        json: () => {
          try { return JSON.parse(data); } catch { return null; }
        }
      }));
    });
    req.on('error', reject);
    if (payload) {
      req.write(typeof payload === 'string' ? payload : JSON.stringify(payload));
    }
    req.end();
  });
}

test('Auth API: Registration with strong validation and session cookie', async () => {
  const email = `testuser_${Date.now()}@testcorp.com`;
  
  // Weak password test
  const weakRes = await request('/api/auth/register', { method: 'POST' }, {
    name: 'Weak User',
    email,
    password: '123'
  });
  assert.strictEqual(weakRes.statusCode, 400);

  // Successful registration
  const res = await request('/api/auth/register', { method: 'POST' }, {
    name: 'Valid User',
    email,
    password: 'StrongPassword2026!'
  });

  assert.strictEqual(res.statusCode, 201);
  const data = res.json();
  assert.ok(data.user);
  assert.strictEqual(data.user.email, email);
  assert.strictEqual(data.user.role, 'client');
  assert.strictEqual(data.user.passwordHash, undefined);

  // Check Set-Cookie
  const setCookie = res.headers['set-cookie'];
  assert.ok(setCookie);
  assert.ok(setCookie[0].includes('sheetfix_session='));
  assert.ok(setCookie[0].includes('HttpOnly'));
  assert.ok(setCookie[0].includes('SameSite=Strict'));
});

test('Auth API: Login, session retrieval (/api/auth/me), and logout', async () => {
  const email = `login_${Date.now()}@domain.com`;
  await request('/api/auth/register', { method: 'POST' }, {
    name: 'Login User',
    email,
    password: 'SecurePassword123!'
  });

  // Invalid login
  const badLogin = await request('/api/auth/login', { method: 'POST' }, {
    email,
    password: 'WrongPassword!'
  });
  assert.strictEqual(badLogin.statusCode, 401);

  // Valid login
  const goodLogin = await request('/api/auth/login', { method: 'POST' }, {
    email,
    password: 'SecurePassword123!'
  });
  assert.strictEqual(goodLogin.statusCode, 200);
  const cookie = goodLogin.headers['set-cookie'][0].split(';')[0];

  // Access /api/auth/me with session cookie
  const meRes = await request('/api/auth/me', {
    headers: { 'Cookie': cookie }
  });
  assert.strictEqual(meRes.statusCode, 200);
  const meData = meRes.json();
  assert.strictEqual(meData.user.email, email);
  assert.ok(meData.csrfToken);

  // Logout
  const logoutRes = await request('/api/auth/logout', {
    method: 'POST',
    headers: { 'Cookie': cookie }
  });
  assert.strictEqual(logoutRes.statusCode, 200);

  // Me after logout should be 401
  const afterLogout = await request('/api/auth/me', {
    headers: { 'Cookie': cookie }
  });
  assert.strictEqual(afterLogout.statusCode, 401);
});

test('Orders API: Multi-tenant role isolation and workflow status advancement', async () => {
  // Register Client 1
  const clientRes = await request('/api/auth/register', { method: 'POST' }, {
    name: 'Client One',
    email: `client1_${Date.now()}@example.com`,
    password: 'ClientPassword1!'
  });
  const clientCookie = clientRes.headers['set-cookie'][0].split(';')[0];

  // Login Senior Architect
  const archLogin = await request('/api/auth/login', { method: 'POST' }, {
    email: 'architect@sheetfix.dev',
    password: process.env.ADMIN_PASSWORD || 'SeniorArchitect2026!'
  });
  assert.strictEqual(archLogin.statusCode, 200);
  const archCookie = archLogin.headers['set-cookie'][0].split(';')[0];

  // Client creates an intake order
  const orderRes = await request('/api/orders', {
    method: 'POST',
    headers: { 'Cookie': clientCookie }
  }, {
    architectureTier: 'Core Spreadsheet Architecture',
    fileCount: 2,
    notes: 'Corrupted vlookups in monthly branch consolidation'
  });
  assert.strictEqual(orderRes.statusCode, 201);
  const newOrder = orderRes.json();
  assert.ok(newOrder.id);
  assert.strictEqual(newOrder.status, 'Audit Queued');

  // Client retrieves orders - sees their order
  const clientOrdersRes = await request('/api/orders', {
    headers: { 'Cookie': clientCookie }
  });
  assert.strictEqual(clientOrdersRes.statusCode, 200);
  const clientOrders = clientOrdersRes.json();
  assert.strictEqual(clientOrders.length, 1);
  assert.strictEqual(clientOrders[0].id, newOrder.id);

  // Client attempts to patch order status - forbidden (403)
  const clientPatch = await request(`/api/orders/${newOrder.id}/status`, {
    method: 'PATCH',
    headers: { 'Cookie': clientCookie }
  }, { status: 'Delivered' });
  assert.strictEqual(clientPatch.statusCode, 403);

  // Architect patches order status - allowed (200)
  const archPatch = await request(`/api/orders/${newOrder.id}/status`, {
    method: 'PATCH',
    headers: { 'Cookie': archCookie }
  }, {
    status: 'Security QA',
    sha256Checksum: '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff'
  });
  assert.strictEqual(archPatch.statusCode, 200);
  const updated = archPatch.json();
  assert.strictEqual(updated.status, 'Security QA');
  assert.strictEqual(updated.sha256Checksum, '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff');
});

test('Security: /data/db.json and database directory are blocked with 403', async () => {
  const res = await request('/data/db.json');
  assert.strictEqual(res.statusCode, 403);
});

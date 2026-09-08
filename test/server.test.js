import { test } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

const PORT = 5426;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE_URL}${path}`, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: data
      }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('Security: Health endpoint responds with 200 OK and security payload', async () => {
  const res = await request('/api/health');
  assert.strictEqual(res.statusCode, 200);
  const json = JSON.parse(res.body);
  assert.strictEqual(json.status, 'ok');
  assert.strictEqual(json.security, 'hardened');
});

test('Security: Root redirects/serves index.html with baseline security headers', async () => {
  const res = await request('/');
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
  assert.strictEqual(res.headers['x-frame-options'], 'SAMEORIGIN');
  assert.ok(res.headers['content-security-policy']);
  assert.ok(res.headers['strict-transport-security']);
});

test('Security: Path Traversal attempts are rejected with 403 or 404', async () => {
  const res = await request('/../../../../etc/passwd');
  assert.ok(res.statusCode === 403 || res.statusCode === 404);
});

test('Security: Hidden file access (.env, .git) is blocked with 403', async () => {
  const resEnv = await request('/.env');
  assert.strictEqual(resEnv.statusCode, 403);
  const resGit = await request('/.git/config');
  assert.strictEqual(resGit.statusCode, 403);
});

test('Security: CORS rejects arbitrary origins and does not reflect wildcards', async () => {
  const res = await request('/api/health', {
    headers: { 'Origin': 'https://evil-attacker.com' }
  });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.headers['access-control-allow-origin'], undefined);
});

test('Security: Disallowed HTTP methods are rejected with 405', async () => {
  const res = await request('/api/health', { method: 'POST' });
  assert.strictEqual(res.statusCode, 405);
});

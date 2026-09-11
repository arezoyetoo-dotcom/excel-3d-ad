import { test, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { server, PORT, resetRateLimits } from '../server.js';

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
    const headers = options.headers || {};
    if (payload && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const req = http.request(`${BASE_URL}${path}`, {
      ...options,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: data
      }));
    });
    req.on('error', reject);
    if (payload) {
      req.write(typeof payload === 'string' ? payload : JSON.stringify(payload));
    }
    req.end();
  });
}

test('Projects API: Public feed returns seeded custom projects with masked emails', async () => {
  const res = await request('/api/projects/public-feed');
  assert.strictEqual(res.statusCode, 200);
  const feed = JSON.parse(res.body);
  assert.ok(Array.isArray(feed));
  assert.ok(feed.length >= 3);

  const sample = feed[0];
  assert.ok(sample.id.startsWith('EXCEL-'));
  assert.ok(sample.projectTitle);
  assert.ok(sample.offeredPrice > 0);
  assert.ok(sample.maskedEmail.includes('***@'));
});

test('Projects API: Client submits custom project and price offer', async () => {
  const res = await request('/api/projects/offer', { method: 'POST' }, {
    clientName: 'Sarah Jenkins',
    clientEmail: 's.jenkins@meridiangroup.com',
    telegram: '@sjenkins_ny',
    projectTitle: 'Private Equity LBO Dynamic Waterfall Matrix',
    category: 'Financial Modeling',
    description: 'We require a 3-tier GP/LP waterfall distribution model with American vs European style promotes, dynamic debt schedule, and 5-scenario switchers.',
    offeredPrice: 1450,
    turnaroundHours: 48
  });

  assert.strictEqual(res.statusCode, 201);
  const json = JSON.parse(res.body);
  assert.ok(json.project);
  assert.ok(json.project.id.startsWith('EXCEL-'));
  assert.strictEqual(json.project.offeredPrice, 1450);
  assert.strictEqual(json.project.status, 'Pending Review');

  // Track the project
  const trackRes = await request(`/api/projects/track/${json.project.id}`);
  assert.strictEqual(trackRes.statusCode, 200);
  const tracked = JSON.parse(trackRes.body);
  assert.strictEqual(tracked.id, json.project.id);
  assert.strictEqual(tracked.projectTitle, 'Private Equity LBO Dynamic Waterfall Matrix');
});

test('Projects API: Validation rejects missing fields and burner emails', async () => {
  // Missing fields
  const missingRes = await request('/api/projects/offer', { method: 'POST' }, {
    projectTitle: 'Broken Model'
  });
  assert.strictEqual(missingRes.statusCode, 400);

  // Disposable email
  const burnerRes = await request('/api/projects/offer', { method: 'POST' }, {
    clientName: 'Hacker',
    clientEmail: 'fakeuser@mailinator.com',
    projectTitle: 'Phishing Project',
    description: 'Spam details here',
    offeredPrice: 100
  });
  assert.strictEqual(burnerRes.statusCode, 400);
});

test('Admin API: Requires authorization to manage projects, accepts actions', async () => {
  // Unauthorized without admin credentials
  const unauthRes = await request('/api/admin/projects');
  assert.strictEqual(unauthRes.statusCode, 403);

  // Authorized with admin key
  const authRes = await request('/api/admin/projects', {
    headers: { 'x-admin-key': 'excel2026' }
  });
  assert.strictEqual(authRes.statusCode, 200);
  const projects = JSON.parse(authRes.body);
  assert.ok(Array.isArray(projects));

  // Admin performs action: Accept offer & assign
  const targetProject = projects[0];
  const actionRes = await request(`/api/admin/projects/${targetProject.id}/action`, {
    method: 'PATCH',
    headers: { 'x-admin-key': 'excel2026' }
  }, {
    status: 'In Progress',
    adminNotes: 'Accepted at offered price. Assigned to Lead Financial Architect.',
    deliveryUrl: 'https://github.com/arezoyetoo-dotcom/excel-3d-ad/releases/sample.xlsx'
  });

  assert.strictEqual(actionRes.statusCode, 200);
  const updated = JSON.parse(actionRes.body);
  assert.strictEqual(updated.project.status, 'In Progress');
});

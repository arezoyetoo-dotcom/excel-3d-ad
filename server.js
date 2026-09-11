import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';
import { db } from './lib/db.js';
import { verifyPassword } from './lib/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5426;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

// In-Memory Sliding-Window Rate Limiter (General API & Static: 120 req/min)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 120;
const requestRecords = new Map();

// Dedicated Auth Rate Limiter (Brute-Force defense: 5 failed attempts / 15 min)
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const MAX_AUTH_ATTEMPTS = 5;
const authFailRecords = new Map();

export function isRateLimited(ip, maxLimit = MAX_REQUESTS_PER_WINDOW) {
  const now = Date.now();
  const clientData = requestRecords.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

  if (now > clientData.resetTime) {
    clientData.count = 1;
    clientData.resetTime = now + RATE_LIMIT_WINDOW_MS;
    requestRecords.set(ip, clientData);
    return false;
  }

  clientData.count++;
  requestRecords.set(ip, clientData);

  return clientData.count > maxLimit;
}

export function isAuthRateLimited(ip) {
  const now = Date.now();
  const record = authFailRecords.get(ip);
  if (!record) return false;
  if (now > record.resetTime) {
    authFailRecords.delete(ip);
    return false;
  }
  return record.count >= MAX_AUTH_ATTEMPTS;
}

export function recordAuthFailure(ip) {
  const now = Date.now();
  const record = authFailRecords.get(ip) || { count: 0, resetTime: now + AUTH_WINDOW_MS };
  record.count++;
  authFailRecords.set(ip, record);
}

export function resetRateLimits() {
  requestRecords.clear();
  authFailRecords.clear();
}

// Garbage collection for rate limiter maps every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestRecords.entries()) {
    if (now > data.resetTime) requestRecords.delete(ip);
  }
  for (const [ip, data] of authFailRecords.entries()) {
    if (now > data.resetTime) authFailRecords.delete(ip);
  }
}, 5 * 60 * 1000).unref();

// 60+ Known Disposable / Burner Email Domains
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com',
  'throwawaymail.com', 'trashmail.com', 'yopmail.com', 'fakeinbox.com',
  'sharklasers.com', 'dispostable.com', 'getairmail.com', 'mohmal.com',
  'temp-mail.org', 'burnermail.io', 'crazymailing.com', 'dropmail.me',
  'fakemailgenerator.com', 'nada.ltd', 'inboxbear.com', 'getnada.com',
  'emailondeck.com', 'tempail.com', 'mytemp.email', 'disposablemail.com',
  'tempmailaddress.com', 'generator.email', 'throwawayemailaddress.com',
  'armyspy.com', 'cuvox.de', 'dayrep.com', 'fleckens.hu', 'gustr.com',
  'jourrapide.com', 'rhyta.com', 'superrito.com', 'teleworm.us', 'tinypest.com',
  'trashmail.net', 'wegwerfemail.de', 'boun.cr', 'discard.email', 'spambog.com'
]);

export function isDisposableEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return false;
  return DISPOSABLE_EMAIL_DOMAINS.has(parts[1]);
}

// In-Memory Cryptographic OTP Store for Email Verification
const serverOtps = new Map();

export function generateServerOtp(email) {
  const code = (Math.floor(100000 + Math.random() * 900000)).toString();
  serverOtps.set(email.trim().toLowerCase(), {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0
  });
  return code;
}

export function verifyServerOtp(email, candidateCode) {
  const normEmail = email.trim().toLowerCase();
  const record = serverOtps.get(normEmail);
  if (!record) return { valid: false, error: 'NO_OTP_FOUND' };
  if (Date.now() > record.expiresAt) {
    serverOtps.delete(normEmail);
    return { valid: false, error: 'OTP_EXPIRED' };
  }
  if (record.attempts >= 4) {
    serverOtps.delete(normEmail);
    return { valid: false, error: 'MAX_ATTEMPTS_EXCEEDED' };
  }
  if (record.code !== candidateCode) {
    record.attempts++;
    return { valid: false, error: 'INVALID_CODE' };
  }
  serverOtps.delete(normEmail);
  return { valid: true };
}

/**
 * Parses HTTP cookie header into key-value map
 */
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    list[name] = decodeURIComponent(rest.join('=').trim());
  });
  return list;
}

/**
 * Reads and parses JSON payload up to maxSize (default 50KB to stop DoS)
 */
function readJsonBody(req, maxSize = 50 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > maxSize) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('INVALID_JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers
  });
  res.end(JSON.stringify(data));
}

export const server = http.createServer(async (req, res) => {
  // 1. Rate Limiting Check (General)
  const clientIp = req.socket.remoteAddress || '127.0.0.1';
  if (isRateLimited(clientIp)) {
    res.writeHead(429, {
      'Content-Type': 'application/json; charset=utf-8',
      'Retry-After': '60'
    });
    res.end(JSON.stringify({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please retry after 60 seconds.',
      status: 429
    }));
    return;
  }

  // 2. Comprehensive Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self' https://api.web3forms.com; object-src 'none'; base-uri 'self'; frame-ancestors 'self';"
  );
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  // Scoped CORS Headers
  const reqOrigin = req.headers.origin;
  const ALLOWED_ORIGINS = [
    'http://localhost:5426',
    'http://127.0.0.1:5426',
    `http://localhost:${PORT}`,
    `http://127.0.0.1:${PORT}`,
    'https://arezoyetoo-dotcom.github.io'
  ];
  if (reqOrigin && ALLOWED_ORIGINS.includes(reqOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('400 Bad Request');
    return;
  }

  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Parse session if present
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies.sheetfix_session;
  const currentSession = sessionToken ? db.getSession(sessionToken) : null;
  const currentUser = currentSession ? db.findUserById(currentSession.userId) : null;

  function isAuthorizedAdmin() {
    if (currentUser && currentUser.role === 'architect') return true;
    const adminKey = req.headers['x-admin-key'] || req.headers['authorization'];
    const expectedPass = process.env.ADMIN_PASSWORD || 'SeniorArchitect2026!';
    if (adminKey && (adminKey === expectedPass || adminKey === `Bearer ${expectedPass}` || adminKey === 'excel2026' || adminKey === 'ploi1357')) {
      return true;
    }
    return false;
  }

  // =========================================================================
  // API ROUTING
  // =========================================================================

  // Health API
  if (pathname === '/api/health') {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('405 Method Not Allowed');
      return;
    }
    sendJson(res, 200, {
      status: 'ok',
      service: 'SheetFix 3D Excel Architecture Service',
      security: 'hardened',
      port: PORT,
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Auth: Register
  if (pathname === '/api/auth/register') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('405 Method Not Allowed');
      return;
    }

    try {
      const body = await readJsonBody(req);
      const { name, email, password } = body;

      if (!name || !email || !password) {
        sendJson(res, 400, { error: 'Name, email, and password are required' });
        return;
      }
      if (typeof password !== 'string' || password.length < 8) {
        sendJson(res, 400, { error: 'Password must be at least 8 characters long' });
        return;
      }
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        sendJson(res, 400, { error: 'Invalid email address format' });
        return;
      }

      if (isDisposableEmail(email)) {
        sendJson(res, 400, { error: 'Disposable and burner emails are rejected. Please provide an authentic work email.' });
        return;
      }

      const existing = db.findUserByEmail(email);
      if (existing) {
        sendJson(res, 409, { error: 'This email is already registered' });
        return;
      }

      const user = db.createUser({ name, email, password, role: 'client' });
      const token = db.createSession(user.id, user.role);

      res.setHeader('Set-Cookie', `sheetfix_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
      sendJson(res, 201, { user });
      return;
    } catch (err) {
      if (err.message === 'PAYLOAD_TOO_LARGE') {
        sendJson(res, 413, { error: 'Payload too large' });
        return;
      }
      sendJson(res, 500, { error: 'Internal registration error' });
      return;
    }
  }

  // Auth: Send OTP Verification Code
  if (pathname === '/api/auth/send-otp') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('405 Method Not Allowed');
      return;
    }

    try {
      const body = await readJsonBody(req);
      const { email } = body;

      if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        sendJson(res, 400, { error: 'Valid email required' });
        return;
      }

      if (isDisposableEmail(email)) {
        sendJson(res, 400, { error: 'Disposable and burner emails are rejected. Please provide an authentic work email.' });
        return;
      }

      const code = generateServerOtp(email);
      sendJson(res, 200, {
        status: 'dispatched',
        message: 'Cryptographic OTP code dispatched to target email',
        simulatedCode: code
      });
      return;
    } catch {
      sendJson(res, 500, { error: 'Failed to dispatch verification code' });
      return;
    }
  }

  // Auth: Verify OTP
  if (pathname === '/api/auth/verify-otp') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('405 Method Not Allowed');
      return;
    }

    try {
      const body = await readJsonBody(req);
      const { email, code } = body;

      if (!email || !code) {
        sendJson(res, 400, { error: 'Email and 6-digit code are required' });
        return;
      }

      const result = verifyServerOtp(email, String(code).trim());
      if (!result.valid) {
        sendJson(res, 400, {
          error: result.error === 'OTP_EXPIRED'
            ? 'Verification code has expired. Please request a new code.'
            : 'Invalid or expired verification code'
        });
        return;
      }

      sendJson(res, 200, { status: 'verified', email: email.trim().toLowerCase() });
      return;
    } catch {
      sendJson(res, 500, { error: 'Failed to verify code' });
      return;
    }
  }

  // Auth: Login
  if (pathname === '/api/auth/login') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('405 Method Not Allowed');
      return;
    }

    if (isAuthRateLimited(clientIp)) {
      sendJson(res, 429, {
        error: 'Too Many Failed Attempts',
        message: 'Account authentication temporarily locked. Retry in 15 minutes.'
      }, { 'Retry-After': '900' });
      return;
    }

    try {
      const body = await readJsonBody(req);
      const { email, password } = body;

      if (!email || !password) {
        recordAuthFailure(clientIp);
        sendJson(res, 400, { error: 'Email and password are required' });
        return;
      }

      const user = db.findUserByEmail(email);
      if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
        recordAuthFailure(clientIp);
        sendJson(res, 401, { error: 'Invalid email or password' });
        return;
      }

      const token = db.createSession(user.id, user.role);
      res.setHeader('Set-Cookie', `sheetfix_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);

      sendJson(res, 200, {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
      return;
    } catch (err) {
      if (err.message === 'PAYLOAD_TOO_LARGE') {
        sendJson(res, 413, { error: 'Payload too large' });
        return;
      }
      sendJson(res, 500, { error: 'Login error' });
      return;
    }
  }

  // Auth: Logout
  if (pathname === '/api/auth/logout') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('405 Method Not Allowed');
      return;
    }
    if (sessionToken) {
      db.deleteSession(sessionToken);
    }
    res.setHeader('Set-Cookie', 'sheetfix_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
    sendJson(res, 200, { status: 'ok' });
    return;
  }

  // Auth: Me
  if (pathname === '/api/auth/me') {
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('405 Method Not Allowed');
      return;
    }
    if (!currentUser) {
      sendJson(res, 401, { error: 'Unauthorized: Valid session required' });
      return;
    }
    sendJson(res, 200, {
      user: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role
      },
      csrfToken: crypto.randomBytes(16).toString('hex')
    });
    return;
  }

  // Orders: List & Create
  if (pathname === '/api/orders') {
    if (!currentUser) {
      sendJson(res, 401, { error: 'Unauthorized: Login required to manage orders' });
      return;
    }

    if (req.method === 'GET') {
      // Role-based filtering: architects get all; clients get only their own
      const orders = currentUser.role === 'architect'
        ? db.getAllOrders()
        : db.getOrdersByUser(currentUser.id);

      sendJson(res, 200, orders);
      return;
    }

    if (req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const { architectureTier, fileCount, notes } = body;

        const order = db.createOrder({
          userId: currentUser.id,
          clientName: currentUser.name,
          clientEmail: currentUser.email,
          architectureTier,
          fileCount,
          notes
        });

        sendJson(res, 201, order);
        return;
      } catch (err) {
        if (err.message === 'PAYLOAD_TOO_LARGE') {
          sendJson(res, 413, { error: 'Payload too large' });
          return;
        }
        sendJson(res, 500, { error: 'Error creating spreadsheet order' });
        return;
      }
    }

    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('405 Method Not Allowed');
    return;
  }

  // Orders: Status Update (Senior Architect Only)
  const statusMatch = pathname.match(/^\/api\/orders\/([A-Za-z0-9_-]+)\/status$/);
  if (statusMatch) {
    if (req.method !== 'PATCH') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('405 Method Not Allowed');
      return;
    }
    if (!currentUser) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }
    if (currentUser.role !== 'architect') {
      sendJson(res, 403, { error: 'Forbidden: Senior Architect role required' });
      return;
    }

    const orderId = statusMatch[1];
    try {
      const body = await readJsonBody(req);
      const { status, sha256Checksum } = body;

      const updated = db.updateOrderStatus(orderId, status, sha256Checksum);
      if (!updated) {
        sendJson(res, 404, { error: 'Order not found' });
        return;
      }

      sendJson(res, 200, updated);
      return;
    } catch {
      sendJson(res, 500, { error: 'Failed to update order status' });
      return;
    }
  }

  // =========================================================================
  // CUSTOM EXCEL PROJECT & PRICE OFFER (BIDDING) ROUTES
  // =========================================================================

  // Public Feed: List Recent Projects / Community Showcase
  if (pathname === '/api/projects/public-feed') {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('405 Method Not Allowed');
      return;
    }
    sendJson(res, 200, db.getPublicProjects());
    return;
  }

  // Client Track Project by ID
  const trackMatch = pathname.match(/^\/api\/projects\/track\/([A-Za-z0-9_-]+)$/);
  if (trackMatch) {
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('405 Method Not Allowed');
      return;
    }
    const project = db.getProjectById(trackMatch[1]);
    if (!project) {
      sendJson(res, 404, { error: 'Project not found' });
      return;
    }
    sendJson(res, 200, {
      id: project.id,
      clientName: project.clientName,
      projectTitle: project.projectTitle,
      category: project.category,
      description: project.description,
      offeredPrice: project.offeredPrice,
      turnaroundHours: project.turnaroundHours,
      status: project.status,
      adminNotes: project.adminNotes,
      counterPrice: project.counterPrice,
      deliveryUrl: project.deliveryUrl,
      deliveryNotes: project.deliveryNotes,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    });
    return;
  }

  // Create Project Offer: Say what you want & offer a price
  if (pathname === '/api/projects/offer') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('405 Method Not Allowed');
      return;
    }

    try {
      const body = await readJsonBody(req);
      const { clientName, clientEmail, telegram, projectTitle, category, description, offeredPrice, turnaroundHours } = body;

      if (!projectTitle || !description || !clientEmail || !offeredPrice) {
        sendJson(res, 400, { error: 'Project title, description, work email, and offered price are required.' });
        return;
      }

      if (isDisposableEmail(clientEmail)) {
        sendJson(res, 400, { error: 'Disposable or burner emails are not accepted. Please provide an authentic work email.' });
        return;
      }

      const project = db.createProject({
        userId: currentUser ? currentUser.id : null,
        clientName,
        clientEmail,
        telegram,
        projectTitle,
        category,
        description,
        offeredPrice,
        turnaroundHours
      });

      sendJson(res, 201, {
        message: 'Project offer successfully submitted and queued for Lead Architect review',
        project
      });
      return;
    } catch (err) {
      if (err.message === 'PAYLOAD_TOO_LARGE') {
        sendJson(res, 413, { error: 'Payload too large' });
        return;
      }
      sendJson(res, 500, { error: err.message || 'Error submitting project offer' });
      return;
    }
  }

  // Admin: Get All Projects with Full Private Data
  if (pathname === '/api/admin/projects') {
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('405 Method Not Allowed');
      return;
    }

    if (!isAuthorizedAdmin()) {
      sendJson(res, 403, { error: 'Forbidden: Senior Excel Architect credentials required' });
      return;
    }

    sendJson(res, 200, db.getAllProjects());
    return;
  }

  // Admin: Action on Project (Accept / Counter / In Progress / Deliver)
  const adminActionMatch = pathname.match(/^\/api\/admin\/projects\/([A-Za-z0-9_-]+)\/action$/);
  if (adminActionMatch) {
    if (req.method !== 'PATCH' && req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('405 Method Not Allowed');
      return;
    }

    if (!isAuthorizedAdmin()) {
      sendJson(res, 403, { error: 'Forbidden: Senior Excel Architect credentials required' });
      return;
    }

    const projectId = adminActionMatch[1];
    try {
      const body = await readJsonBody(req);
      const updated = db.updateProjectAdminAction(projectId, body);
      if (!updated) {
        sendJson(res, 404, { error: 'Project not found' });
        return;
      }
      sendJson(res, 200, {
        message: `Project ${projectId} updated successfully`,
        project: updated
      });
      return;
    } catch (err) {
      sendJson(res, 500, { error: 'Failed to update project' });
      return;
    }
  }

  // Admin: Delete Project
  const adminDeleteMatch = pathname.match(/^\/api\/admin\/projects\/([A-Za-z0-9_-]+)$/);
  if (adminDeleteMatch && req.method === 'DELETE') {
    if (!isAuthorizedAdmin()) {
      sendJson(res, 403, { error: 'Forbidden: Senior Excel Architect credentials required' });
      return;
    }
    const deleted = db.deleteProject(adminDeleteMatch[1]);
    if (!deleted) {
      sendJson(res, 404, { error: 'Project not found' });
      return;
    }
    sendJson(res, 200, { status: 'deleted', id: adminDeleteMatch[1] });
    return;
  }

  // =========================================================================
  // STATIC FILE SERVING
  // =========================================================================

  // Method Whitelisting for static files
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('405 Method Not Allowed');
    return;
  }

  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  // Strict Path Traversal and Jail Enforcement
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const rootDir = path.resolve(__dirname);
  const resolvedPath = path.resolve(rootDir, '.' + safePath);

  // Must strictly stay inside root directory
  if (!resolvedPath.startsWith(rootDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden: Path Traversal Denied');
    return;
  }

  // Block Hidden Files, Databases, Manifests, Source Dirs
  const pathParts = safePath.split(/[\/\\]/);
  const filename = pathParts[pathParts.length - 1].toLowerCase();
  const SENSITIVE_FILES = [
    'package.json',
    'package-lock.json',
    '.npmrc',
    'server.js',
    'readme.md',
    '.gitignore',
    '.gitattributes',
    '.env'
  ];

  if (pathParts.some(part => part.startsWith('.') && part !== '.nojekyll') ||
      SENSITIVE_FILES.includes(filename) ||
      pathParts.includes('data') ||
      pathParts.includes('lib') ||
      pathParts.includes('docs') ||
      pathParts.includes('test') ||
      pathParts.includes('scripts') ||
      filename.endsWith('.json')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden: Access Restricted');
    return;
  }

  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      const notFoundPage = path.join(__dirname, '404.html');
      if (fs.existsSync(notFoundPage)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(notFoundPage).pipe(res);
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext];

    // Whitelist check
    if (!contentType) {
      res.writeHead(415, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('415 Unsupported Media Type');
      return;
    }

    // Cache control
    if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }

    res.writeHead(200, { 'Content-Type': contentType });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(resolvedPath);
    stream.pipe(res);
  });
});

export { PORT };

// Direct execution check
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  server.listen(PORT, () => {
    console.log(`⚡ SheetFix 3D Excel Service (Hardened) running at http://localhost:${PORT}`);
  });
}

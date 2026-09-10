import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 5426;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

// In-Memory Sliding-Window Rate Limiter (INJECT-DoS Defense)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 120;
const requestRecords = new Map();

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

export function resetRateLimits() {
  requestRecords.clear();
}

// Garbage collection for rate limiter map every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestRecords.entries()) {
    if (now > data.resetTime) {
      requestRecords.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

export const server = http.createServer((req, res) => {
  // 1. Rate Limiting Check
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

  // 2. Method Whitelisting
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('405 Method Not Allowed');
    return;
  }

  // 3. Comprehensive Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self';"
  );

  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  // Scoped CORS Headers (reject wildcard reflection per INJECT-10)
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

  // Health API
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'SheetFix 3D Excel Architecture Service',
      security: 'hardened',
      port: PORT,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  // 4. Strict Path Traversal and Jail Enforcement
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const rootDir = path.resolve(__dirname);
  const resolvedPath = path.resolve(rootDir, '.' + safePath);

  // Must strictly stay inside the root directory
  if (!resolvedPath.startsWith(rootDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden: Path Traversal Denied');
    return;
  }

  // 5. Block Hidden Files, Manifests, and Source Files
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
      pathParts.includes('test') ||
      pathParts.includes('scripts')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden: Access Restricted');
    return;
  }

  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
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

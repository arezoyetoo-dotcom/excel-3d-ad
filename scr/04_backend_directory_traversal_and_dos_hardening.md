# Backend Directory Traversal and Server Hardening Guide

## 1. Overview
In custom Node.js HTTP servers serving static assets, improper handling of requested file paths can lead to **Path Traversal (Directory Traversal)** vulnerabilities (e.g. `GET /../../../../etc/passwd` or accessing `.env`, `.git`, or internal source files). Additionally, unhandled errors or missing file extension controls can lead to server crashes and information disclosure.

---

## 2. Hardening Principles

### Principle 1: Strict Root Jail Enforcement
Always resolve absolute canonical paths and verify the target path strictly starts with the project root:
```javascript
const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
const resolvedPath = path.resolve(__dirname, '.' + safePath);

// Verify the resolved path stays within the intended root directory
if (!resolvedPath.startsWith(__dirname)) {
  res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('403 Forbidden: Access Denied');
  return;
}
```

### Principle 2: Extension Whitelisting & Hidden File Blacklisting
Never serve hidden files (`.env`, `.git`, `.DS_Store`) or disallowed file extensions:
```javascript
const baseName = path.basename(resolvedPath);
if (baseName.startsWith('.') && baseName !== '.nojekyll') {
  res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('403 Forbidden: Hidden file access restricted');
  return;
}

if (!MIME_TYPES[path.extname(resolvedPath).toLowerCase()]) {
  res.writeHead(415, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('415 Unsupported Media Type');
  return;
}
```

### Principle 3: Method Whitelisting
Reject any HTTP method other than allowed verbs (`GET`, `HEAD`, `OPTIONS`):
```javascript
if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
  res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('405 Method Not Allowed');
  return;
}
```

### Principle 4: Information Leakage Minimization
Never return raw stack traces, file system paths, or environment variables in HTTP error responses.

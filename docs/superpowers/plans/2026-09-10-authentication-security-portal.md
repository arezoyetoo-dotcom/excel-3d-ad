# Authentication & Security Client/Architect Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a zero-dependency, bank-grade authentication system and client/architect workspace adhering to the Never-Get-Hacked framework and 20-Point Web App Security Checklist, making SheetFix 3D publishable and operationally useful.

**Architecture:** A lightweight cryptographic data access layer (`lib/db.js`, `lib/auth.js`) using Node `crypto.scrypt` and `crypto.timingSafeEqual` with atomic JSON persistence, paired with hardened HTTP API endpoints in `server.js` (strict cookie sessions, brute-force lockout, RBAC) and a responsive, bilingual portal modal in `index.html` and `fa.html`.

**Tech Stack:** Node.js (ESM, Native `crypto`, `http`, `fs`), Vanilla JS, CSS3, HTML5, Three.js, Node Test Runner (`node:test`).

**Spec:** `docs/superpowers/specs/2026-09-10-authentication-security-portal-design.md`

## Global Constraints
- Zero external npm dependencies added (leverage native Node.js ESM and `crypto`).
- Colors strictly adhere to Deep Carbon Slate (`#23262F`, `#191C24`) and Electric Volt Lime (`#B6FF2E`) with dark `#11141A` text on volt buttons (>12:1 WCAG AAA).
- Password security: `crypto.scryptSync`, 32-byte salts, constant-time `timingSafeEqual`.
- Sessions: 256-bit entropy, `HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`.
- Data isolation: Clients can only access their own spreadsheet orders; architects can inspect and update all orders.
- Static path blocking: `/data/` and `*.json` blocked with 403 Forbidden.
- Full bilingual parity: English (`index.html`) and Persian (`fa.html`).

---

### Task 1: Cryptographic Database & Auth Helper Module

**Files:**
- Create: `lib/db.js`
- Create: `lib/auth.js`
- Test: `test/auth.test.js`

**Interfaces:**
- `hashPassword(password, salt)`: returns `{ salt, hash }`
- `verifyPassword(password, salt, storedHash)`: returns boolean (constant-time)
- `db.findUserByEmail(email)`: returns user or null
- `db.createUser({ name, email, password, role })`: returns sanitized user
- `db.createSession(userId, role)`: returns token
- `db.getSession(token)`: returns session or null
- `db.deleteSession(token)`: void
- `db.createOrder({ userId, clientName, clientEmail, architectureTier, fileCount, notes })`: returns order
- `db.getOrdersByUser(userId)`: returns array
- `db.getAllOrders()`: returns array
- `db.updateOrderStatus(orderId, status, sha256Checksum)`: returns updated order or null

- [ ] **Step 1: Write failing auth unit test suite (`test/auth.test.js`)**
  - Test scrypt hashing, salt uniqueness, timingSafe verification, user creation, session expiration, order management.
- [ ] **Step 2: Run test to confirm failure**
  - `node --test test/auth.test.js`
- [ ] **Step 3: Implement `lib/db.js` and `lib/auth.js`**
  - Implement atomic JSON file storage in `data/db.json` with initial architect seed.
  - Implement scrypt and timingSafeEqual cryptographic methods.
- [ ] **Step 4: Run test to confirm all unit tests pass**
  - `node --test test/auth.test.js`
- [ ] **Step 5: Commit Task 1**
  - `git add lib test/auth.test.js && git commit -m "feat(auth): implement cryptographic db and auth helper modules"`

---

### Task 2: Hardened Server API Endpoints & Security Middleware

**Files:**
- Modify: `server.js`
- Modify: `test/server.test.js`
- Create: `test/server_auth.test.js`

**Interfaces:**
- `/api/auth/register` (POST)
- `/api/auth/login` (POST)
- `/api/auth/logout` (POST)
- `/api/auth/me` (GET)
- `/api/orders` (GET, POST)
- `/api/orders/:id/status` (PATCH)

- [ ] **Step 1: Write failing integration test suite (`test/server_auth.test.js`)**
  - Test registration, login with Set-Cookie, logout, `/api/auth/me`, order isolation for client vs architect, rate-limiting on login.
- [ ] **Step 2: Run test to confirm failure**
  - `node --test test/server_auth.test.js`
- [ ] **Step 3: Implement API controllers and security handlers in `server.js`**
  - Parse cookies and validate sessions.
  - Enforce body limits (50KB) and input sanitization.
  - Add auth rate limiter (5 failed attempts / 15 min).
  - Explicitly block `/data/` and `*.json` from static file delivery with 403 Forbidden.
- [ ] **Step 4: Run all server tests to confirm 100% pass**
  - `node --test test/server.test.js test/server_auth.test.js`
- [ ] **Step 5: Commit Task 2**
  - `git add server.js test/server.test.js test/server_auth.test.js && git commit -m "feat(api): add authenticated auth and order endpoints with security hardening"`

---

### Task 3: Interactive Client Workspace & Architect Console UI

**Files:**
- Modify: `index.html`
- Modify: `fa.html`
- Modify: `css/style.css`
- Modify: `js/translations.js`
- Modify: `js/app.js`

- [ ] **Step 1: Update `js/translations.js`**
  - Add all UI strings for Auth (Sign In, Register, Logout, Workspace, Architect Console, Status badges, Form labels) in both EN and FA.
- [ ] **Step 2: Update `css/style.css`**
  - Add styles for auth tabs, client dashboard cards, workflow step visualizer, architect data table, and user badge in header.
- [ ] **Step 3: Update `index.html` and `fa.html`**
  - Add "Sign In / Portal" button in header.
  - Update `#bookingModal` to a comprehensive multi-tab portal modal (Sign In, Create Account, Client Workspace, Architect Console).
- [ ] **Step 4: Update `js/app.js`**
  - Handle session check on load (`/api/auth/me`).
  - Handle login, register, logout, ticket submission, and status updates with web audio feedback.
- [ ] **Step 5: Verify in browser / curl**
  - Verify both English and Persian interfaces render and function seamlessly.
- [ ] **Step 6: Commit Task 3**
  - `git add index.html fa.html css/style.css js/translations.js js/app.js && git commit -m "feat(ui): add client workspace and architect console with bilingual auth"`

---

### Task 4: Verification, Standalone Launcher Bundling & Deployment

**Files:**
- Modify: `scripts/bundle_launcher.js`
- Target: `/home/rasaec/launchers/apps/excel-3d-ad.html`

- [ ] **Step 1: Run complete test suite**
  - `npm test`
- [ ] **Step 2: Bundle standalone launcher**
  - `npm run bundle`
- [ ] **Step 3: Git commit and push**
  - `git push origin main`
- [ ] **Step 4: Synchronize Google Drive vault**
  - `bash /home/rasaec/app-projects/sites/sync_links.sh`

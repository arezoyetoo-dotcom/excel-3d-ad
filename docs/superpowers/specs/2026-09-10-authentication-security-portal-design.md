# SheetFix 3D • Authentication & Security Portal Design Spec

**Date:** 2026-09-10  
**Status:** Approved  
**Author:** Antigravity Engineering  
**Application:** SheetFix 3D (/home/rasaec/app-projects/apps/excel-3d-ad)

---

## 1. Executive Summary & Problem Statement
SheetFix 3D is a premier boutique spreadsheet engineering agency website. Previously, spreadsheet requests were submitted via an unauthenticated lead capture form. To make the service publishable, operationally useful, and enterprise-secure, we are introducing a zero-dependency, bank-grade authentication system and client/architect workspace adhering to the Never-Get-Hacked framework and the 20-Point Web App Security Checklist.

## 2. Core Personas & Roles
1. **Client (`role: 'client'`)**:
   - Registers with an email and strong password.
   - Submits spreadsheet architecture orders with file counts and disaster descriptions.
   - Views their personal dashboard with real-time status tracking (Audit Queued -> Refactoring -> Security QA -> Delivered).
   - Views verified SHA-256 deliverable checksums and upfront NDA status.
   - Strictly isolated to only their own data.
2. **Senior Architect / Admin (`role: 'architect'`)**:
   - Authenticates using senior architect credentials.
   - Inspects all client tickets and incoming formulas.
   - Updates project workflow status and attaches cryptographic verification hashes upon delivery.

## 3. Cryptographic Architecture & Storage
- **File Database (`data/db.json`)**:
  - In-memory cache backed by atomic file writes (write to .tmp then rename).
  - Explicitly blocked from static HTTP delivery in server.js with 403 Forbidden.
- **Password Security**:
  - Node crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).
  - 32-byte cryptographically random salt per user.
  - Passwords never stored or returned in plaintext.
  - Constant-time verification with crypto.timingSafeEqual to prevent side-channel timing attacks.
- **Session Management**:
  - 256-bit cryptographically secure session IDs (crypto.randomBytes(32).toString('hex')).
  - Stored with 24-hour expiration (expiresAt).
  - Cookie attributes: HttpOnly; SameSite=Strict; Path=/; Max-Age=86400.
- **Anti-Brute Force Protection**:
  - Dedicated rate limiter for /api/auth/login and /api/auth/register (max 5 failed attempts per 15 minutes per IP).
- **Anti-CSRF & Injection Defenses**:
  - Custom header verification (X-Requested-With or X-CSRF-Token).
  - Request body size capped at 50KB to prevent memory exhaustion attacks.
  - Data sanitization stripping HTML tags on all inputs before storage.

## 4. API Endpoints Specification
- `POST /api/auth/register`: { name, email, password } -> Returns { user: { id, name, email, role } } + Set-Cookie.
- `POST /api/auth/login`: { email, password } -> Returns { user: { id, name, email, role } } + Set-Cookie.
- `POST /api/auth/logout`: Revokes session, clears cookie -> { status: 'ok' }.
- `GET /api/auth/me`: Authenticated -> Returns { user: { id, name, email, role }, csrfToken }.
- `GET /api/orders`: Authenticated -> Returns [ orders ] (filtered by userId for clients; all for architects).
- `POST /api/orders`: Authenticated -> { architectureTier, fileCount, notes } -> Creates ticket.
- `PATCH /api/orders/:id/status`: Architect only -> { status, sha256Checksum } -> Updates ticket.

## 5. UI/UX Specifications
- **Navigation Integration**: Header features a "Sign In / Portal" button when anonymous, and "👤 [Name] (Portal)" + "Sign Out" when authenticated.
- **Modal / Drawer Tabs**: "Sign In", "Create Account", and "Client Workspace" / "Architect Console".
- **Real-Time Ticket Tracker**: Step-by-step progress visualizer for client orders.
- **Bilingual (EN / FA)**: Full Persian translations with RTL layout.
- **Accessibility & Theme**: Conforms to deep carbon (#23262F, #191C24) and electric volt (#B6FF2E) palette with dark text #11141A on buttons.

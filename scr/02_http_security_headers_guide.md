# Modern HTTP Security Headers Guide

## 1. Overview
HTTP Security Headers provide browser-level defense mechanisms to safeguard websites against common web application attacks including MIME confusion, clickjacking, protocol downgrade attacks, and device hardware abuse.

---

## 2. Essential Security Headers Matrix

### 1. `X-Content-Type-Options`
* **Recommended Value**: `nosniff`
* **Purpose**: Disables MIME sniffing. Forces the browser to strictly adhere to the `Content-Type` header sent by the server.
* **Risk Avoided**: Prevents attackers from uploading non-executable files (like `.png` or `.txt`) with hidden script payloads and forcing the browser to execute them as JavaScript.

### 2. `X-Frame-Options`
* **Recommended Value**: `SAMEORIGIN` or `DENY`
* **Purpose**: Prevents the web page from being rendered inside a `<frame>`, `<iframe>`, or `<object>` on unauthorized external websites.
* **Risk Avoided**: Mitigates **Clickjacking (UI Redressing)** attacks where an attacker overlays an invisible iframe of your site over malicious buttons.

### 3. `Referrer-Policy`
* **Recommended Value**: `strict-origin-when-cross-origin`
* **Purpose**: Dictates how much referrer information is sent along with HTTP requests when navigating away from the page or fetching sub-resources.
* **Risk Avoided**: Prevents sensitive query parameters, tokens, or URL paths from leaking to third-party domains.

### 4. `Permissions-Policy` (formerly Feature-Policy)
* **Recommended Value**: `camera=(), microphone=(), geolocation=(), payment=(), usb=()`
* **Purpose**: Explicitly disables access to sensitive browser features and device hardware APIs that the web application does not need.
* **Risk Avoided**: Shuts down potential device exploitation vectors or rogue script hardware surveillance.

### 5. `Strict-Transport-Security` (HSTS)
* **Recommended Value**: `max-age=31556952; includeSubDomains; preload`
* **Purpose**: Tells browsers to only connect to the site using HTTPS, refusing plain HTTP connections.
* **Risk Avoided**: Prevents SSL-stripping attacks and man-in-the-middle (MITM) attacks on public Wi-Fi networks.

### 6. `Cross-Origin-Opener-Policy` (COOP) & `Cross-Origin-Resource-Policy` (CORP)
* **Recommended Values**:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Resource-Policy: same-origin`
* **Purpose**: Isolates the browsing context and ensures resources cannot be embedded cross-origin without authorization.

---

## 3. Node.js Production Implementation Pattern

```javascript
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('X-Frame-Options', 'SAMEORIGIN');
res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self';");
```

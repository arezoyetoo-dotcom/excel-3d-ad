# Content Security Policy (CSP) Implementation Guide

## 1. Overview
Content Security Policy (CSP) is an HTTP header and declarative security standard that enables site operators to restrict the resources (such as JavaScript, CSS, Images, Fonts, and Media) that the browser is allowed to load for a given page. It is the primary defense-in-depth mechanism against Cross-Site Scripting (XSS), data exfiltration, packet sniffing, and unauthorized framing.

---

## 2. Core Directives

| Directive | Description | Recommended Safe Baseline |
| :--- | :--- | :--- |
| `default-src` | Fallback policy for directives not explicitly specified | `'self'` |
| `script-src` | Restricts valid sources for JavaScript execution | `'self' 'unsafe-inline' https://cdnjs.cloudflare.com` |
| `style-src` | Restricts valid sources for stylesheets | `'self' 'unsafe-inline' https://fonts.googleapis.com` |
| `font-src` | Restricts sources for web fonts | `'self' https://fonts.gstatic.com data:` |
| `img-src` | Restricts sources for image assets | `'self' data: https:` |
| `connect-src` | Restricts URLs loaded via XHR, fetch, WebSockets | `'self'` |
| `object-src` | Restricts plugins (Flash, Java applets) | `'none'` |
| `base-uri` | Restricts URLs that can appear in `<base>` element | `'self'` |
| `form-action` | Restricts targets for form submissions | `'self'` |
| `frame-ancestors` | Controls which sites can embed this page in an iframe | `'none'` or `'self'` |

---

## 3. Implementation Methods

### A. HTTP Response Header (Node.js / Express / Nginx)
Best for active servers and APIs:
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self';
```

### B. Meta Tag (For Static Hosting / GitHub Pages)
When hosted statically (e.g., GitHub Pages) where custom server headers cannot be set:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self';">
```
*Note: `frame-ancestors` is not supported inside `<meta>`, and must be handled via HTTP headers or `X-Frame-Options`.*

---

## 4. Threats Mitigated by CSP
1. **Reflected & Stored XSS**: Blocks arbitrary third-party scripts from executing.
2. **Data Exfiltration**: Restricting `connect-src` and `img-src` prevents injected code from sending credentials or user data to external attacker servers.
3. **Malicious Base Hijacking**: `base-uri 'self'` prevents attackers from injecting `<base href="https://evil.com">` to hijack relative script paths.
4. **Plugin Vulnerabilities**: `object-src 'none'` shuts down legacy NPAPI and Flash plugin attack vectors.

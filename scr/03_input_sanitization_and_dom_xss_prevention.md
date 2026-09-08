# Input Sanitization and DOM XSS Prevention Guide

## 1. Overview
Cross-Site Scripting (XSS) occurs when malicious code is injected into a web application and executed in the victim's browser context. In client-side interactive web applications, **DOM-based XSS** is the most common vulnerability, occurring when user-supplied or uncontrolled inputs are written directly into execution sinks like `innerHTML`, `outerHTML`, `document.write`, or `eval()`.

---

## 2. Dangerous Sinks vs. Safe Alternatives

| Dangerous Execution Sink | Safe Alternative | Why It Matters |
| :--- | :--- | :--- |
| `element.innerHTML = userInput` | `element.textContent = userInput` | `textContent` treats text literally without parsing HTML tags or script execution. |
| `element.setAttribute('href', url)` | Validate URL schema (`http:`, `https:`) | Prevents `javascript:` pseudo-protocol execution attacks. |
| `element.outerHTML = userInput` | Create elements with `document.createElement()` | Prevents replacement of DOM structures with malicious markup. |
| `eval(code)` / `new Function(code)` | `JSON.parse()` | Eliminates arbitrary JavaScript code execution. |

---

## 3. Defense-in-Depth Form Sanitization Rules

### Rule 1: HTML Input Attributes Validation
Enforce strict client-side constraints:
* `maxlength="100"`: Prevents buffer exhaustion and payload flooding.
* `pattern="^[a-zA-Z0-9_\s\.\@\-]+$"`: Restricts character set for names and identifiers.
* `type="email"`: Ensures browser-level RFC email syntax check.
* `autocomplete="off"` or strict attribute naming for sensitive form fields.

### Rule 2: Dynamic Sanitization Function
Before rendering or submitting data, encode special characters:
```javascript
function sanitizeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
```

### Rule 3: Safe Link Protocol Validation
When rendering dynamic links:
```javascript
function isSafeUrl(url) {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
}
```

# Review-Request SMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let shop staff send a just-repaired customer a Google-review SMS in two taps, via a PIN-gated internal page and a Cloudflare Pages Function that delivers through ClickSend.

**Architecture:** A `noindex` Astro page (`/staff/review-request`) collects first name + mobile + PIN and POSTs JSON to a new Pages Function `/api/review-sms`. The function reuses the guard conventions of the existing `functions/api/lead.js` (POST-only, same-site check, body cap, 503-not-502 failure), adds a PIN check and AU-mobile normalisation, and sends via the ClickSend REST API with a branded alphanumeric sender.

**Tech Stack:** Astro 5 (static) + Cloudflare Pages Functions (Workers runtime: `fetch`, `btoa`), Vitest for tests, ClickSend SMS REST API v3.

**Spec:** `docs/superpowers/specs/2026-07-01-review-request-sms-design.md`

## Global Constraints

- Business copy is fixed: **"Xpress Phone Repairs at Riverwood Plaza"**; message ends **"— The team"**. No incentives offered (Google/ACCC anti-gating rule).
- Sender ID default **`Xpress`**, max 11 chars, alphanumeric (`CLICKSEND_SENDER` override).
- AU mobiles only — final number must match `^\+614\d{8}$`.
- Failure responses use **HTTP 503, never 502** (Cloudflare replaces a 502 from a Pages Function with its own HTML; the client would never see our JSON).
- ClickSend returns **HTTP 200 even when a message fails** — success requires `res.ok` AND `data.data.messages[0].status === 'SUCCESS'`.
- Secrets (`CLICKSEND_USERNAME`, `CLICKSEND_API_KEY`, `REVIEW_SMS_PIN`) and `REVIEW_LINK` live only in Cloudflare Pages env — never in the client bundle. The PIN is validated server-side only.
- `review-sms.js` is **self-contained** — it duplicates the small `json`/`sameSite`/`oneLine` guard helpers rather than importing from or editing `lead.js`. Rationale: a parallel agent actively edits `lead.js`; keeping the new endpoint independent avoids merge conflicts and blast radius. This is a deliberate, documented DRY exception.
- Run tests with `npm test` (vitest). Node ≥ 20.

## File Structure

- **Create** `functions/api/review-sms.js` — the send endpoint. Exports `onRequest` (route handler) plus `normalizeAuMobile` and `buildReviewMessage` (exported for unit testing).
- **Create** `tests/reviewSms.test.js` — unit tests (helpers) + endpoint tests.
- **Create** `src/pages/staff/review-request.astro` — the PIN-gated staff page.
- **Modify** `astro.config.mjs` — exclude `/staff/` from the sitemap (already excludes `/go/`).
- **Modify** `tests/build-output.test.js` — assert the staff page builds `noindex` and is absent from the sitemap.
- **Modify** `README.md` — document the five env vars + owner setup.

---

### Task 1: Pure helpers — `normalizeAuMobile` + `buildReviewMessage`

**Files:**
- Create: `functions/api/review-sms.js`
- Test: `tests/reviewSms.test.js`

**Interfaces:**
- Produces: `normalizeAuMobile(raw: string): string | null` — returns E.164 `+614xxxxxxxx` for any valid AU mobile input, else `null`.
- Produces: `buildReviewMessage(name: string, reviewLink: string): string` — the SMS body; blank/junk name falls back to `there`.
- Produces (internal, used by Task 2): `oneLine(s, max): string`.

- [ ] **Step 1: Write the failing tests**

Create `tests/reviewSms.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { normalizeAuMobile, buildReviewMessage } from '../functions/api/review-sms.js';

describe('normalizeAuMobile', () => {
  it('normalises common AU mobile formats to E.164', () => {
    expect(normalizeAuMobile('0412 345 678')).toBe('+61412345678');
    expect(normalizeAuMobile('+61 412 345 678')).toBe('+61412345678');
    expect(normalizeAuMobile('61412345678')).toBe('+61412345678');
    expect(normalizeAuMobile('412345678')).toBe('+61412345678');
    expect(normalizeAuMobile('(04) 1234-5678')).toBe('+61412345678');
  });

  it('rejects landlines, short numbers and junk', () => {
    expect(normalizeAuMobile('0298765432')).toBeNull(); // Sydney landline
    expect(normalizeAuMobile('0412345')).toBeNull();     // too short
    expect(normalizeAuMobile('')).toBeNull();
    expect(normalizeAuMobile('not a phone')).toBeNull();
    expect(normalizeAuMobile(null)).toBeNull();
  });
});

describe('buildReviewMessage', () => {
  it('includes the name, brand, review link and sign-off', () => {
    const msg = buildReviewMessage('Sam', 'https://g.page/r/abc/review');
    expect(msg).toContain('Hi Sam,');
    expect(msg).toContain('Xpress Phone Repairs at Riverwood Plaza');
    expect(msg).toContain('https://g.page/r/abc/review');
    expect(msg).toContain('— The team');
  });

  it('falls back to "there" for a blank name and strips control chars', () => {
    expect(buildReviewMessage('', 'L')).toContain('Hi there,');
    expect(buildReviewMessage('A\nB', 'L')).toContain('Hi A B,');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- reviewSms`
Expected: FAIL — cannot import `normalizeAuMobile` / `buildReviewMessage` (module does not exist yet).

- [ ] **Step 3: Write the minimal implementation**

Create `functions/api/review-sms.js`:

```js
// Cloudflare Pages Function — POST /api/review-sms
//
// Staff-triggered Google-review request SMS. A PIN-gated internal page
// (src/pages/staff/review-request.astro) posts { name, mobile, device, pin };
// this endpoint validates the PIN, normalises the mobile to an AU E.164 number,
// and sends a review-request SMS via ClickSend.
//
// Config (Cloudflare Pages → Settings → Environment variables / Secrets):
//   CLICKSEND_USERNAME  (secret, required)  — ClickSend account username
//   CLICKSEND_API_KEY   (secret, required)  — ClickSend API key
//   REVIEW_SMS_PIN      (secret, required)  — staff PIN gating this endpoint
//   REVIEW_LINK         (required)          — https://g.page/r/…/review
//   CLICKSEND_SENDER    (optional)          — sender ID, default 'Xpress' (≤11 chars)
//
// Self-contained by design: it duplicates lead.js's small guard helpers rather
// than editing lead.js, so the two endpoints never conflict.

const MAX_BODY_BYTES = 16 * 1024;

// Single-line, length-capped value — strips CR/LF and other control chars.
const oneLine = (s, max = 200) => {
  let out = '';
  for (const ch of String(s ?? '')) {
    const code = ch.charCodeAt(0);
    out += code < 32 || code === 127 ? ' ' : ch;
  }
  return out.replace(/  +/g, ' ').trim().slice(0, max);
};

// AU mobile → E.164 (+614xxxxxxxx), or null if it isn't a valid AU mobile.
export function normalizeAuMobile(raw) {
  const s = String(raw ?? '').trim();
  const hadPlus = s.startsWith('+');
  const digits = s.replace(/[^\d]/g, '');
  let national;
  if (hadPlus && digits.startsWith('61')) national = digits.slice(2);
  else if (!hadPlus && digits.length === 11 && digits.startsWith('61')) national = digits.slice(2);
  else if (digits.startsWith('0')) national = digits.slice(1);
  else national = digits;
  if (!/^4\d{8}$/.test(national)) return null;
  return `+61${national}`;
}

export function buildReviewMessage(name, reviewLink) {
  const safeName = oneLine(name, 40) || 'there';
  return (
    `Hi ${safeName}, thanks for choosing Xpress Phone Repairs at Riverwood Plaza! ` +
    `If you're happy with the repair, a quick Google review means a lot to us: ` +
    `${reviewLink} — The team`
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- reviewSms`
Expected: PASS (both `describe` blocks green).

- [ ] **Step 5: Commit**

```bash
git add functions/api/review-sms.js tests/reviewSms.test.js
git commit -m "feat(review-sms): AU mobile normaliser + message builder"
```

---

### Task 2: The `/api/review-sms` endpoint

**Files:**
- Modify: `functions/api/review-sms.js` (add guards, PIN check, ClickSend send)
- Test: `tests/reviewSms.test.js` (add endpoint suite)

**Interfaces:**
- Consumes: `normalizeAuMobile`, `buildReviewMessage`, `oneLine` from Task 1.
- Produces: `onRequest({ request, env }): Promise<Response>` — JSON responses.
  - 405 non-POST · 403 not same-site · 413 oversized · 400 bad body/mobile · 401 wrong PIN · 503 unconfigured or send failure · 200 `{ ok: true, to }`.

- [ ] **Step 1: Write the failing endpoint tests**

Append to `tests/reviewSms.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { onRequest } from '../functions/api/review-sms.js';

const ORIGIN = 'https://expressrepairs.com.au';
const FULL_ENV = {
  CLICKSEND_USERNAME: 'u',
  CLICKSEND_API_KEY: 'k',
  REVIEW_SMS_PIN: '1234',
  REVIEW_LINK: 'https://g.page/r/abc/review',
};

function makeReq({ method = 'POST', body = {}, origin = ORIGIN, contentLength } = {}) {
  const headers = new Headers();
  if (origin) headers.set('Origin', origin);
  if (contentLength != null) headers.set('content-length', String(contentLength));
  return { method, headers, json: async () => body };
}

const clickSendOk = () =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ data: { messages: [{ status: 'SUCCESS' }] } }), { status: 200 })
  );

describe('POST /api/review-sms', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('rejects non-POST with 405', async () => {
    const res = await onRequest({ request: makeReq({ method: 'GET' }), env: FULL_ENV });
    expect(res.status).toBe(405);
  });

  it('rejects cross-origin with 403 and sends nothing', async () => {
    const spy = clickSendOk();
    const res = await onRequest({
      request: makeReq({ origin: 'https://evil.example', body: { pin: '1234', mobile: '0412345678' } }),
      env: FULL_ENV,
    });
    expect(res.status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects oversized bodies with 413', async () => {
    const res = await onRequest({ request: makeReq({ contentLength: 20000 }), env: FULL_ENV });
    expect(res.status).toBe(413);
  });

  it('returns 503 when REVIEW_SMS_PIN is unset (never an open endpoint)', async () => {
    const spy = clickSendOk();
    const { REVIEW_SMS_PIN, ...noPin } = FULL_ENV;
    const res = await onRequest({ request: makeReq({ body: { pin: '1234', mobile: '0412345678' } }), env: noPin });
    expect(res.status).toBe(503);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects a wrong PIN with 401 and sends nothing', async () => {
    const spy = clickSendOk();
    const res = await onRequest({
      request: makeReq({ body: { pin: 'oops', mobile: '0412345678', name: 'Sam' } }),
      env: FULL_ENV,
    });
    expect(res.status).toBe(401);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects an invalid mobile with 400 and sends nothing', async () => {
    const spy = clickSendOk();
    const res = await onRequest({
      request: makeReq({ body: { pin: '1234', mobile: '0298765432', name: 'Sam' } }),
      env: FULL_ENV,
    });
    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns 503 when ClickSend creds are unset', async () => {
    const res = await onRequest({
      request: makeReq({ body: { pin: '1234', mobile: '0412345678', name: 'Sam' } }),
      env: { REVIEW_SMS_PIN: '1234', REVIEW_LINK: 'https://g.page/r/abc/review' },
    });
    expect(res.status).toBe(503);
  });

  it('sends on the happy path and returns the normalised number', async () => {
    const spy = clickSendOk();
    const res = await onRequest({
      request: makeReq({ body: { pin: '1234', mobile: '0412 345 678', name: 'Sam', device: 'iPhone 13' } }),
      env: FULL_ENV,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, to: '+61412345678' });
    expect(spy).toHaveBeenCalledTimes(1);
    const [url, opts] = spy.mock.calls[0];
    expect(url).toBe('https://rest.clicksend.com/v3/sms/send');
    const sent = JSON.parse(opts.body);
    expect(sent.messages[0].to).toBe('+61412345678');
    expect(sent.messages[0].from).toBe('Xpress');
    expect(sent.messages[0].body).toContain('Hi Sam,');
    expect(sent.messages[0].body).toContain('https://g.page/r/abc/review');
    expect(opts.headers.Authorization).toMatch(/^Basic /);
  });

  it('returns 503 when ClickSend reports a per-message failure (HTTP 200)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { messages: [{ status: 'INVALID_RECIPIENT' }] } }), { status: 200 })
    );
    const res = await onRequest({
      request: makeReq({ body: { pin: '1234', mobile: '0412345678', name: 'Sam' } }),
      env: FULL_ENV,
    });
    expect(res.status).toBe(503);
  });

  it('returns 503 on a network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('boom'));
    const res = await onRequest({
      request: makeReq({ body: { pin: '1234', mobile: '0412345678', name: 'Sam' } }),
      env: FULL_ENV,
    });
    expect(res.status).toBe(503);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- reviewSms`
Expected: FAIL — `onRequest` is not exported yet (import resolves to `undefined`, calls throw).

- [ ] **Step 3: Add the handler to `functions/api/review-sms.js`**

Add these helpers and the handler **below** the existing exports in `functions/api/review-sms.js` (keep Task 1's code above):

```js
const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const hostAllowed = (host, env) => {
  if (!host) return false;
  const extra = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return (
    host === 'expressrepairs.com.au' ||
    host === 'www.expressrepairs.com.au' ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.pages.dev') ||
    extra.includes(host)
  );
};

// True when the request originates from our own site (Origin, else Referer).
const sameSite = (request, env) => {
  const hostOf = (v) => {
    try { return new URL(v).host; } catch { return ''; }
  };
  const origin = request.headers.get('Origin');
  if (origin) return hostAllowed(hostOf(origin), env);
  const referer = request.headers.get('Referer');
  if (referer) return hostAllowed(hostOf(referer), env);
  return false;
};

// Length-safe PIN comparison (avoids a trivial early-exit timing signal).
const pinEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed.' });
  if (!sameSite(request, env)) return json(403, { ok: false, error: 'Forbidden.' });

  const declaredLen = Number(request.headers.get('content-length') || 0);
  if (declaredLen > MAX_BODY_BYTES) return json(413, { ok: false, error: 'Request too large.' });

  let data;
  try {
    data = await request.json();
  } catch {
    return json(400, { ok: false, error: 'Invalid request body.' });
  }

  // PIN gate. If the secret is unset the endpoint is unconfigured — never open.
  const pinSecret = env.REVIEW_SMS_PIN;
  if (!pinSecret) return json(503, { ok: false, error: 'SMS sending not configured.' });
  if (!pinEqual(String(data.pin ?? ''), pinSecret)) {
    return json(401, { ok: false, error: 'Wrong PIN.' });
  }

  const to = normalizeAuMobile(data.mobile);
  if (!to) return json(400, { ok: false, error: 'Enter a valid Australian mobile number.' });

  const username = env.CLICKSEND_USERNAME;
  const apiKey = env.CLICKSEND_API_KEY;
  const reviewLink = env.REVIEW_LINK;
  if (!username || !apiKey || !reviewLink) {
    return json(503, { ok: false, error: 'SMS sending not configured.' });
  }

  const from = oneLine(env.CLICKSEND_SENDER, 11) || 'Xpress';
  const body = buildReviewMessage(data.name, reviewLink);
  const payload = { messages: [{ source: 'cf-pages', from, to, body }] };

  // ClickSend returns HTTP 200 even for a failed message, so we check the
  // per-message status too. Any other outcome → 503 (not 502; see file header).
  try {
    const res = await fetch('https://rest.clicksend.com/v3/sms/send', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${username}:${apiKey}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => null);
    const status = result?.data?.messages?.[0]?.status;
    if (!res.ok || status !== 'SUCCESS') {
      console.error('ClickSend send failed', res.status, JSON.stringify(result));
      return json(503, { ok: false, error: 'Could not send right now.' });
    }
  } catch (err) {
    console.error('ClickSend request error', err);
    return json(503, { ok: false, error: 'Could not send right now.' });
  }

  return json(200, { ok: true, to });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- reviewSms`
Expected: PASS — all unit + endpoint tests green.

- [ ] **Step 5: Run the full suite (no regressions)**

Run: `npm test`
Expected: PASS — existing suites (lead, landing, prices, routing, hours, data) still green.

- [ ] **Step 6: Commit**

```bash
git add functions/api/review-sms.js tests/reviewSms.test.js
git commit -m "feat(review-sms): PIN-gated ClickSend send endpoint"
```

---

### Task 3: Staff page + sitemap exclusion

**Files:**
- Create: `src/pages/staff/review-request.astro`
- Modify: `astro.config.mjs`
- Modify: `tests/build-output.test.js`

**Interfaces:**
- Consumes: `POST /api/review-sms` (Task 2) with JSON `{ name, mobile, device, pin }`; expects `{ ok, to }` or `{ ok:false, error }`.

- [ ] **Step 1: Create the staff page**

Create `src/pages/staff/review-request.astro`:

```astro
---
import Layout from '../../layouts/Layout.astro';
---
<Layout title="Send review request" path="/staff/review-request/" noindex={true}>
  <main id="main-content" style="max-width:28rem;margin:0 auto;padding:2rem 1.25rem;font-family:system-ui,sans-serif">
    <h1 style="font-size:1.4rem;margin:0 0 .25rem">Review request SMS</h1>
    <p style="color:#555;margin:.25rem 0 1.5rem;font-size:.95rem">Send a just-repaired customer a Google review link. Ask every customer, not just the happy ones.</p>
    <form id="rr-form" style="display:grid;gap:1rem">
      <label style="display:grid;gap:.35rem;font-weight:600">First name
        <input id="rr-name" type="text" autocomplete="off" required
          style="padding:.7rem;font-size:1rem;border:1px solid #ccc;border-radius:8px" />
      </label>
      <label style="display:grid;gap:.35rem;font-weight:600">Mobile
        <input id="rr-mobile" type="tel" inputmode="tel" autocomplete="off" required placeholder="0412 345 678"
          style="padding:.7rem;font-size:1rem;border:1px solid #ccc;border-radius:8px" />
      </label>
      <label style="display:grid;gap:.35rem;font-weight:600">Device <span style="font-weight:400;color:#888">(optional, your notes only)</span>
        <input id="rr-device" type="text" autocomplete="off"
          style="padding:.7rem;font-size:1rem;border:1px solid #ccc;border-radius:8px" />
      </label>
      <label style="display:grid;gap:.35rem;font-weight:600">Shop PIN
        <input id="rr-pin" type="password" autocomplete="off" required
          style="padding:.7rem;font-size:1rem;border:1px solid #ccc;border-radius:8px" />
      </label>
      <button id="rr-send" type="submit"
        style="padding:.85rem;font-size:1.05rem;font-weight:700;color:#fff;background:#0a66ff;border:0;border-radius:10px;cursor:pointer">
        Send review request
      </button>
      <p id="rr-status" role="status" aria-live="polite" style="margin:0;min-height:1.4rem;font-size:.95rem"></p>
    </form>
  </main>
  <script is:inline>
    (function () {
      var form = document.getElementById('rr-form');
      var status = document.getElementById('rr-status');
      var pin = document.getElementById('rr-pin');
      var name = document.getElementById('rr-name');
      var mobile = document.getElementById('rr-mobile');
      var device = document.getElementById('rr-device');
      var btn = document.getElementById('rr-send');
      try { var saved = localStorage.getItem('rr-pin'); if (saved) pin.value = saved; } catch (e) {}
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        status.style.color = '#555';
        status.textContent = 'Sending…';
        btn.disabled = true;
        try {
          var res = await fetch('/api/review-sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.value, mobile: mobile.value, device: device.value, pin: pin.value })
          });
          var data = await res.json().catch(function () { return {}; });
          if (res.ok && data.ok) {
            try { localStorage.setItem('rr-pin', pin.value); } catch (e) {}
            status.style.color = '#0a7d28';
            status.textContent = 'Sent to ' + (data.to || mobile.value) + ' ✓';
            name.value = ''; mobile.value = ''; device.value = '';
            name.focus();
          } else {
            status.style.color = '#c0261f';
            status.textContent = (data.error || 'Could not send.') + ' (HTTP ' + res.status + ')';
          }
        } catch (err) {
          status.style.color = '#c0261f';
          status.textContent = 'Network error — check connection and try again.';
        } finally {
          btn.disabled = false;
        }
      });
    })();
  </script>
</Layout>
```

- [ ] **Step 2: Exclude `/staff/` from the sitemap**

Modify `astro.config.mjs` — extend the existing filter:

```js
    sitemap({ filter: (page) => !page.includes('/go/') && !page.includes('/staff/') }),
```

- [ ] **Step 3: Add build assertions for the staff page**

Append to `tests/build-output.test.js` (after the existing `describe` blocks):

```js
describe('staff review-request page', () => {
  it('builds as a noindex page', () => {
    const staff = readFileSync('dist/staff/review-request/index.html', 'utf8');
    expect(staff).toContain('name="robots" content="noindex, nofollow"');
    expect(staff).toContain('id="rr-form"');
  });

  it('is excluded from the sitemap', () => {
    const sm = readFileSync('dist/sitemap-0.xml', 'utf8');
    expect(sm).not.toContain('/staff/');
  });
});
```

- [ ] **Step 4: Build and run the tests**

Run: `npm test -- build-output`
Expected: PASS — the staff page builds `noindex`, contains `#rr-form`, and does not appear in `dist/sitemap-0.xml`. (This runs a full `npm run build` in `beforeAll`; allow ~60–90s.)

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 6: Commit**

```bash
git add src/pages/staff/review-request.astro astro.config.mjs tests/build-output.test.js
git commit -m "feat(review-sms): staff send page (noindex, sitemap-excluded)"
```

---

### Task 4: Document env vars + owner setup

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a Review-request SMS section to `README.md`**

Append this section to `README.md` (place it near any existing "Environment variables" / lead-email notes; if none, add at the end):

```markdown
## Review-request SMS (staff tool)

Staff open **`/staff/review-request`** (PIN-gated, `noindex`, unlinked), enter a
customer's first name + mobile, and send a Google-review SMS via ClickSend.
Endpoint: `functions/api/review-sms.js`.

Set these in **Cloudflare Pages → Settings → Environment variables** (mark the
first three as **Secret**), then redeploy:

| Key | Secret | Purpose |
| --- | --- | --- |
| `CLICKSEND_USERNAME` | yes | ClickSend account username |
| `CLICKSEND_API_KEY` | yes | ClickSend API key |
| `REVIEW_SMS_PIN` | yes | staff PIN for the send page |
| `REVIEW_LINK` | no | `https://g.page/r/…/review` (GBP → Ask for reviews) |
| `CLICKSEND_SENDER` | no | sender ID, default `Xpress` (≤11 chars, alphanumeric) |

Notes:
- Branded sender IDs are **send-only** — customers can't reply STOP. This relies
  on inferred consent (existing customer, right after their repair). To add a hard
  opt-out later, rent a ClickSend virtual number and set it as `CLICKSEND_SENDER`.
- Confirm the `Xpress` sender ID is permitted on your ClickSend account (some
  accounts require sender-ID registration).
- No incentives, and ask **every** customer — not only happy ones (Google/ACCC).
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(review-sms): env vars + owner setup for the SMS tool"
```

---

## Self-Review

**Spec coverage:**
- §3 flow / §4.2 endpoint → Task 2. ✅
- §4.1 staff page → Task 3. ✅
- §4.3 message template + compliance → Task 1 (`buildReviewMessage`) + Task 3 page copy. ✅
- §5 config → Task 4 (README) + consumed by Task 2. ✅
- §6 security (same-site, PIN, AU-only, secrets server-side) → Task 2. ✅
- §7 testing (normalisation table, guards, happy/failure paths) → Tasks 1–2; sitemap/noindex guard → Task 3. ✅
- §8 deliverables (page, endpoint, tests, docs) → Tasks 1–4. ✅
- §2 non-goals (no Lightspeed/cron/reply-handling/send-log) → nothing in the plan adds them. ✅

**Placeholder scan:** No TBD/TODO; every code and test step contains complete code and exact commands. ✅

**Type consistency:** `normalizeAuMobile` and `buildReviewMessage` signatures match between Task 1 (definition) and Task 2 (use); `onRequest({ request, env })` matches the test harness; ClickSend success path (`data.data.messages[0].status === 'SUCCESS'`) is consistent between the handler and the failure test. ✅

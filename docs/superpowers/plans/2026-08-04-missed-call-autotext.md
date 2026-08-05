# Missed-call auto-text + SMS consolidation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Text back anyone whose call to the shop rings out, and close the opt-out gap on the live review-request SMS.

**Architecture:** Both Telstra lines conditionally forward to one Twilio AU number. Twilio webhooks `POST /api/missed-call`; the function verifies Twilio's signature, applies guards, texts the caller, and rejects the call so no voice minutes are billed. Review-request SMS keeps working on ClickSend until Twilio is proven, then migrates.

**Tech Stack:** Astro + Cloudflare Pages Functions (Workers runtime, WebCrypto — no Node APIs), Vitest, KV binding `ORDERS_KV`, ClickSend REST (existing), Twilio REST (new).

**Spec:** `docs/superpowers/specs/2026-08-04-missed-call-autotext-design.md`

## Global Constraints

- **Workers runtime**: no Node `crypto`/`Buffer`. Use `crypto.subtle`, `btoa`, `TextEncoder`.
- **Never log a customer phone number or message body.** Existing endpoints log status codes only; match that.
- **Secrets are uploaded with Bash `printf '%s'`, never a PowerShell pipe** — a PowerShell pipe appends a newline that wrangler stores verbatim and reports as success. See `docs/` note in the review-SMS spec and the 2026-08-03 incident.
- **Cloudflare Pages binds env vars at DEPLOY time.** After `wrangler pages secret put`, run `gh workflow run deploy.yml` or the value is not live.
- **SMS copy must stay GSM-7** (no em dashes, no smart quotes) — one non-GSM-7 character doubles the segment count.
- **2-segment ceiling is 306 characters.** Any copy change must be re-measured.
- Branch from `origin/main`, never local `main`. Expect additive conflicts in `tests/build-output.test.js`.

---

# Workstream A — ships immediately, no external dependencies

## Task 1: Add the opt-out line to the review-request SMS

Closes a live Spam Act gap: the message currently offers no way to opt out, and the `Xpress` alpha-tag sender cannot receive a reply. The shop mobile accepts calls *and* texts, so it is a functional opt-out channel today.

**Files:**
- Modify: `functions/api/review-sms.js` (`buildReviewMessage`, ~line 57)
- Test: `tests/reviewSms.test.js` (~line 29)

**Interfaces:**
- Consumes: nothing new.
- Produces: `buildReviewMessage(name, reviewLink)` — unchanged signature, new trailing sentence.

⚠️ **The existing test asserts `/ - The team$/`** — that the sign-off is the very last thing in the message. The opt-out sentence goes after it, so that assertion must change. Its underlying intent (don't let copy creep add a billable segment) is valid and is preserved by replacing it with an explicit segment-count assertion, which is a stronger guard than a suffix match.

- [ ] **Step 1: Replace the sign-off assertion with a segment guard**

In `tests/reviewSms.test.js`, inside `describe('buildReviewMessage')`, replace the `expect(msg).toMatch(/ - The team$/);` line and its two comment lines with:

```js
    expect(msg).toContain(' - The team.');
    expect(msg).toContain('To opt out, call or text 0415 303 300.');
```

Then add a new test to the same `describe` block:

```js
  it('stays within 2 GSM-7 segments even with the longest allowed name', () => {
    // oneLine() caps the name at 40 chars, so this is the true worst case.
    const msg = buildReviewMessage('x'.repeat(40), 'https://g.page/r/Ce96yvDNgJmJEAI/review');
    // 2 concatenated GSM-7 segments = 153 * 2. Exceeding this bills a 3rd.
    expect(msg.length).toBeLessThanOrEqual(306);
    // Any non-GSM-7 char (em dash, smart quote) silently halves capacity.
    expect(msg).toMatch(/^[ -~\n]*$/);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd repo && npx vitest run tests/reviewSms.test.js
```

Expected: FAIL — `expect(msg).toContain('To opt out, call or text 0415 303 300.')` fails because the copy has no opt-out line yet.

- [ ] **Step 3: Add the opt-out sentence**

In `functions/api/review-sms.js`, change the return in `buildReviewMessage` to:

```js
  return (
    `Hi ${safeName}, thanks for choosing Xpress Phone Repairs at Riverwood Plaza! ` +
    `If you're happy with the repair, a quick Google review means a lot to us: ` +
    `${reviewLink} - The team. To opt out, call or text 0415 303 300.`
  );
```

Measured: 233 characters with a short name, 270 at the 40-character name cap — both inside the 306 ceiling, so this stays 2 segments and costs nothing extra.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd repo && npx vitest run tests/reviewSms.test.js
```

Expected: PASS, all tests in the file.

- [ ] **Step 5: Run the full suite**

```bash
cd repo && npm test
```

Expected: PASS. A failure in `tests/build-output.test.js` means a stale build, not this change — run `npm run build` first.

- [ ] **Step 6: Commit**

```bash
git add functions/api/review-sms.js tests/reviewSms.test.js
git commit -m "feat(sms): add Spam Act opt-out line to review request"
```

## Task 2: Log each review SMS sent

Gives the shop a record independent of ClickSend, and a base for a future "already texted this customer" check.

**Files:**
- Modify: `functions/api/review-sms.js` (after the successful send, before the final `return`)
- Test: `tests/reviewSms.test.js`

**Interfaces:**
- Consumes: `env.ORDERS_KV` (already bound).
- Produces: KV keys `reviewsms:<iso8601>:<8 hex>`.

**Deviation from spec §7, deliberate:** the spec proposed a daily counter `reviewsms:<YYYY-MM-DD>`. The codebase already solved this in `functions/api/lead.js:229` with **key-per-record**, and documents why: a counter is a read-modify-write race under concurrency. Follow the existing pattern.

- [ ] **Step 1: Write the failing test**

Add to `tests/reviewSms.test.js`, inside the `describe` block that exercises `onRequest`:

```js
  it('records a PII-free log entry after a successful send', async () => {
    const puts = [];
    const kv = {
      get: async () => null,
      put: async (k, v) => { puts.push({ k, v }); },
    };
    globalThis.fetch = vi.fn(async () => new Response(
      JSON.stringify({ data: { messages: [{ status: 'SUCCESS' }] } }), { status: 200 },
    ));

    const res = await onRequest({
      request: makeReq({ body: { name: 'Sam', mobile: '0412345678', pin: PIN } }),
      env: { ...FULL_ENV, ORDERS_KV: kv },
    });

    expect(res.status).toBe(200);
    const log = puts.find((p) => p.k.startsWith('reviewsms:'));
    expect(log).toBeTruthy();
    // Must never contain the customer's number.
    expect(log.k).not.toContain('412345678');
    expect(log.v).not.toContain('412345678');
  });
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd repo && npx vitest run tests/reviewSms.test.js -t 'PII-free log'
```

Expected: FAIL — `log` is `undefined`, no `reviewsms:` key written.

- [ ] **Step 3: Write the implementation**

In `functions/api/review-sms.js`, immediately before the final `return json(200, { ok: true, to });`:

```js
  // Bookkeeping only — the shop's own count, independent of ClickSend's history.
  // ponytail: key-per-send, mirroring lead.js — no read-modify-write race.
  // Deliberately PII-free: no phone number, no message body.
  if (env.ORDERS_KV) {
    try {
      await env.ORDERS_KV.put(
        `reviewsms:${new Date().toISOString()}:${crypto.randomUUID().slice(0, 8)}`,
        JSON.stringify({ sent: true }),
        { expirationTtl: 60 * 60 * 24 * 730 },
      );
    } catch (err) {
      // Never fail a delivered SMS over bookkeeping.
      console.error('ORDERS_KV review-sms count failed', err);
    }
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd repo && npx vitest run tests/reviewSms.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit and deploy**

```bash
git add functions/api/review-sms.js tests/reviewSms.test.js
git commit -m "feat(sms): log each review request sent, PII-free"
```

Workstream A is now complete. Open a PR, merge, and confirm `gh run list --workflow=deploy.yml` goes green. Send one live test to the shop mobile per the review-SMS runbook and confirm the opt-out sentence appears.

---

# Phase 0 — verification gate (blocks all of Workstream B)

**Nothing in Workstream B may be built until this passes.** The entire feature assumes the *original* caller's number survives a Telstra divert. If Telstra instead presents the shop's own number, the shop would text itself on every missed call and the design needs rethinking.

## Task 3: Prove caller ID survives the divert

**Files:**
- Create: `functions/api/missed-call.js` (temporary logging-only version, replaced in Task 6)

**Interfaces:**
- Produces: `POST /api/missed-call` returning TwiML, logging `From` / `ForwardedFrom` only.

- [ ] **Step 1: Owner provisions a Twilio AU number**

Buy an **Australian mobile-prefix** number (~$8.25/month — it must be mobile-prefix, because AU *local* numbers cannot send SMS). AU numbers require identity/address verification which can take several business days, so start here.

- [ ] **Step 2: Create the temporary logging endpoint**

Create `functions/api/missed-call.js`:

```js
// TEMPORARY — Phase 0 caller-ID probe. Replaced by the real handler in Task 6.
// Logs only the caller ID fields. Sends nothing. Costs nothing.
export async function onRequest({ request }) {
  const form = await request.formData().catch(() => null);
  console.log('PHASE0 caller-id probe',
    'From=', form?.get('From') || 'none',
    'ForwardedFrom=', form?.get('ForwardedFrom') || 'none',
    'Called=', form?.get('Called') || 'none');
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Reject/></Response>',
    { headers: { 'content-type': 'text/xml' } });
}
```

This is the one place in the codebase where logging a phone number is acceptable — it is a deliberate, temporary diagnostic, deleted in Task 6.

- [ ] **Step 3: Deploy it**

```bash
git add functions/api/missed-call.js
git commit -m "chore: temporary caller-ID probe for missed-call Phase 0"
```

Merge and let `deploy.yml` run. Then in the Twilio console set the number's **Voice → A call comes in** webhook to `https://expressrepairs.com.au/api/missed-call` (HTTP POST).

- [ ] **Step 4: Enable conditional forwarding on the mobile**

On `0415 303 300`, set forward-on-no-answer to the Twilio number. On Telstra this is the GSM code `**61*<twilio number>*11*20#` dialled from the handset (20-second ring delay), or via the Telstra app. Also set busy (`**67*`) and unreachable (`**62*`).

- [ ] **Step 5: Place the test call — THE GATE**

From a phone unrelated to the business, call `0415 303 300` and let it ring out. Then:

```bash
npx wrangler pages deployment tail --project-name expressrepairs
```

**PASS:** `From=` shows the *calling* phone's number.
**FAIL:** `From=` shows `+61415303300` (the shop's own number).

- [ ] **Step 6: Repeat from the landline**

Configure Call Forward No Answer on `(02) 9533 3300` via Telstra, and repeat step 5.

- [ ] **Step 7: Confirm the forwarding charge**

Check the Telstra plan for what a diverted leg costs — it is billed as a call from the shop's line to the Twilio number, and could exceed the SMS cost.

- [ ] **Step 8: Record the outcome**

If step 5 failed, **stop**. Report the result and revisit the design; Workstream A is unaffected and stays live. If it passed, remove the forwarding temporarily (`##61#`) until Task 7, so callers are not silently rejected while Task 4–6 are built.

---

# Workstream B — the missed-call handler (gated on Phase 0)

## Task 4: Move `normalizeAuMobile` into shared helpers

Two endpoints now need it. Behaviour-preserving refactor, no logic change.

**Files:**
- Modify: `functions/_shared.js` (add export), `functions/api/review-sms.js` (remove definition, import instead)
- Test: `tests/reviewSms.test.js` (update import path)

**Interfaces:**
- Produces: `normalizeAuMobile(raw) -> string | null` exported from `functions/_shared.js`. Returns `+61xxxxxxxxx` for a valid AU mobile, `null` otherwise.

- [ ] **Step 1: Move the function**

Cut the entire `normalizeAuMobile` function (and its comment) from `functions/api/review-sms.js` and paste it into `functions/_shared.js`, keeping the `export` keyword.

- [ ] **Step 2: Import it back in review-sms.js**

Add `normalizeAuMobile` to the existing import list from `../_shared.js`. Then re-export it so the existing test import keeps working:

```js
export { normalizeAuMobile };
```

- [ ] **Step 3: Run the tests**

```bash
cd repo && npm test
```

Expected: PASS with no test changes. If `normalizeAuMobile` tests fail, the move dropped something — re-check the regex `/^4\d{8}$/`.

- [ ] **Step 4: Commit**

```bash
git add functions/_shared.js functions/api/review-sms.js
git commit -m "refactor: move normalizeAuMobile to _shared for reuse"
```

## Task 5: Twilio signature validation

`/api/missed-call` is a public endpoint that **spends money**. Without signature validation anyone could POST it and turn the Twilio account into a spam cannon. This is a security boundary — do not simplify it away.

**Files:**
- Modify: `functions/_shared.js`
- Test: `tests/missedCall.test.js` (create)

**Interfaces:**
- Produces: `validTwilioSignature(url, params, signature, authToken) -> Promise<boolean>`, where `params` is a plain object of the POST fields.

Algorithm (Twilio-defined, not a choice): take the full request URL, append each POST parameter's name and value with no delimiters in case-sensitive alphabetical key order, HMAC-SHA1 with the auth token, base64-encode, compare.

- [ ] **Step 1: Write the failing test**

Create `tests/missedCall.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { validTwilioSignature } from '../functions/_shared.js';

// Vector generated independently with Node's crypto.createHmac (not the
// WebCrypto implementation under test), so this is a real cross-check.
const TOKEN = 'test_auth_token_abc123';
const URL_ = 'https://expressrepairs.com.au/api/missed-call';
const PARAMS = {
  AccountSid: 'ACtest',
  CallSid: 'CAtest123',
  CallStatus: 'no-answer',
  From: '+61412345678',
  To: '+61480000000',
};
const GOOD = 'XPaWuOOcDhGDf9KFiHzrh/214ho=';

describe('validTwilioSignature', () => {
  it('accepts a correctly signed request', async () => {
    expect(await validTwilioSignature(URL_, PARAMS, GOOD, TOKEN)).toBe(true);
  });

  it('rejects a tampered caller number', async () => {
    const tampered = { ...PARAMS, From: '+61499999999' };
    expect(await validTwilioSignature(URL_, tampered, GOOD, TOKEN)).toBe(false);
  });

  it('rejects a wrong auth token, a bad signature and junk', async () => {
    expect(await validTwilioSignature(URL_, PARAMS, GOOD, 'wrong')).toBe(false);
    expect(await validTwilioSignature(URL_, PARAMS, 'nope', TOKEN)).toBe(false);
    expect(await validTwilioSignature(URL_, PARAMS, '', TOKEN)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd repo && npx vitest run tests/missedCall.test.js
```

Expected: FAIL — `validTwilioSignature is not a function`.

- [ ] **Step 3: Implement it**

Add to `functions/_shared.js`:

```js
// Twilio webhook authenticity. Twilio mandates HMAC-SHA1 over the request URL
// followed by every POST param (name then value, no delimiters) in
// case-sensitive alphabetical key order, base64-encoded. SHA-1 is Twilio's
// choice, not ours.
//
// Gotcha: the URL must byte-for-byte match what Twilio was configured with.
// apex vs www, http vs https, or a trailing slash all break the signature.
export async function validTwilioSignature(url, params, signature, authToken) {
  if (!signature || !authToken) return false;
  let data = String(url);
  for (const k of Object.keys(params).sort()) data += k + params[k];
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(authToken), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd repo && npx vitest run tests/missedCall.test.js
```

Expected: PASS, all three tests.

- [ ] **Step 5: Commit**

```bash
git add functions/_shared.js tests/missedCall.test.js
git commit -m "feat(sms): Twilio webhook signature validation"
```

## Task 6: The missed-call handler

Replaces the Phase 0 probe with the real thing.

**Files:**
- Modify: `functions/api/missed-call.js` (replace entirely)
- Test: `tests/missedCall.test.js` (extend)

**Interfaces:**
- Consumes: `normalizeAuMobile` and `validTwilioSignature` from `_shared.js`.
- Produces: `buildMissedCallMessage() -> string`, `onRequest({ request, env })`.
- Env: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_NUMBER` (E.164), `ORDERS_KV`.

Always returns `<Reject/>` TwiML regardless of whether a text was sent, so the caller's experience never depends on our guard logic.

- [ ] **Step 1: Write the failing tests**

First update the file's existing import line (Task 5 created it without `vi`):

```js
import { describe, it, expect, vi } from 'vitest';
import { createHmac } from 'node:crypto';
```

Then append to `tests/missedCall.test.js`:

```js
import { buildMissedCallMessage, onRequest } from '../functions/api/missed-call.js';

const ENV = {
  TWILIO_ACCOUNT_SID: 'ACtest',
  TWILIO_AUTH_TOKEN: TOKEN,
  TWILIO_NUMBER: '+61480000000',
};

// Builds a request whose signature is genuinely valid for the given params.
// Signs with Node's crypto — an implementation independent of the WebCrypto
// code under test. `node:crypto` is fine here (Vitest runs on Node) but must
// never appear under functions/, which runs on Workers.
function signedReq(params, env = ENV) {
  let data = URL_;
  for (const k of Object.keys(params).sort()) data += k + params[k];
  const sig = createHmac('sha1', env.TWILIO_AUTH_TOKEN).update(data).digest('base64');
  return {
    method: 'POST',
    url: URL_,
    headers: new Headers({
      'x-twilio-signature': sig,
      'content-type': 'application/x-www-form-urlencoded',
    }),
    text: async () => new URLSearchParams(params).toString(),
  };
}

function kvStub(store = {}) {
  return {
    get: async (k) => (k in store ? store[k] : null),
    put: async (k, v) => { store[k] = v; },
    _store: store,
  };
}

describe('missed-call handler', () => {
  it('builds a GSM-7 message that identifies the business and fits one segment', () => {
    const msg = buildMissedCallMessage();
    expect(msg).toContain('Xpress Phone Repairs');
    // Must stay GSM-7: an em dash or smart quote halves segment capacity.
    expect(msg).toMatch(/^[ -~]*$/);
    // Currently 138 chars. A single GSM-7 segment is 160, so this message
    // costs ~5.15c. Crossing 160 doubles the per-missed-call cost, hence the
    // tight bound rather than the 306 two-segment ceiling.
    expect(msg.length).toBeLessThanOrEqual(160);
  });

  it('texts a mobile caller and rejects the call', async () => {
    const sent = [];
    globalThis.fetch = vi.fn(async (u, o) => { sent.push({ u, o }); return new Response('{}', { status: 201 }); });
    const res = await onRequest({ request: await signedReq(PARAMS), env: { ...ENV, ORDERS_KV: kvStub() } });
    expect(res.headers.get('content-type')).toContain('xml');
    expect(await res.text()).toContain('<Reject/>');
    expect(sent).toHaveLength(1);
    expect(sent[0].o.body).toContain('To=%2B61412345678');
  });

  it('does not text a landline caller', async () => {
    const sent = [];
    globalThis.fetch = vi.fn(async () => { sent.push(1); return new Response('{}', { status: 201 }); });
    await onRequest({
      request: await signedReq({ ...PARAMS, From: '+61295333300' }),
      env: { ...ENV, ORDERS_KV: kvStub() },
    });
    expect(sent).toHaveLength(0);
  });

  it('does not text the same caller twice inside the dedup window', async () => {
    const sent = [];
    globalThis.fetch = vi.fn(async () => { sent.push(1); return new Response('{}', { status: 201 }); });
    const kv = kvStub({ 'missed:+61412345678': '1' });
    await onRequest({ request: await signedReq(PARAMS), env: { ...ENV, ORDERS_KV: kv } });
    expect(sent).toHaveLength(0);
  });

  it('rejects an unsigned request without sending', async () => {
    const sent = [];
    globalThis.fetch = vi.fn(async () => { sent.push(1); return new Response('{}', { status: 201 }); });
    const req = await signedReq(PARAMS);
    req.headers.set('x-twilio-signature', 'forged');
    const res = await onRequest({ request: req, env: { ...ENV, ORDERS_KV: kvStub() } });
    expect(res.status).toBe(403);
    expect(sent).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd repo && npx vitest run tests/missedCall.test.js
```

Expected: FAIL — `buildMissedCallMessage is not exported`.

- [ ] **Step 3: Implement the handler**

Replace `functions/api/missed-call.js` entirely:

```js
// Cloudflare Pages Function — POST /api/missed-call
//
// Twilio calls this when a forwarded call from either shop line rings out.
// We never answer: the response is <Reject/>, so no voice minutes are billed.
// The caller gets a text inviting them to reply.
//
// Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_NUMBER (E.164), ORDERS_KV.
import { normalizeAuMobile, validTwilioSignature } from '../_shared.js';

const DEDUP_SECONDS = 6 * 60 * 60; // don't re-text the same caller within 6h
const DAILY_CAP = 100; // hard backstop against a robocall loop

const TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response><Reject/></Response>';
const twiml = (status = 200) =>
  new Response(TWIML, { status, headers: { 'content-type': 'text/xml' } });

export function buildMissedCallMessage() {
  // GSM-7 only. Promises a reply, not an immediate one — the shop is closed
  // Sundays, so "we'll get back to you" must not imply instant availability.
  return (
    'Sorry we missed your call - Xpress Phone Repairs, Riverwood Plaza. ' +
    "How can we help? Reply to this text and we'll get straight back to you."
  );
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return twiml(405);

  const raw = await request.text();
  const params = Object.fromEntries(new URLSearchParams(raw));
  const ok = await validTwilioSignature(
    request.url, params, request.headers.get('x-twilio-signature'), env.TWILIO_AUTH_TOKEN,
  );
  if (!ok) return twiml(403);

  // Landline callers and withheld numbers cannot receive SMS — sending would
  // fail and still be billed.
  const to = normalizeAuMobile(params.From);
  if (!to) return twiml();

  const kv = env.ORDERS_KV;
  const day = new Date().toISOString().slice(0, 10);
  const capKey = `missed:count:${day}`;

  if (kv) {
    try {
      if (await kv.get(`missed:${to}`)) return twiml(); // already texted recently
      if (Number(await kv.get(capKey) || 0) >= DAILY_CAP) {
        console.error('missed-call daily cap reached', day);
        return twiml();
      }
    } catch (err) {
      // Fail closed on the dedup check would brick the feature on a KV blip;
      // fail open and accept a rare duplicate text.
      console.error('missed-call KV unavailable', err);
    }
  }

  const body = new URLSearchParams({
    From: env.TWILIO_NUMBER, To: to, Body: buildMissedCallMessage(),
  });
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );
    // Status only — the response body echoes the customer's number.
    if (!res.ok) { console.error('Twilio send failed', res.status); return twiml(); }
  } catch (err) {
    console.error('Twilio request error', err);
    return twiml();
  }

  if (kv) {
    try {
      await kv.put(`missed:${to}`, '1', { expirationTtl: DEDUP_SECONDS });
      await kv.put(capKey, String(Number(await kv.get(capKey) || 0) + 1), {
        expirationTtl: 60 * 60 * 48,
      });
    } catch (err) {
      console.error('missed-call bookkeeping failed', err);
    }
  }
  return twiml();
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd repo && npx vitest run tests/missedCall.test.js
```

Expected: PASS, all seven tests in the file.

- [ ] **Step 5: Run the full suite**

```bash
cd repo && npm test
```

- [ ] **Step 6: Commit**

```bash
git add functions/api/missed-call.js tests/missedCall.test.js
git commit -m "feat(sms): missed-call auto-text with signature, dedup and cap guards"
```

## Task 7: Configure and verify live

**Files:** none — configuration and verification only.

- [ ] **Step 1: Upload the Twilio secrets, byte-exact**

From the **Bash** tool, never a PowerShell pipe:

```bash
cd repo
printf '%s' "$SID"   | npx wrangler pages secret put TWILIO_ACCOUNT_SID --project-name expressrepairs
printf '%s' "$TOKEN" | npx wrangler pages secret put TWILIO_AUTH_TOKEN  --project-name expressrepairs
printf '%s' "$NUM"   | npx wrangler pages secret put TWILIO_NUMBER      --project-name expressrepairs
```

- [ ] **Step 2: Deploy so Pages binds them**

```bash
gh workflow run deploy.yml && sleep 10 && gh run list --workflow=deploy.yml --limit 1
```

Secrets are bound at deploy time — without this they are not live.

- [ ] **Step 3: Confirm the webhook URL matches exactly**

In the Twilio console the voice webhook must be **byte-identical** to what the function sees, or every signature check fails. Use `https://expressrepairs.com.au/api/missed-call` — no `www.`, no trailing slash.

- [ ] **Step 4: Re-enable conditional forwarding on both lines**

As in Phase 0 Task 3 steps 4 and 6.

- [ ] **Step 5: Live end-to-end test**

Call `0415 303 300` from an unrelated mobile, let it ring out. Expect the text within seconds. Repeat from the landline. Then call a second time immediately and confirm **no** second text (dedup working).

- [ ] **Step 6: Verify replies reach staff**

Reply to the text. Confirm it appears in the Twilio console, and configure reply forwarding to the shop mobile so staff see it without logging in.

- [ ] **Step 7: Watch cost for two weeks**

Check the Twilio usage dashboard for unexpected volume from robocallers. If the daily cap is being hit, tighten `DEDUP_SECONDS` or `DAILY_CAP`.

---

# Workstream C — consolidate onto Twilio

**Not planned to task level yet, deliberately.** It must not start until Workstream B has run in production long enough to trust the number, and its shape depends on what Task 7 reveals about Twilio's delivery behaviour. Planning it now would be guessing.

The procedure is specified in `docs/superpowers/specs/2026-08-04-missed-call-autotext-design.md` §13: extract `sendSms()` into `_shared.js` as a behaviour-preserving refactor, reimplement it against Twilio, switch the opt-out copy to `Reply STOP to opt out.`, enable Twilio's automatic STOP suppression, verify with one live send, and only then remove the ClickSend secrets.

Write the detailed plan for it once Task 7 step 7 is complete.

---

## Self-review notes

- **Spec coverage:** §6 copy → Task 1; §7 data → Task 2 (with the documented key-per-record deviation) and Task 6; §5 guards → Tasks 5–6; §12 Phase 0 → Task 3; §13 workstream C → deferred with rationale; §11 risks → Task 3 (caller ID, Telstra charge), Task 7 step 7 (spam cost).
- **Known rough edge:** the `signedReq` helper in Task 6's tests imports `node:crypto` to build a valid signature. That is fine in Vitest (Node) but must never leak into `functions/`, which runs on Workers.
- **Not covered by unit tests, by design:** carrier behaviour. That is what Phase 0 and Task 7 exist for.

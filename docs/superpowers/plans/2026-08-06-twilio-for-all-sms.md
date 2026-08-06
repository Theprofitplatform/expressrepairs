# Twilio-for-all SMS — Consolidated Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One Twilio AU number carries every SMS the business sends — missed-call text-back, website review requests, and DXPOS customer notifications — and ClickSend is decommissioned.

**Architecture:** Workstream B (missed-call handler) is already fully planned in `2026-08-04-missed-call-autotext.md` and is executed from that document, not duplicated here. This plan adds the two unplanned pieces: **Workstream C** migrates `functions/api/review-sms.js` from ClickSend to a shared `sendSms()` helper that speaks Twilio, with ClickSend kept as an env-selected fallback until verified; **Workstream D** replaces DXPOS's stubbed `SmsService.send()` live path with a real Twilio call, so the five existing POS call sites (tickets ×2, quotes, sales, customers) start actually sending.

**Tech Stack:** Site — Astro + Cloudflare Pages Functions (Workers runtime, WebCrypto, no Node APIs), Vitest, KV `ORDERS_KV`. DXPOS — NestJS backend (Node runtime, global `fetch`), Jest.

**Specs:** `docs/superpowers/specs/2026-08-04-missed-call-autotext-design.md` (§13 governs Workstream C).

## Global Constraints

- **Workers runtime (site repo only)**: no Node `crypto`/`Buffer` under `functions/`. Use `crypto.subtle`, `btoa`, `TextEncoder`. DXPOS runs on Node — this constraint does NOT apply there.
- **Never log a customer phone number or message body.** Status codes only, in both repos.
- **Secrets upload with Bash `printf '%s'`, never a PowerShell pipe** — a PowerShell pipe appends a newline that wrangler stores verbatim and reports as success.
- **Cloudflare Pages binds env vars at DEPLOY time.** After `wrangler pages secret put`, run `gh workflow run deploy.yml` or the value is not live.
- **SMS copy must stay GSM-7** (no em dashes, no smart quotes); 2-segment ceiling is 306 characters. Re-measure on any copy change.
- Site repo: branch from `origin/main`, never local `main`. Expect additive conflicts in `tests/build-output.test.js`.
- DXPOS repo: squash-merge; Actions are billing-blocked (red checks are usually not your code) — run Jest locally before merging. A parallel agent auto-commits here; check `git branch -r --contains` before merging overlapping branches.
- **Never bulk-edit files with PowerShell Get-Content/Set-Content** — use the Edit tool or `sed -i`.

## Sequencing

```
Task 0 (owner: Twilio account + AU number)        ← the only blocker, everything waits on it
  └─ Phase 0 + Workstream B: execute 2026-08-04 plan Tasks 3–7 verbatim
       └─ [2-week production soak, Task 7 step 7]
            ├─ Workstream C (Tasks C1–C3, site repo)
            └─ Workstream D (Tasks D1–D2, DXPOS repo — independent of C, can run in parallel)
                 └─ Task E1: decommission ClickSend (after C3 AND D2 both verified)
```

Cost picture: AU mobile-prefix number ~US$8.25/mo, outbound SMS ~US$0.049/segment. ClickSend cancellation at the end offsets part of this.

---

# Task 0: Owner provisions Twilio (human-only, blocks everything)

**Files:** none.

- [ ] **Step 1: Create the Twilio account** at twilio.com using sales@funcovers.com.au. Enable 2FA.
- [ ] **Step 2: Buy one Australian MOBILE-prefix number** (starts +61 4). AU *local* numbers cannot send SMS — mobile-prefix is mandatory. AU numbers require identity/address verification (business name, ABN, address) which can take several business days — start this immediately.
- [ ] **Step 3: Hand over three values** (via the secrets runbook, never pasted into chat/committed): Account SID (`AC…`), Auth Token, the purchased number in E.164 (`+614xxxxxxxx`).
- [ ] **Step 4: Do NOT cancel ClickSend yet.** It stays live until Task E1.

Then execute **Tasks 3–7 of `2026-08-04-missed-call-autotext.md`** exactly as written (Phase 0 caller-ID gate, shared `normalizeAuMobile`, signature validation, handler, live config). That plan is the single source of truth for Workstream B; do not re-derive it from this document. Note: its Task 3 gate can genuinely fail (caller ID not surviving the Telstra divert) — if it does, Workstreams C and D are **unaffected** and proceed anyway; only the missed-call feature stops.

---

# Workstream C — migrate review-request SMS to Twilio (site repo)

Preconditions: Workstream B live and soaked per its Task 7 step 7. `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_NUMBER` already bound to the Pages project (done in B's Task 7).

Design decision, locked: `sendSms(env, to, body)` lives in `functions/_shared.js` and picks the provider from the environment — **Twilio when `TWILIO_ACCOUNT_SID` is set, ClickSend otherwise**. Rollback is therefore "delete the three Twilio secrets + redeploy", no code change. The spec's "one-line revert" is satisfied by config instead of code.

## Task C1: Extract the ClickSend send into `sendSms()` — behaviour-preserving

**Files:**
- Modify: `functions/_shared.js`
- Modify: `functions/api/review-sms.js:113-145` (the ClickSend block inside `onRequest`)
- Test: `tests/reviewSms.test.js` (must pass UNCHANGED — that is the point)

**Interfaces:**
- Produces: `sendSms(env, to, body) -> Promise<{ ok: boolean, status: number|string }>` exported from `functions/_shared.js`. `to` is E.164, `body` is the full message text. Never throws; never logs PII.

- [ ] **Step 1: Add `sendSms` to `functions/_shared.js`**

```js
// One send path for every outbound SMS. Provider is selected by env:
// Twilio when TWILIO_ACCOUNT_SID is set, ClickSend otherwise — so rollback
// to ClickSend is "remove the Twilio secrets and redeploy", no code change.
// Returns { ok, status }; never throws, never logs a number or message body.
export async function sendSms(env, to, body) {
  if (env.TWILIO_ACCOUNT_SID) return twilioSend(env, to, body);
  return clicksendSend(env, to, body);
}

async function clicksendSend(env, to, body) {
  const username = env.CLICKSEND_USERNAME;
  const apiKey = env.CLICKSEND_API_KEY;
  if (!username || !apiKey) return { ok: false, status: 'unconfigured' };
  const from = String(env.CLICKSEND_SENDER || 'Xpress').slice(0, 11);
  try {
    const res = await fetch('https://rest.clicksend.com/v3/sms/send', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${username}:${apiKey}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: [{ source: 'cf-pages', from, to, body }] }),
    });
    // ClickSend returns HTTP 200 even for a failed message — check per-message status.
    const result = await res.json().catch(() => null);
    const status = result?.data?.messages?.[0]?.status;
    if (!res.ok || status !== 'SUCCESS') {
      console.error('ClickSend send failed', res.status, status || 'no-status');
      return { ok: false, status: res.status };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    console.error('ClickSend request error', err);
    return { ok: false, status: 'network' };
  }
}

async function twilioSend(env, to, body) {
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_NUMBER;
  if (!sid || !token || !from) return { ok: false, status: 'unconfigured' };
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ From: from, To: to, Body: body }),
      },
    );
    // Twilio: HTTP 201 = accepted/queued. There is no per-message SUCCESS
    // field like ClickSend's — 201 is the success signal. Response body
    // echoes the customer's number, so log status only.
    if (res.status !== 201) {
      console.error('Twilio send failed', res.status);
      return { ok: false, status: res.status };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    console.error('Twilio request error', err);
    return { ok: false, status: 'network' };
  }
}
```

- [ ] **Step 2: Rewire `review-sms.js` to use it**

In `functions/api/review-sms.js`, add `sendSms` to the import list from `../_shared.js`. Replace lines 113–145 (from `const username = env.CLICKSEND_USERNAME;` through the ClickSend `catch` block, inclusive) with:

```js
  const reviewLink = env.REVIEW_LINK;
  const smsConfigured = env.TWILIO_ACCOUNT_SID || (env.CLICKSEND_USERNAME && env.CLICKSEND_API_KEY);
  if (!smsConfigured || !reviewLink) {
    return json(503, { ok: false, error: 'SMS sending not configured.' });
  }

  const sent = await sendSms(env, to, buildReviewMessage(data.name, reviewLink));
  if (!sent.ok) {
    return json(503, { ok: false, error: 'Could not send right now.' });
  }
```

Delete the now-unused `oneLine(env.CLICKSEND_SENDER, 11)` sender line (the sender is `sendSms`'s concern now). `oneLine` itself stays — `buildReviewMessage` still uses it.

- [ ] **Step 3: Run the existing tests UNCHANGED**

```bash
cd repo && npx vitest run tests/reviewSms.test.js
```

Expected: PASS with zero test edits. The existing tests configure ClickSend env vars and mock `fetch` to return ClickSend's `SUCCESS` shape, and no `TWILIO_ACCOUNT_SID` is in their env, so `sendSms` routes to the ClickSend path — proving the refactor preserved behaviour. If any test fails, the extraction changed behaviour: diff the request `fetch` receives against the old inline block.

- [ ] **Step 4: Run the full suite and commit**

```bash
cd repo && npm test
git add functions/_shared.js functions/api/review-sms.js
git commit -m "refactor(sms): extract provider-selecting sendSms() into _shared"
```

## Task C2: Twilio path tests + STOP-aware opt-out copy

**Files:**
- Modify: `functions/api/review-sms.js` (`buildReviewMessage` copy)
- Test: `tests/reviewSms.test.js`

**Interfaces:**
- Consumes: `sendSms(env, to, body)` from Task C1.
- Produces: `buildReviewMessage(name, reviewLink)` — unchanged signature, opt-out sentence becomes `Reply STOP to opt out.`

The copy changes because a real mobile number CAN receive replies (the `Xpress` alpha-tag could not — that is why the current copy points at the shop mobile). `Reply STOP` is the standard, and Twilio's Advanced Opt-Out then suppresses future sends automatically.

- [ ] **Step 1: Write the failing tests**

Add to `tests/reviewSms.test.js`. In the `describe` block exercising `onRequest`, add a Twilio-env test; in the `buildReviewMessage` block, update the opt-out assertion:

```js
  // In the buildReviewMessage describe block, REPLACE
  //   expect(msg).toContain('To opt out, call or text 0415 303 300.');
  // with:
  expect(msg).toContain('Reply STOP to opt out.');
```

```js
  // In the onRequest describe block:
  it('sends via Twilio when TWILIO_ACCOUNT_SID is set', async () => {
    const calls = [];
    globalThis.fetch = vi.fn(async (url, opts) => {
      calls.push({ url, opts });
      return new Response('{}', { status: 201 });
    });
    const env = {
      ...FULL_ENV, // keeps ClickSend vars — Twilio must WIN, not merely work alone
      TWILIO_ACCOUNT_SID: 'ACtest',
      TWILIO_AUTH_TOKEN: 'tok',
      TWILIO_NUMBER: '+61480000000',
    };
    const res = await onRequest({
      request: makeReq({ body: { name: 'Sam', mobile: '0412345678', pin: PIN } }),
      env,
    });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain('api.twilio.com');
    expect(String(calls[0].opts.body)).toContain('To=%2B61412345678');
  });

  it('returns 503 when Twilio rejects the send', async () => {
    globalThis.fetch = vi.fn(async () => new Response('{}', { status: 400 }));
    const env = {
      ...FULL_ENV,
      TWILIO_ACCOUNT_SID: 'ACtest',
      TWILIO_AUTH_TOKEN: 'tok',
      TWILIO_NUMBER: '+61480000000',
    };
    const res = await onRequest({
      request: makeReq({ body: { name: 'Sam', mobile: '0412345678', pin: PIN } }),
      env,
    });
    expect(res.status).toBe(503);
  });
```

(`FULL_ENV`, `makeReq`, `PIN` are the file's existing helpers — reuse them, do not redefine.)

- [ ] **Step 2: Run to verify the new tests fail**

```bash
cd repo && npx vitest run tests/reviewSms.test.js
```

Expected: the copy assertion fails (old opt-out text still present) and the Twilio-env test fails only if C1's routing is wrong — it may already pass, which is fine; the copy test is the red driver here.

- [ ] **Step 3: Change the copy**

In `buildReviewMessage`, replace the trailing `To opt out, call or text 0415 303 300.` sentence with `Reply STOP to opt out.` Keep everything else identical. Re-measure: the message SHRINKS (~26 chars shorter), so the existing ≤306 segment-guard test keeps passing with margin.

- [ ] **Step 4: Run all tests, then the full suite**

```bash
cd repo && npx vitest run tests/reviewSms.test.js && npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/api/review-sms.js tests/reviewSms.test.js
git commit -m "feat(sms): review requests send via Twilio, Reply STOP opt-out"
```

## Task C3: Console config + live verification

**Files:** none — configuration and verification only.

- [ ] **Step 1: Enable Twilio Advanced Opt-Out** on the number's Messaging service (console → Messaging → Services → Opt-Out Management). Confirm STOP/START keywords are active. This is what makes `Reply STOP` legally real.
- [ ] **Step 2: Route inbound SMS to staff.** The number's Messaging webhook should already forward replies to the shop mobile from Workstream B Task 7 step 6; confirm a reply to a review text reaches staff the same way.
- [ ] **Step 3: Merge, deploy, and confirm** `gh run list --workflow=deploy.yml --limit 1` is green. No new secrets needed — Twilio vars were bound in Workstream B.
- [ ] **Step 4: One live send to the shop mobile** via `/staff/review-request` (PIN from `C:\Users\sales\review-sms-pin.txt`). Verify: text arrives **from the Twilio +61 4xx number** (not `Xpress`), copy ends `Reply STOP to opt out.`, Google review link works.
- [ ] **Step 5: Live STOP round-trip.** Reply STOP from the shop mobile, confirm Twilio logs the opt-out, then attempt one more send to the shop mobile and confirm Twilio suppresses it (send returns an error status → staff page shows "Could not send right now" — expected and correct). Then text START to re-subscribe the shop mobile.
- [ ] **Step 6: Do NOT remove ClickSend secrets yet** — that is Task E1, gated on Workstream D too.

---

# Workstream D — wire DXPOS's SmsService to Twilio (DXPOS repo)

Preconditions: Twilio number live (Workstream B). Independent of Workstream C — can run in parallel with it.

Today `SmsService.send()` is a stub: `SMS_MODE=live` only logs a warning and pretends success (`backend/src/common/integrations/sms.service.ts:31`). Five call sites already exist (tickets ×2, quotes, sales, customers) and pass `customer.phone` in whatever format the POS stored — so the live path must normalise AU mobiles itself and refuse non-mobiles.

## Task D1: Real Twilio send in `SmsService`

**Files:**
- Modify: `backend/src/common/integrations/sms.service.ts` (whole file)
- Modify: `backend/src/common/config/configuration.ts` (add twilio keys to `integrations`)
- Test: Create `backend/src/common/integrations/sms.service.spec.ts`

**Interfaces:**
- Consumes: `ConfigService` (existing), `integrations.sms` config key (existing), new config keys `integrations.twilioSid`, `integrations.twilioToken`, `integrations.twilioNumber`.
- Produces: unchanged public interface — `send(msg: SmsMessage): Promise<SmsResult>` with the same `SmsMessage`/`SmsResult` types, so none of the five call sites change.

- [ ] **Step 1: Add the config keys**

In `backend/src/common/config/configuration.ts`, inside the `integrations` interface block (after line 22, `tyroWebhookSecret?: string;`):

```ts
    twilioSid?: string;
    twilioToken?: string;
    twilioNumber?: string;
```

and inside the `integrations` object literal (after line 58, `tyroWebhookSecret: process.env.TYRO_WEBHOOK_SECRET,`):

```ts
    twilioSid: process.env.TWILIO_ACCOUNT_SID,
    twilioToken: process.env.TWILIO_AUTH_TOKEN,
    twilioNumber: process.env.TWILIO_NUMBER,
```

- [ ] **Step 2: Write the failing tests**

Create `backend/src/common/integrations/sms.service.spec.ts`:

```ts
import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';

function makeService(cfg: Record<string, string | undefined>) {
  const config = { get: (k: string) => cfg[k] } as unknown as ConfigService;
  return new SmsService(config);
}

const LIVE_CFG = {
  'integrations.sms': 'live',
  'integrations.twilioSid': 'ACtest',
  'integrations.twilioToken': 'tok',
  'integrations.twilioNumber': '+61480000000',
};

describe('SmsService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('stub mode never calls fetch', async () => {
    const spy = jest.spyOn(globalThis, 'fetch');
    const res = await makeService({ 'integrations.sms': 'stub' }).send({
      to: '0412 345 678',
      text: 'hi',
    });
    expect(res.status).toBe('sent');
    expect(spy).not.toHaveBeenCalled();
  });

  it('live mode posts to Twilio with a normalised E.164 number', async () => {
    const spy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"sid":"SMx"}', { status: 201 }));
    const res = await makeService(LIVE_CFG).send({ to: '0412 345 678', text: 'hi' });
    expect(res.status).toBe('sent');
    const [url, opts] = spy.mock.calls[0];
    expect(String(url)).toContain('/Accounts/ACtest/Messages.json');
    expect(String(opts!.body)).toContain('To=%2B61412345678');
    expect(String(opts!.body)).toContain('From=%2B61480000000');
  });

  it('live mode fails without touching the network for a non-mobile number', async () => {
    const spy = jest.spyOn(globalThis, 'fetch');
    const res = await makeService(LIVE_CFG).send({ to: '02 9533 3300', text: 'hi' });
    expect(res.status).toBe('failed');
    expect(spy).not.toHaveBeenCalled();
  });

  it('live mode reports failed on a Twilio error response', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 400 }));
    const res = await makeService(LIVE_CFG).send({ to: '0412345678', text: 'hi' });
    expect(res.status).toBe('failed');
  });

  it('live mode without Twilio config fails loudly instead of pretending', async () => {
    const res = await makeService({ 'integrations.sms': 'live' }).send({
      to: '0412345678',
      text: 'hi',
    });
    expect(res.status).toBe('failed');
  });
});
```

- [ ] **Step 3: Run to verify they fail**

```bash
cd ~/claudee/DXPOS/backend && npx jest src/common/integrations/sms.service.spec.ts
```

Expected: FAIL — live-mode tests get `status: 'sent'` from the pretend path, non-mobile test gets `sent`, unconfigured test gets `sent`.

- [ ] **Step 4: Implement**

Replace the body of `backend/src/common/integrations/sms.service.ts` below the interfaces (keep `SmsMessage`/`SmsResult` exactly as they are):

```ts
/**
 * SMS adapter. 'stub' mode (default) logs only. 'live' mode sends through
 * Twilio. Same Twilio account/number as the website's review + missed-call
 * texts — one provider for everything.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  async send(msg: SmsMessage): Promise<SmsResult> {
    const mode = this.config.get<string>('integrations.sms');
    if (mode !== 'live') {
      this.logger.log(`[stub SMS] -> ${msg.to}: ${msg.text}`);
      return { id: `sms_${Date.now()}`, status: 'sent' };
    }

    const sid = this.config.get<string>('integrations.twilioSid');
    const token = this.config.get<string>('integrations.twilioToken');
    const from = this.config.get<string>('integrations.twilioNumber');
    if (!sid || !token || !from) {
      // Fail loudly: the old stub "treated as sent", which hid a dead channel.
      this.logger.error('SMS_MODE=live but Twilio env vars are missing');
      return { id: `sms_${Date.now()}`, status: 'failed' };
    }

    const to = normalizeAuMobile(msg.to);
    if (!to) {
      // Landline or malformed number — a Twilio send would fail and still bill.
      this.logger.warn('SMS skipped: recipient is not an AU mobile');
      return { id: `sms_${Date.now()}`, status: 'failed' };
    }

    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ From: from, To: to, Body: msg.text }),
        },
      );
      if (res.status !== 201) {
        // Status only — the Twilio response body echoes the customer's number.
        this.logger.error(`Twilio send failed: HTTP ${res.status}`);
        return { id: `sms_${Date.now()}`, status: 'failed' };
      }
      const data = (await res.json().catch(() => null)) as { sid?: string } | null;
      return { id: data?.sid ?? `sms_${Date.now()}`, status: 'sent' };
    } catch (err) {
      this.logger.error(`Twilio request error: ${(err as Error).message}`);
      return { id: `sms_${Date.now()}`, status: 'failed' };
    }
  }
}

// AU mobile -> E.164 (+614xxxxxxxx), or null if it isn't a valid AU mobile.
// Same logic as the website's functions/_shared.js normalizeAuMobile — kept in
// sync by the spec tests in both repos (separate repos, no shared package).
export function normalizeAuMobile(raw: string): string | null {
  const s = String(raw ?? '').trim();
  const hadPlus = s.startsWith('+');
  const digits = s.replace(/[^\d]/g, '');
  let national: string;
  if (hadPlus && digits.startsWith('61')) national = digits.slice(2);
  else if (!hadPlus && digits.length === 11 && digits.startsWith('61')) national = digits.slice(2);
  else if (digits.startsWith('0')) national = digits.slice(1);
  else national = digits;
  if (!/^4\d{8}$/.test(national)) return null;
  return `+61${national}`;
}
```

Note: the stub-mode log line keeps printing the number and text — acceptable because stub mode only runs in dev; the LIVE path never logs either.

- [ ] **Step 5: Run the tests, then the file's neighbours**

```bash
cd ~/claudee/DXPOS/backend && npx jest src/common/integrations/sms.service.spec.ts
npx jest src/modules/tickets src/modules/quotes --silent
```

Expected: all PASS. The call-site suites must pass untouched — the public interface didn't change.

- [ ] **Step 6: Commit (branch + PR, squash-merge per repo convention)**

```bash
cd ~/claudee/DXPOS && git checkout -b feat/twilio-sms origin/main
git add backend/src/common/integrations/sms.service.ts backend/src/common/integrations/sms.service.spec.ts backend/src/common/config/configuration.ts
git commit -m "feat(sms): live Twilio path in SmsService with AU-mobile guard"
git push -u origin feat/twilio-sms && gh pr create --fill
```

Remember: DXPOS CI is billing-blocked — the local Jest run above is the verification; note that in the PR body.

## Task D2: Configure the shop PC and verify live

**Files:** the DXPOS `.env` on the shop PC (not in the repo).

- [ ] **Step 1: Add to the backend `.env` on the shop PC** (via the pos-tunnel runbook access, `expressrepairs/pos-tunnel/README.md`):

```
SMS_MODE=live
TWILIO_ACCOUNT_SID=AC…
TWILIO_AUTH_TOKEN=…
TWILIO_NUMBER=+614xxxxxxxx
```

Edit the file directly (no PowerShell piping). Restart the DXPOS backend.

- [ ] **Step 2: Live test with the shop mobile as the customer.** Create/use a test customer whose phone is the shop mobile, trigger the customers-module direct SMS (`customers.service.ts:448` path — the simplest call site), confirm the text arrives from the Twilio number.
- [ ] **Step 3: Confirm a landline customer does NOT error the flow** — repeat with a customer whose phone is `02 9533 3300`; the POS action must complete normally (SMS reports `failed`, operation itself unaffected).
- [ ] **Step 4: Check the Twilio console** shows both attempts correctly (one sent, zero for the landline — it never reached Twilio).

---

# Task E1: Decommission ClickSend (only after C3 AND D2 both verified)

**Files:**
- Modify: `functions/_shared.js` (delete `clicksendSend` and the provider branch — `sendSms` becomes Twilio-only)
- Modify: `functions/api/review-sms.js` (drop `CLICKSEND_*` from the config-check line and the header comment)
- Test: `tests/reviewSms.test.js` (remove ClickSend-shaped fetch mocks; Twilio mocks from C2 become the only ones)

- [ ] **Step 1: Two-week soak first.** Both workstreams live and quiet for two weeks (mirrors Workstream B's soak) — rollback needs ClickSend intact.
- [ ] **Step 2: Simplify `sendSms` to Twilio-only.** In `_shared.js` delete `clicksendSend` and change `sendSms` to call `twilioSend` unconditionally. In `review-sms.js` the configured-check becomes `if (!env.TWILIO_ACCOUNT_SID || !reviewLink)`. Update any remaining ClickSend-env test fixtures to Twilio-env. Run `npm test` — PASS — then commit:

```bash
git add functions/_shared.js functions/api/review-sms.js tests/reviewSms.test.js
git commit -m "chore(sms): drop ClickSend path, Twilio is the only provider"
```

- [ ] **Step 3: Remove the Pages secrets and redeploy:**

```bash
cd repo
npx wrangler pages secret delete CLICKSEND_USERNAME --project-name expressrepairs
npx wrangler pages secret delete CLICKSEND_API_KEY  --project-name expressrepairs
npx wrangler pages secret delete CLICKSEND_SENDER   --project-name expressrepairs
gh workflow run deploy.yml
```

(Local wrangler OAuth was expired as of 2026-07 — if these fail auth, delete the secrets in the CF dashboard instead, then trigger deploy.yml.)

- [ ] **Step 4: Owner closes the ClickSend account** (their login). One live review-request send afterwards as a final smoke test.

---

## Self-review notes

- **Spec coverage (§13):** step 1 → Task C1; step 2 → C1 (`twilioSend`) + C2 tests; step 3 → C2 copy + C3 step 1; step 4 → C3 step 2; step 5 → C3 steps 4–5; step 6 → E1. DXPOS was out of the spec's scope; Workstream D follows the same provider decisions.
- **Rollback story:** C is config-only rollback until E1 removes the code path — which is why E1 is last and soaked. D's rollback is `SMS_MODE=stub` + restart.
- **Duplication accepted:** `normalizeAuMobile` exists in both repos (separate repos, no shared package). Both copies are pinned by equivalent tests; a change to one must be mirrored — noted in the code comment.
- **Type consistency:** `sendSms(env, to, body)` used identically in C1/C2/E1; `SmsMessage`/`SmsResult` untouched across all five DXPOS call sites.

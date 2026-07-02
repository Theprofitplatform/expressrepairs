# Review-Request SMS — Design Spec

**Date:** 2026-07-01
**Status:** Approved (design), pending implementation plan
**Owner surface:** Cloudflare Pages (`expressrepairs`), Astro site + Pages Functions

## 1. Goal

Give shop staff a fast, phone-friendly way to send a just-repaired customer a
Google-review request by SMS. This drives the 5★ review volume the off-site SEO
plan (`docs/seo-offsite-kit.md` §7) is chasing, using wording that plan already
approved.

The trigger is **manual** — staff enter the customer's first name and mobile off
the job docket and hit send. No Lightspeed integration, no cron, no webhook. SMS
is delivered via **ClickSend** with a branded alphanumeric sender ID.

## 2. Non-goals (YAGNI)

- **No Lightspeed detection** of completed repairs (manual trigger chosen instead).
- **No scheduled/automatic sending** — every send is a deliberate staff action.
- **No inbound reply handling / STOP processing.** Branded alphanumeric senders
  are send-only. Consent is *inferred* under the Spam Act 2003 (existing customer,
  immediately post-service, low volume, manual). If a hard opt-out path is ever
  needed, switch `CLICKSEND_SENDER` to a rented ClickSend virtual number later —
  no code change beyond the config value.
- **No send log / dedup store** in the MVP. Staff control sends manually, so
  double-texts are unlikely at this volume. A KV-backed "already texted" warning
  can be added later if it becomes a real problem.
- **No marketing/bulk blasts.** One customer at a time.

## 3. Architecture & flow

```
Staff phone/tablet
  → /staff/review-request           (Astro page, noindex, PIN-gated)
       inputs: first name, mobile, [device optional], PIN
  → POST /api/review-sms            (Cloudflare Pages Function)
       1. method === POST                              else 405
       2. sameSite(request, env) guard                 else 403   (reused from lead.js)
       3. content-length <= 16 KB                       else 413
       4. PIN === REVIEW_SMS_PIN (length-safe compare)  else 401
       5. normalise mobile → +614xxxxxxxx (AU mobile)   else 400
       6. build message from template + REVIEW_LINK
       7. ClickSend REST send
             - HTTP not ok OR per-message status != SUCCESS → 503
       8. → 200 { ok: true, to }
```

The site is static Astro on Cloudflare Pages; Pages Functions provide the
server side (same model as the existing `/api/lead` endpoint). Nothing new in the
hosting model.

## 4. Components

### 4.1 Staff page — `src/pages/staff/review-request.astro`
A deliberately plain internal page, **not linked from any public navigation** and
emitting `<meta name="robots" content="noindex,nofollow">`.

- Inputs: **First name** (text), **Mobile** (tel), **Device** (text, optional,
  used only for staff clarity — not currently in the message), **PIN** (password).
- The PIN is stored in `localStorage` after first successful send so it's typed
  once per device, not per message.
- A single primary button **"Send review request"**.
- A live status line showing success (`Sent to +61…`) or the specific error.
- Minimal inline CSS; no dependency on the public site's component library beyond
  the base layout. Speed and clarity over polish — this is an internal tool.

### 4.2 API — `functions/api/review-sms.js`
Mirrors `functions/api/lead.js` conventions: `onRequest({ request, env })`,
POST-only, `sameSite()` origin/referer guard, 16 KB body cap, `json(status, body)`
helper, and the **503-not-502** failure pattern (Cloudflare replaces a 502 from a
Pages Function with its own HTML page, so the client never sees our JSON; 503
passes through).

New logic:

- **PIN check** — compare submitted `pin` to `env.REVIEW_SMS_PIN` with a
  length-safe / constant-time-ish comparison. Missing or wrong → `401`. If
  `REVIEW_SMS_PIN` is unset → `503` ("not configured"), never an open endpoint.
- **AU mobile normalisation → E.164** (`normalizeAuMobile`):
  1. Strip spaces, hyphens, parentheses, dots, and a leading `+`.
  2. Map to `+614xxxxxxxx`:
     - `04XXXXXXXX` (10 digits) → `+61` + last 9 (drop leading 0)
     - `4XXXXXXXX` (9 digits) → `+61` + all
     - `614XXXXXXXX` (11 digits) → `+` + all
     - already `+614XXXXXXXX` → unchanged
  3. Validate final against `^\+614\d{8}$`. Anything else (landline, typo,
     overseas) → `400` "Enter a valid Australian mobile number."
- **ClickSend send**:
  - `POST https://rest.clicksend.com/v3/sms/send`
  - Header `Authorization: Basic base64(CLICKSEND_USERNAME:CLICKSEND_API_KEY)`
  - Body:
    ```json
    { "messages": [ { "source": "cf-pages", "from": "<CLICKSEND_SENDER>",
                      "to": "+614xxxxxxxx", "body": "<message>" } ] }
    ```
  - **Success check is two-layer**: ClickSend returns HTTP 200 even when an
    individual message fails, so treat the send as OK only when
    `res.ok` AND `data.data.messages[0].status === 'SUCCESS'`. Otherwise log the
    body and return `503`.
  - If `CLICKSEND_USERNAME` / `CLICKSEND_API_KEY` unset → `503` "SMS not configured."

### 4.3 Message template
Reuses the SEO-kit §7 wording:

```
Hi {name}, thanks for choosing Xpress Phone Repairs at Riverwood Plaza! If you're
happy with the repair, a quick Google review means a lot to us: {REVIEW_LINK}
— The team
```

- `{name}` = submitted first name (single-line, length-capped, HTML not relevant
  for SMS but still sanitise control chars).
- `{REVIEW_LINK}` = `env.REVIEW_LINK`.
- The preamble + a short `g.page/r/…/review` link may exceed 160 GSM-7 chars and
  roll to a second segment. That is acceptable (~2× a few cents); ClickSend
  concatenates automatically. Keep the copy tight to stay near one segment.
- **Compliance:** identifies the business (Spam Act requirement); no incentive is
  offered; staff are instructed to ask *every* customer, not only happy ones
  (Google/ACCC anti-gating rule, per SEO kit §7).

## 5. Configuration (Cloudflare Pages → Settings → Environment variables)

| Key | Type | Required | Purpose |
|---|---|---|---|
| `CLICKSEND_USERNAME` | secret | yes | ClickSend account username |
| `CLICKSEND_API_KEY` | secret | yes | ClickSend API key |
| `REVIEW_SMS_PIN` | secret | yes | staff PIN gating the send endpoint |
| `REVIEW_LINK` | plaintext | yes | `https://g.page/r/…/review` (from GBP dashboard) |
| `CLICKSEND_SENDER` | plaintext | no | sender ID, default `Xpress` (≤11 chars, alphanumeric) |

Owner setup tasks (outside code):
1. Create/confirm a ClickSend account; copy username + API key.
2. Confirm the alphanumeric sender ID `Xpress` is permitted on the account
   (some ClickSend accounts require sender-ID registration; if so, register it or
   fall back to a shared number).
3. Copy the review short link from **GBP dashboard → Ask for reviews**.
4. Choose a PIN.
5. Add all five values as Pages env vars/secrets, then redeploy.

## 6. Security considerations

- **Same-site guard** blocks scripted cross-origin POSTs (reused from `lead.js`).
- **PIN** blocks casual abuse from anyone who finds the page URL; the page is
  `noindex` and unlinked, so discovery is unlikely in the first place.
- **AU-mobile-only validation** means a compromised/guessed PIN still can't be
  used to text arbitrary international numbers.
- **No rate limiting in MVP** — a holder of the PIN could send repeatedly. Low
  risk for a small trusted team; a per-IP KV limit or Turnstile can be added later
  if abuse appears (same note as `lead.js`).
- Secrets (`CLICKSEND_*`, `REVIEW_SMS_PIN`) live only in Pages env, never in the
  client bundle. The staff page posts the PIN; it is validated server-side only.

## 7. Testing

New `tests/reviewSms.test.js` mirroring `tests/lead.test.js` (import `onRequest`,
fabricate `request` with `Headers` + `json()`, mock `globalThis.fetch`):

- Method guard: non-POST → 405.
- Origin guard: cross-origin → 403, no fetch.
- Config guard: missing ClickSend creds → 503; missing PIN secret → 503.
- PIN: wrong/missing PIN → 401, no fetch.
- Mobile normalisation (unit-level table): `0412 345 678`, `+61 412 345 678`,
  `61412345678`, `412345678` all → `+61412345678`; landline `0298765432` and
  junk → 400, no fetch.
- Happy path: valid PIN + mobile, ClickSend mocked `{ data: { messages:
  [{ status: 'SUCCESS' }] } }` → 200 `{ ok: true, to: '+61412345678' }`, and the
  outgoing body contains the name + `REVIEW_LINK`.
- Failure path: ClickSend returns per-message non-SUCCESS (HTTP 200) → 503;
  network throw → 503.

`npm test` (vitest) must stay green. No build-output test changes expected (the
staff page is `noindex` and excluded from the sitemap; confirm it doesn't break
`tests/build-output.test.js` / `tests/routing.test.js` expectations, adjusting the
allow-list if those assert an exact page set).

## 8. Deliverables

1. `src/pages/staff/review-request.astro` — staff page.
2. `functions/api/review-sms.js` — send endpoint (+ exported `normalizeAuMobile`
   for unit testing).
3. `tests/reviewSms.test.js` — test suite.
4. README / docs note pointing at the five env vars and the owner setup steps.

## 9. Open items (owner-supplied, not blockers to building)

- ClickSend account credentials.
- `REVIEW_LINK` from the GBP dashboard.
- Confirm `Xpress` sender ID is allowed on the ClickSend account.
- Choose the staff PIN.

# Missed-call auto-text + review-SMS follow-ups — design

**Date:** 2026-08-04
**Status:** design, awaiting approval
**Related:** `2026-07-01-review-request-sms-design.md` (the live review-request SMS tool)

## 1. Goal

Two independent workstreams, sequenced so the cheap one ships first.

**A. Review-SMS follow-ups (no external dependencies, ship immediately).**
Close the Spam Act opt-out gap on the live review-request SMS, and give the shop
its own record of what was sent.

**B. Missed-call auto-text (blocked on an external number + a verification gate).**
When someone calls the shop mobile `0415 303 300` or the landline
`(02) 9533 3300` and nobody picks up, automatically text them back:
*"Sorry we missed your call. How can we help?"*

**C. Consolidate SMS onto one vendor (last, only after B is proven).**
Move review-request sending off ClickSend onto the same Twilio number, gaining
automated `reply STOP` handling, and retire ClickSend. Rationale and sequencing
in §2.1.

Owner constraints captured 2026-08-04: both lines in scope; nobody uses
voicemail, so there is no voicemail behaviour to preserve; budget under ~$15/month
all-in; both lines are on **Telstra**.

## 2. Why the website cannot do this alone

A missed call is invisible to the site. It happens inside the carrier network —
no HTTP request is generated, so no Pages Function can observe it. The only way
to detect one is to route unanswered calls to a programmable number that reports
the call to us.

**ClickSend cannot fill that role in Australia.** Per ClickSend's own docs, when
someone calls an Australian dedicated number "they'll hear a busy tone or a
message saying the number doesn't exist", and call forwarding "is only available
in the U.S and The U.K." A forwarded call arriving at a ClickSend AU number would
simply die. ClickSend keeps **sending** SMS for now (workstream A) but can never
**receive calls**, which is why workstream B needs a different vendor — and, in
turn, why consolidating onto that vendor becomes worthwhile (§2.1).

So workstream B requires one programmable-voice number. Twilio is chosen for
documentation quality and AU availability; any equivalent provider would work,
and the design isolates the vendor behind a single webhook so swapping is cheap.

### 2.1 Consolidating on Twilio (owner question, 2026-08-04)

Once a Twilio two-way number exists for workstream B, running ClickSend *as well*
means two SMS credentials, two send paths, two failure modes and two message
histories inside one small codebase. Consolidating is the right end state:

- **Cheaper per message** — ~5.15c vs ClickSend's ~7.2c per segment, so a
  2-segment review request drops from ~14.4c to ~10.3c.
- **Better compliance** — a two-way number supports real `reply STOP` handling,
  the mechanism ACMA expects, and it can be automated. The ClickSend `Xpress`
  alpha tag can never do this (see §6).
- **No monthly saving, though** — ClickSend is PAYG with no standing fee, so
  retiring it saves nothing while idle. The gain is simplicity and compliance,
  not cost.

**But it is sequenced, not a big-bang.** The review-request path went live
2026-08-03 and is verified working; it is not rewritten onto a dependency that
has not yet proven itself. Order: ship the opt-out line on ClickSend now (§6,
free, closes a live gap today) → provision Twilio and pass the Phase 0
caller-ID gate → only then migrate review-request sending to Twilio and retire
ClickSend. If Phase 0 fails, workstream B is abandoned and the review tool is
untouched and still working.

## 3. Architecture (workstream B)

```
caller ──▶ 0415 303 300 (Telstra mobile)   ─┐
                  │ rings out / busy        │ conditional call forwarding
caller ──▶ (02) 9533 3300 (Telstra fixed)  ─┤ (both lines → one number)
                  │ rings out               │
                  ▼                         ▼
            Twilio AU number  ──webhook──▶  POST /api/missed-call
                  │                              │
            <Reject/> (no answer charge)         │ verify signature
                                                 │ guards (see §5)
                                                 ▼
                                          send SMS to caller
```

**One number serves both lines.** Both Telstra lines forward to the same Twilio
number, so this is one monthly fee, not two. The webhook cannot tell (and does
not need to tell) which line was missed.

**The call is never answered.** The function responds with TwiML `<Reject/>`,
so there is no per-minute voice charge and the caller is not held on a dead line.
This is only acceptable because the owner confirmed nobody uses voicemail —
forwarding would otherwise replace voicemail and silently lose messages.

## 4. Sending the reply: use the Twilio number, not `Xpress`

The requested copy — "how can we help?" — invites a reply. The existing `Xpress`
alphanumeric sender **cannot receive one**; carriers block replies to alpha tags.
Sending this particular message from `Xpress` would create a dead end and read as
the shop ignoring the customer.

Therefore workstream B sends from the Twilio mobile-prefix number, which is
two-way. Inbound replies are forwarded to the shop mobile so staff see them.

Cheaper alternative, explicitly rejected: catch the call on a $3/month Twilio
*local* number and send via ClickSend `Xpress` at 7.2c. Saves ~$5/month but the
customer cannot reply, which defeats the purpose of the message. Revisit only if
cost becomes a problem. Switching is a config change, not a redesign.

The same two-way number later carries the review-request SMS as well (§2.1), so
one number ends up serving both features and one vendor serves the whole system.

## 5. Guards (all reuse existing code)

These are not optional polish — each prevents a real failure or cost.

| Guard | Why | Reuses |
|---|---|---|
| **Twilio signature validation** | `/api/missed-call` is a public endpoint that *spends money*. Unvalidated, anyone could POST it and turn the account into a spam cannon. **Security boundary — must not be simplified away.** | new (Twilio `X-Twilio-Signature` HMAC-SHA1) |
| **Mobile-only** | Landline callers cannot receive SMS. Texting them fails and is billed. | `normalizeAuMobile()` from `functions/api/review-sms.js` |
| **Dedup window** | One persistent caller or a robocall loop would otherwise text repeatedly and run up the bill. Suppress repeats within 6 hours. | KV counter pattern from `functions/_shared.js` |
| **Daily cap** | Hard backstop on total spend if something loops. Log and stop when exceeded. | same KV pattern |
| **Withheld numbers** | Anonymous/blocked CLI has nothing to text. Skip silently. | — |

`normalizeAuMobile()` currently lives in `review-sms.js`. It is now used by two
endpoints, so it moves to `functions/_shared.js` alongside the other shared
helpers. Its existing tests move with it.

## 6. Message copy

**Missed call (workstream B):**

> Sorry we missed your call — Xpress Phone Repairs, Riverwood Plaza. How can we
> help? Reply to this text and we'll get straight back to you.

Identifies the business (Spam Act requirement). Makes a promise the channel can
actually keep, because the sending number is repliable. No opt-out line needed:
this is a direct response to someone who just contacted the business, so consent
is inherent and it is arguably not a commercial message at all.

**Review request (workstream A)** — append an opt-out to the existing copy:

> ... a quick Google review means a lot to us: {link} - The team. To opt out,
> call or text 0415 303 300.

Verified: this lands at 234 characters against the 306-character ceiling for two
GSM-7 segments, so **the opt-out costs nothing** — still 2 segments, still ~14.4c.
The opt-out is actionable without a reply-capable sender because the shop mobile
accepts both calls and texts. Staff must honour opt-outs within 5 business days.

**After the Twilio migration (§2.1)** this line becomes `Reply STOP to opt out.`
— shorter, standard, and automatable: Twilio suppresses further sends to a number
that replies STOP, so compliance stops depending on staff remembering. This is
the main non-cost reason to consolidate. Until the migration lands, the
call-or-text wording above is the compliant interim.

## 7. Data

New KV keys in the existing `ORDERS_KV` binding (no new infrastructure):

- `missed:<e164>` — dedup marker, 6-hour TTL.
- `missed:count:<YYYY-MM-DD>` — daily send counter for the cap, 48-hour TTL.
- `reviewsms:<YYYY-MM-DD>` — send counter for workstream A's log, mirroring the
  existing `lead:*` pattern in `functions/api/lead.js`. PII-free: a count, not
  a phone number.

Deliberately **not** stored: customer phone numbers, message bodies, or any
per-customer history. ClickSend and Twilio each retain their own searchable
message history and CSV export, which is the system of record. Duplicating it
here would add a PII store for no operational gain.

## 8. Costs

| Item | Cost |
|---|---|
| Twilio AU mobile-prefix number | ~$8.25/month |
| Outbound SMS (Twilio AU) | ~5.15c each |
| Inbound call (rejected) | ~$0 |
| ClickSend, until retired in workstream C | PAYG, no standing fee |
| Telstra forwarded leg | **unknown — must be confirmed against the owner's plan** |

Within the ~$15/month ceiling at typical volume. The single Twilio number is the
only recurring cost and it serves both features once workstream C lands. The
Telstra forwarding charge is the one genuine unknown and is checked in Phase 0
before anything is switched on.

## 9. Non-goals (YAGNI)

- No voicemail recording or transcription — nobody uses voicemail.
- No business-hours logic. A Sunday caller gets the same text and a reply on
  Monday. (Note: the shop is closed Sundays; the copy promises a reply, not an
  immediate one, so no false availability claim.)
- No CRM, no staff dashboard, no analytics UI. Twilio and ClickSend already
  provide searchable history and CSV export.
- No auto-reply to inbound SMS. Replies forward to staff, who answer as humans.
- No porting of existing numbers. Forwarding only, fully reversible.

## 10. Testing

Unit tests (Vitest, mirroring `tests/reviewSms.test.js`):

- `normalizeAuMobile()` still passes its existing suite after moving to `_shared.js`.
- Landline caller → no send.
- Withheld/empty caller → no send.
- Second call within the dedup window → no send.
- Daily cap reached → no send, error logged.
- Invalid Twilio signature → 403, no send.
- Message body contains the business name and stays within 2 segments.

Live verification is Phase 0 below — the unit tests cannot prove the carrier
behaviour, which is the actual risk.

## 11. Risks

**1. Caller ID through a Telstra divert (blocking).** The entire feature depends
on the *original* caller's number surviving the forward. If Telstra presents the
diverting number instead, the shop would text itself on every missed call.
Twilio's Australian caller-ID restrictions concern *outbound* caller-ID spoofing,
not inbound `From` on a forwarded call, so this should work — but "should" is not
good enough to build on. **Phase 0 settles it with one test call before any code
is written.**

**2. Telstra may bill the forwarded leg.** Checked in Phase 0.

**3. Twilio AU number provisioning** requires identity/address verification and
can take several business days. Started first so it runs in parallel.

**4. Spam and robocalls** inflate cost. Mitigated by the dedup window and daily
cap; monitored for the first fortnight.

**5. Vendor lock-in.** Isolated behind one webhook endpoint; swapping providers
means changing the signature check and the send call, not the design.

## 12. Phase 0 — verification gate

Before any implementation:

1. Provision a Twilio AU number (long lead time — start first).
2. Point it at a temporary endpoint that only logs the inbound `From` and
   `ForwardedFrom` parameters. No SMS sending.
3. Set conditional forwarding on the mobile, call it from an unrelated phone,
   let it ring out.
4. **Confirm the logged `From` is the test caller, not `0415 303 300`.**
5. Repeat from the landline.
6. Check the Telstra bill/plan for the forwarded leg charge.

If step 4 fails, stop and redesign. Workstream A is unaffected and ships anyway.

## 13. Workstream C — migrating review-request SMS to Twilio

Only started once workstream B is live and the Twilio number has proven itself in
production. Deliberately small, because the surrounding logic (PIN gate, rate
limiting, mobile validation, message builder, tests) is unchanged — only the
transport swaps.

1. Extract the ClickSend `fetch` in `functions/api/review-sms.js` into a
   `sendSms()` helper in `_shared.js`, so both endpoints share one send path.
   Behaviour-preserving refactor, existing tests must stay green.
2. Reimplement `sendSms()` against the Twilio Messages API using the same number
   as workstream B. Twilio returns a queued status rather than ClickSend's
   per-message `SUCCESS`, so the success check changes — this is the one real
   behavioural difference and needs its own test.
3. Change the opt-out copy to `Reply STOP to opt out.` (§6) and enable Twilio's
   automatic STOP suppression.
4. Route inbound STOP replies and normal replies to the shop mobile so staff see
   them.
5. Run one live send to the shop mobile, exactly as workstream A was verified.
6. Only then remove `CLICKSEND_USERNAME` / `CLICKSEND_API_KEY` from Pages and
   close the ClickSend account.

Rollback: keep the ClickSend credentials in place until step 5 passes. Reverting
is a one-line change back to the old `sendSms()` implementation.

## 14. Open question for the owner

Does anything currently rely on calls rolling over — an after-hours service, a
second staff mobile, or a diverted number? Conditional forwarding would replace
it. The owner said calls simply ring out, so this is expected to be a no-op, but
it is confirmed before the divert is enabled.

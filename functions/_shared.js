// Helpers shared by every Pages Function in functions/api/*. Copied verbatim
// from lead.js (the canonical implementations) — behaviour is unchanged.

export const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// Single-line, length-capped value — strips CR/LF and other control chars.
export const oneLine = (s, max = 200) => {
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

export const hostAllowed = (host, env) => {
  if (!host) return false;
  const extra = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    host === 'expressrepairs.com.au' ||
    host === 'www.expressrepairs.com.au' ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.pages.dev') ||
    extra.includes(host)
  );
};

export const hostOf = (v) => {
  try {
    return new URL(v).host;
  } catch {
    return '';
  }
};

// True when the request comes from our own site (Origin or, failing that,
// Referer). A scripted cross-origin POST has neither matching → rejected.
export const sameSite = (request, env) => {
  const origin = request.headers.get('Origin');
  if (origin) return hostAllowed(hostOf(origin), env);
  const referer = request.headers.get('Referer');
  if (referer) return hostAllowed(hostOf(referer), env);
  return false;
};

// Length-safe PIN comparison (avoids a trivial early-exit timing signal).
// The PIN is the sole real barrier on staff endpoints — Origin/Referer are
// forgeable off-browser. MIN_PIN_LENGTH rejects a weak configured secret as
// misconfiguration so it can't ship and be brute-forced.
export const MIN_PIN_LENGTH = 10;
export const pinEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

// PIN brute-force throttling — KV-backed counters in the existing ORDERS_KV
// binding (already bound project-wide, already used by lead.js). Rejected
// alternatives: Cloudflare's native `ratelimits` binding is per-location
// rather than global, caps out at a 60s window (we need 15 minutes), and
// isn't among the bindings Pages Functions support; a Durable Object would be
// strictly correct but is disproportionate for a two-person shop tool.
//
// These counters are DEFENCE-IN-DEPTH ONLY, not the enforcing control. The
// primary control is the Cloudflare edge WAF rate-limiting rule on
// POST /api/supplier-catalog and POST /api/review-sms (configured in the
// Cloudflare dashboard, outside this repo). Do not remove that WAF rule on
// the assumption this KV layer replaces it — see why below.
//
// Two counters, both required: per-IP alone is defeated by rotating IPs
// (cheap); global alone punishes one staff member's typo.
//
// What this layer is actually for: with MIN_PIN_LENGTH = 10+ random
// characters, the keyspace is astronomically large — brute-forcing the PIN
// itself is not a realistic threat regardless of this throttle. These
// counters exist to cut down abuse noise (scripted probing, credential-
// stuffing bots hammering the endpoint) rather than to stand between an
// attacker and a crackable PIN.
//
// Real ceiling, not the ideal one: `recordPinFailure` is a read-modify-write
// against a single KV key, and concurrent requests all read the same value
// before any of them writes — so the effective cap per window is
// PIN_GLOBAL_MAX_FAILS × (attacker's concurrency), not PIN_GLOBAL_MAX_FAILS.
// It gets worse under load: Cloudflare KV throttles writes to roughly one
// per second per key, so above ~1 failed guess/second `pinfail:global`'s
// put() starts failing and is swallowed (see recordPinFailure below) — the
// counter simply stops advancing. These are real limitations of this layer;
// with a strong PIN they only affect how much abuse noise gets through, not
// whether the PIN itself can be cracked (see MIN_PIN_LENGTH above).
export const PIN_WINDOW_SECONDS = 900; // 15 min; KV TTL minimum is 60s, so this is safe
export const PIN_MAX_FAILS = 5; // per IP per window
export const PIN_GLOBAL_MAX_FAILS = 100; // all IPs per window — real staff never approach this in 15 min

// CF-Connecting-IP is set by Cloudflare's edge on the way in and cannot be
// spoofed by the client, so it's safe to trust for rate-limit bucketing.
export const clientIp = (request) => request.headers.get('CF-Connecting-IP') || 'unknown';

// ponytail: the write-ceiling degradation above isn't a fixed "somewhat" —
// it's proportional to whatever rate/concurrency an attacker chooses to run,
// and collapses further once they exceed KV's ~1 write/sec/key throttle (see
// the block comment above). Acceptable as a secondary control sitting behind
// the edge WAF rule and a strong PIN, for a two-person shop tool guarding
// cost prices; upgrade to a Durable Object (strongly consistent, serializes
// writes) if this ever guards money or the WAF rule is ever removed.

// true when either the per-IP or global cap is already exceeded. Read-only —
// callers must still call recordPinFailure/clearPinFailures themselves.
export async function pinRateLimited(kv, ip) {
  try {
    const [ipFails, globalFails] = await Promise.all([kv.get(`pinfail:${ip}`), kv.get('pinfail:global')]);
    return Number(ipFails || 0) >= PIN_MAX_FAILS || Number(globalFails || 0) >= PIN_GLOBAL_MAX_FAILS;
  } catch (err) {
    // Fail open: an unavailable counter must not brick the tool — a KV outage
    // is not a reason to lock every staff member out. Logged (not swallowed
    // silently) so a disabled throttle — missing ORDERS_KV binding, KV
    // outage, or write throttling — is visible instead of invisible.
    console.error('pin rate-limit unavailable', err);
    return false;
  }
}

// Bumps both the per-IP and global fail counters, each with a fresh TTL.
export async function recordPinFailure(kv, ip) {
  try {
    const ipKey = `pinfail:${ip}`;
    const [ipFails, globalFails] = await Promise.all([kv.get(ipKey), kv.get('pinfail:global')]);
    await Promise.all([
      kv.put(ipKey, String(Number(ipFails || 0) + 1), { expirationTtl: PIN_WINDOW_SECONDS }),
      kv.put('pinfail:global', String(Number(globalFails || 0) + 1), { expirationTtl: PIN_WINDOW_SECONDS }),
    ]);
  } catch (err) {
    // Swallow: a write failure must not block the request or brick the tool.
    console.error('pin rate-limit unavailable', err);
  }
}

// Wipes the per-IP counter on a correct PIN, so a staff member who mistypes
// twice then succeeds isn't left with a warm counter. The global counter is
// left alone — it tracks attempts across all IPs, not this one's standing.
export async function clearPinFailures(kv, ip) {
  try {
    await kv.delete(`pinfail:${ip}`);
  } catch (err) {
    // Swallow — same reasoning as recordPinFailure.
    console.error('pin rate-limit unavailable', err);
  }
}

// Shared body-size cap for every PIN-gated staff endpoint. An unauthenticated
// caller can forge the Origin header, so the size cap must run BEFORE the PIN
// check — otherwise a huge body is buffered and parsed for free on every call.
export const MAX_BODY_BYTES = 16 * 1024;

// Reads and JSON-parses a request body under MAX_BODY_BYTES, rejecting an
// oversized or malformed body before the caller ever sees the parsed data.
// Returns { ok: true, data } or { ok: false, status, error } — callers should
// `return json(status, { ok: false, error })` on failure.
export async function readJsonBody(request) {
  // Cheap early-reject on the declared length so we don't buffer a huge body;
  // the real received-byte count is still checked below (Content-Length can be
  // spoofed or omitted, so it is not trustworthy on its own).
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY_BYTES) {
    return { ok: false, status: 413, error: 'Request too large.' };
  }

  // Enforce the size cap on real received bytes.
  let raw;
  try {
    raw = await request.arrayBuffer();
  } catch {
    return { ok: false, status: 400, error: 'Invalid request body.' };
  }
  if (raw.byteLength > MAX_BODY_BYTES) {
    return { ok: false, status: 413, error: 'Request too large.' };
  }

  let data;
  try {
    data = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return { ok: false, status: 400, error: 'Invalid request body.' };
  }
  // A bare JSON scalar (null, a string, a number) parses fine but has no
  // fields; reject it so the field reads below can't throw an uncaught
  // TypeError (which would surface as an opaque 5xx, not our JSON).
  if (typeof data !== 'object' || data === null) {
    return { ok: false, status: 400, error: 'Invalid request body.' };
  }
  // (A JSON array passes the check above, but its field reads are undefined and
  // degrade to a 401 — no crash, so this is still safe.)
  return { ok: true, data };
}

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
  const from = oneLine(env.CLICKSEND_SENDER, 11) || 'Xpress';
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
  for (const k of Object.keys(params || {}).sort()) data += k + params[k];
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

// Helpers shared by every Pages Function in functions/api/*. Copied verbatim
// from lead.js (the canonical implementations) — behaviour is unchanged.

export const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

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
// misconfiguration so it can't ship and be brute-forced. A short PIN is only
// defensible once guessing is throttled (see the rate-limit helpers below) —
// 6 digits (10^6) combined with PIN_GLOBAL_MAX_FAILS puts a full sweep at
// roughly 100 days; 4 digits would fall in about a day, so 6 is the floor.
export const MIN_PIN_LENGTH = 6;
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
// Two counters, both required: per-IP alone is defeated by rotating IPs
// (cheap); global alone punishes one staff member's typo.
export const PIN_WINDOW_SECONDS = 900; // 15 min; KV TTL minimum is 60s, so this is safe
export const PIN_MAX_FAILS = 5; // per IP per window
export const PIN_GLOBAL_MAX_FAILS = 100; // all IPs per window — real staff never approach this in 15 min

// CF-Connecting-IP is set by Cloudflare's edge on the way in and cannot be
// spoofed by the client, so it's safe to trust for rate-limit bucketing.
export const clientIp = (request) => request.headers.get('CF-Connecting-IP') || 'unknown';

// ponytail: KV is eventually consistent and throttles to roughly one write
// per second per key, so an attacker firing many parallel requests can
// overshoot these caps somewhat before the counter catches up. Acceptable
// for a two-person shop tool guarding cost prices; upgrade to a Durable
// Object (strongly consistent, serializes writes) if this ever guards money.

// true when either the per-IP or global cap is already exceeded. Read-only —
// callers must still call recordPinFailure/clearPinFailures themselves.
export async function pinRateLimited(kv, ip) {
  try {
    const [ipFails, globalFails] = await Promise.all([kv.get(`pinfail:${ip}`), kv.get('pinfail:global')]);
    return Number(ipFails || 0) >= PIN_MAX_FAILS || Number(globalFails || 0) >= PIN_GLOBAL_MAX_FAILS;
  } catch {
    // Fail open: an unavailable counter must not brick the tool — a KV outage
    // is not a reason to lock every staff member out.
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
  } catch {
    // Swallow: a write failure must not block the request or brick the tool.
  }
}

// Wipes the per-IP counter on a correct PIN, so a staff member who mistypes
// twice then succeeds isn't left with a warm counter. The global counter is
// left alone — it tracks attempts across all IPs, not this one's standing.
export async function clearPinFailures(kv, ip) {
  try {
    await kv.delete(`pinfail:${ip}`);
  } catch {
    // Swallow — same reasoning as recordPinFailure.
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

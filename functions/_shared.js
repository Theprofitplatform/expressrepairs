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
// misconfiguration so it can't ship and be brute-forced.
export const MIN_PIN_LENGTH = 10;
export const pinEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

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

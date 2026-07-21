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

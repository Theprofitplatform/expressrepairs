// Cloudflare Pages Function — POST /api/lead
//
// Receives a contact-form or booking-widget submission and emails it to the
// shop. Wired up because the client forms previously only showed a success
// message and never sent the lead anywhere (every enquiry was silently lost).
//
// Email is sent via Resend (https://resend.com). Configure in the Cloudflare
// Pages project (Settings → Environment variables / Secrets):
//   RESEND_API_KEY   (secret, required)  — Resend API key
//   LEAD_TO_EMAIL    (optional)          — recipient; defaults below
//   LEAD_FROM_EMAIL  (optional)          — sender on a Resend-verified domain
//   ALLOWED_ORIGINS  (optional)          — extra comma-separated hosts to accept
//
// Until RESEND_API_KEY is set the endpoint returns 503 and the form shows a
// "please call us" fallback — it never silently swallows a lead again.

const DEFAULT_TO = 'sales@funcovers.com.au';
const DEFAULT_FROM = 'Express Repairs <quotes@expressrepairs.com.au>';

// Keyed by the issue `id`s sent from the booking widget / contact form select
// (see src/data/services.js ISSUES and the contact form <option value>s). Keep
// these in sync with those ids so booking and contact leads label consistently.
const REPAIR_LABELS = {
  screen: 'Screen Repair',
  battery: 'Battery Replacement',
  port: 'Charging Port',
  backglass: 'Back Glass',
  camera: 'Camera Repair',
  water: 'Water Damage',
  speaker: 'Speaker Repair',
  diagnostic: 'Free Diagnostic',
  other: 'Other',
};

// Abuse guards. This endpoint sends a real email per accepted request, so we
// gate on request size and a same-site Origin/Referer before doing any work.
// (A per-IP rate limit needs a Cloudflare KV/Turnstile binding — add that for
// stronger protection; these checks close the trivial cross-origin script path.)
const MAX_BODY_BYTES = 16 * 1024;
const MAX_FIELD_LEN = 2000;
const MAX_DETAILS_LEN = 5000;

const hostAllowed = (host, env) => {
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

// True when the request comes from our own site (Origin or, failing that,
// Referer). A scripted cross-origin POST has neither matching → rejected.
const sameSite = (request, env) => {
  const hostOf = (v) => {
    try {
      return new URL(v).host;
    } catch {
      return '';
    }
  };
  const origin = request.headers.get('Origin');
  if (origin) return hostAllowed(hostOf(origin), env);
  const referer = request.headers.get('Referer');
  if (referer) return hostAllowed(hostOf(referer), env);
  return false;
};

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// Single-line, length-capped value for anything that lands in a mail header
// (subject) — strips CR/LF and other control chars without using escapes.
const oneLine = (s, max = MAX_FIELD_LEN) => {
  let out = '';
  for (const ch of String(s ?? '')) {
    const code = ch.charCodeAt(0);
    out += code < 32 || code === 127 ? ' ' : ch;
  }
  return out.replace(/  +/g, ' ').trim().slice(0, max);
};

const emailValid = (s) => /^\S+@\S+\.\S+$/.test(s);

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed.' });
  }

  // Same-site only — block scripted cross-origin abuse of the email relay.
  if (!sameSite(request, env)) {
    return json(403, { ok: false, error: 'Forbidden.' });
  }

  // Reject oversized bodies before reading them.
  const declaredLen = Number(request.headers.get('content-length') || 0);
  if (declaredLen > MAX_BODY_BYTES) {
    return json(413, { ok: false, error: 'Request too large.' });
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return json(400, { ok: false, error: 'Invalid request body.' });
  }

  // Honeypot — bots fill hidden fields. Accept silently so they don't retry,
  // but log it so genuine drops (if any) are visible in the CF logs.
  if (data.company) {
    console.warn('lead honeypot triggered — submission discarded');
    return json(200, { ok: true });
  }

  const name = oneLine(data.name);
  const phone = oneLine(data.phone, 50);
  const email = oneLine(data.email, 200);
  const model = oneLine(data.model);
  // Details may contain newlines (textarea) — keep them, just cap length.
  const details = String(data.details ?? '').trim().slice(0, MAX_DETAILS_LEN);
  const source = data.source === 'booking' ? 'booking' : 'contact';
  const repairType = REPAIR_LABELS[data.type] || (data.type ? oneLine(data.type) : '');

  if (!name || !phone) {
    return json(400, { ok: false, error: 'Name and phone are required.' });
  }
  if (email && !emailValid(email)) {
    return json(400, { ok: false, error: 'Email looks invalid.' });
  }

  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    // Not configured yet — fail loudly so the form shows the call-us fallback
    // rather than telling the customer we'll be in touch when we won't.
    return json(503, { ok: false, error: 'Lead delivery not configured.' });
  }

  const heading = source === 'booking' ? 'New booking request' : 'New quote request';
  const rows = [
    ['Name', name],
    ['Phone', phone],
    ['Email', email],
    ['Device', model],
    ['Repair', repairType],
    ['Quote', data.quote ? oneLine(data.quote, 60) : ''],
    ['Details', details],
  ].filter(([, v]) => v);

  const text = `${heading}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nSource: ${source} form, expressrepairs.com.au`;
  const html = `<h2>${heading}</h2><table cellpadding="6" style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:15px">${rows
    .map(([k, v]) => `<tr><td style="color:#666"><strong>${esc(k)}</strong></td><td>${esc(v).replace(/\n/g, '<br>')}</td></tr>`)
    .join('')}</table><p style="color:#999;font-size:13px">Source: ${source} form · expressrepairs.com.au</p>`;

  const payload = {
    from: env.LEAD_FROM_EMAIL || DEFAULT_FROM,
    to: [env.LEAD_TO_EMAIL || DEFAULT_TO],
    subject: `${heading}: ${name}${model ? ` — ${model}` : ''}`,
    text,
    html,
  };
  // Let the shop reply straight to the customer when they left an email.
  if (email && emailValid(email)) payload.reply_to = email;

  // Send failures return 503, not 502: Cloudflare's edge replaces a 502 from a
  // Pages Function with its own HTML error page, so the client never sees our
  // JSON. 503 passes through, so the form shows the proper "call us" fallback.
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('Resend send failed', res.status, body);
      return json(503, { ok: false, error: 'Could not send right now.' });
    }
  } catch (err) {
    console.error('Resend request error', err);
    return json(503, { ok: false, error: 'Could not send right now.' });
  }

  return json(200, { ok: true });
}

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
//
// Until RESEND_API_KEY is set the endpoint returns 503 and the form shows a
// "please call us" fallback — it never silently swallows a lead again.

const DEFAULT_TO = 'sales@funcovers.com.au';
const DEFAULT_FROM = 'Express Repairs <quotes@expressrepairs.com.au>';

const REPAIR_LABELS = {
  screen: 'Screen Repair',
  battery: 'Battery Replacement',
  port: 'Charging Port',
  backglass: 'Back Glass',
  diagnostic: 'Free Diagnostic',
  other: 'Other',
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

const emailValid = (s) => /^\S+@\S+\.\S+$/.test(s);

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed.' });
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return json(400, { ok: false, error: 'Invalid request body.' });
  }

  // Honeypot — bots fill hidden fields. Accept silently so they don't retry.
  if (data.company) return json(200, { ok: true });

  const name = String(data.name ?? '').trim();
  const phone = String(data.phone ?? '').trim();
  const email = String(data.email ?? '').trim();
  const model = String(data.model ?? '').trim();
  const details = String(data.details ?? '').trim();
  const source = data.source === 'booking' ? 'booking' : 'contact';
  const repairType = REPAIR_LABELS[data.type] || (data.type ? String(data.type) : '');

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
    ['Quote', data.quote ? String(data.quote) : ''],
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
      return json(502, { ok: false, error: 'Could not send right now.' });
    }
  } catch (err) {
    console.error('Resend request error', err);
    return json(502, { ok: false, error: 'Could not send right now.' });
  }

  return json(200, { ok: true });
}

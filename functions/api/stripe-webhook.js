// Cloudflare Pages Function — POST /api/stripe-webhook
//
// Stripe calls this when an online order is paid (checkout.session.completed).
// We verify the signature manually (WebCrypto — no Stripe SDK), fetch the
// session's line items, and email the order to the shop via Resend, exactly
// like /api/lead does for enquiries. Non-2xx responses make Stripe retry for
// up to 3 days, so a Resend outage can't lose an order.
//
// Env: STRIPE_WEBHOOK_SECRET (whsec_…), STRIPE_SECRET_KEY, RESEND_API_KEY,
// optional LEAD_TO_EMAIL / LEAD_FROM_EMAIL (same defaults as lead.js).
// Configure the endpoint in Stripe Dashboard → Developers → Webhooks →
// https://www.expressrepairs.com.au/api/stripe-webhook, event
// checkout.session.completed.

const DEFAULT_TO = 'sales@funcovers.com.au';
const DEFAULT_FROM = 'Express Repairs <quotes@expressrepairs.com.au>';
const TOLERANCE_SECONDS = 300;
const MAX_BODY_BYTES = 16 * 1024;
const MAX_FIELD_LEN = 2000;

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function validSignature(payload, header, secret) {
  const parts = Object.fromEntries(
    String(header || '').split(',').map((kv) => kv.split('=', 2)).filter((p) => p.length === 2),
  );
  const t = Number(parts.t);
  if (!t || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - t) > TOLERANCE_SECONDS) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`)));
  if (sig.length !== parts.v1.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  return diff === 0;
}

const money = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json(405, { ok: false });

  // Reject oversized bodies before reading them — mirrors lead.js's guard.
  // Legitimate Stripe payloads (a session object, no line items embedded)
  // are far under this cap, so it can't break signature verification below.
  const declaredLen = Number(request.headers.get('content-length') || 0);
  if (declaredLen > MAX_BODY_BYTES) return json(413, { ok: false, error: 'Request too large.' });

  const payload = await request.text();
  const ok = env.STRIPE_WEBHOOK_SECRET &&
    (await validSignature(payload, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET));
  if (!ok) return json(400, { ok: false, error: 'Bad signature.' });

  let event;
  try { event = JSON.parse(payload); } catch { return json(400, { ok: false, error: 'Bad payload.' }); }
  if (event.type !== 'checkout.session.completed') return json(200, { ok: true, ignored: true });

  const s = event.data.object;

  // checkout.session.completed also fires with payment_status: 'unpaid' for
  // delayed-notification methods (e.g. some bank redirects) — the session is
  // "completed" (checkout finished) but no money has moved yet. Stripe sends
  // a second event once it actually settles. Treat anything but 'paid' as a
  // no-op here so the shop is never told to pack and post an unpaid order.
  if (s.payment_status !== 'paid') return json(200, { ok: true, ignored: true });

  // Fetch what was bought (line items aren't embedded in the event), and —
  // best-effort — the chosen shipping rate's display name, so the email can
  // say "Pickup in store" / "Free shipping" / "Standard shipping" instead of
  // just an amount. checkout.js gives each option a distinct display_name.
  let items = [];
  let fulfilment = '';
  try {
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${s.id}/line_items?limit=100`, {
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
    });
    if (res.ok) items = (await res.json()).data || [];
    else console.error('line_items fetch failed', res.status);
  } catch (err) {
    console.error('line_items fetch error', err);
  }
  try {
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${s.id}?expand[]=shipping_cost.shipping_rate`,
      { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } },
    );
    if (res.ok) fulfilment = (await res.json()).shipping_cost?.shipping_rate?.display_name || '';
    else console.error('session expand fetch failed', res.status);
  } catch (err) {
    console.error('session expand fetch error', err);
  }

  const c = s.customer_details || {};
  // c.name is the paying customer's raw Stripe input and lands in the Resend
  // "subject" header below — a name containing CR/LF could inject extra
  // headers (e.g. a Bcc). Sanitize with the same oneLine() lead.js uses.
  const name = oneLine(c.name);
  // Stripe API version 2025-03-31.basil moved shipping details from
  // `shipping_details` to `collected_information.shipping_details` on the
  // Checkout Session. Read the new location first, fall back to the old one,
  // so this keeps working on both an existing account and a brand-new one.
  const addr = (s.collected_information?.shipping_details || s.shipping_details)?.address;
  const shipTo = addr && addr.line1
    ? [addr.line1, addr.line2, `${addr.city || ''} ${addr.state || ''} ${addr.postal_code || ''}`].filter(Boolean).join(', ')
    : 'PICKUP IN STORE';

  const itemLines = items.map((i) => `${i.quantity} × ${i.description} — ${money(i.amount_total)}`);
  const rows = [
    ['Customer', name],
    ['Email', c.email],
    ['Phone', c.phone],
    ['Fulfilment', fulfilment],
    ['Deliver to', shipTo],
    ['Items', itemLines.join('\n') || `(see Stripe session ${s.id})`],
    ['Shipping', money(s.shipping_cost?.amount_total)],
    ['TOTAL PAID', money(s.amount_total)],
  ].filter(([, v]) => v);

  const text = `New online order (PAID)\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nStripe session: ${s.id}`;
  const html = `<h2>New online order (PAID)</h2><table cellpadding="6" style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:15px">${rows
    .map(([k, v]) => `<tr><td style="color:#666"><strong>${esc(k)}</strong></td><td>${esc(v).replace(/\n/g, '<br>')}</td></tr>`)
    .join('')}</table><p style="color:#999;font-size:13px">Stripe session ${esc(s.id)} · expressrepairs.com.au/shop</p>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.LEAD_FROM_EMAIL || DEFAULT_FROM,
        to: [env.LEAD_TO_EMAIL || DEFAULT_TO],
        // ponytail: no idempotency store — Stripe redelivery can send this
        // twice; the session id in the subject makes a duplicate obvious.
        // Add a KV dedup keyed on event.id if order volume makes that
        // insufficient.
        subject: `New online order — ${money(s.amount_total)}${name ? ` — ${name}` : ''} [${s.id}]`,
        text,
        html,
      }),
    });
    if (!res.ok) {
      console.error('Resend order email failed', res.status, await res.text());
      return json(503, { ok: false }); // non-2xx → Stripe retries
    }
  } catch (err) {
    console.error('Resend order email error', err);
    return json(503, { ok: false });
  }

  return json(200, { ok: true });
}

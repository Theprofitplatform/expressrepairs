// Cloudflare Pages Function — POST /api/supplier-catalog
//
// Serves supplier catalogue data (INCLUDES cost prices) to the PIN-gated
// staff ordering page (src/pages/staff/order.astro). Data is seeded into
// ORDERS_KV by scripts/build-supplier-catalog.mjs; it must never be baked
// into the public static bundle.
//
// Config: STAFF_PIN (secret) — staff PIN; falls back to REVIEW_SMS_PIN so
// staff keep a single shop PIN until the owner wants them split.
import { json, sameSite, pinEqual, MIN_PIN_LENGTH, readJsonBody } from '../_shared.js';

const SUPPLIERS = new Set(['hoco', 'mobilemall']);

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed.' });
  if (!sameSite(request, env)) return json(403, { ok: false, error: 'Forbidden.' });

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return json(parsed.status, { ok: false, error: parsed.error });
  const data = parsed.data;

  const pinSecret = env.STAFF_PIN || env.REVIEW_SMS_PIN;
  if (!pinSecret || pinSecret.length < MIN_PIN_LENGTH) {
    if (pinSecret) console.error('STAFF_PIN is too short (min 10) — use a 16+ char random PIN');
    return json(503, { ok: false, error: 'Staff tools not configured.' });
  }
  if (!pinEqual(String(data.pin ?? ''), pinSecret)) {
    return json(401, { ok: false, error: 'Wrong PIN.' });
  }

  const supplier = String(data.supplier ?? '');
  if (!SUPPLIERS.has(supplier)) return json(400, { ok: false, error: 'Unknown supplier.' });

  const text = await env.ORDERS_KV.get(`supplier-catalog:${supplier}`);
  if (!text) {
    return json(404, { ok: false, error: 'Catalogue not loaded — run scripts/build-supplier-catalog.mjs.' });
  }
  return new Response(text, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// Posts a lead (contact form or booking widget) to the /api/lead Pages
// Function, which emails it to the shop. Resolves to { ok, error }.
//
// On any failure we surface a "call us" message rather than the old behaviour
// of showing success while the enquiry went nowhere.
// A double-click (or an impatient re-submit) used to deliver the shop two
// emails and two KV lead keys for one customer — seen live 2026-07-31, the
// same enquiry 14s apart. Suppress an identical payload sent again within the
// window; the first send already succeeded, so the caller still sees success.
// ponytail: module-scoped memo, not a store — one tab, one form at a time.
const DEDUPE_MS = 30_000;
let lastSend = { key: '', at: 0 };

export async function sendLead(payload) {
  const key = JSON.stringify(payload);
  if (key === lastSend.key && Date.now() - lastSend.at < DEDUPE_MS) {
    return { ok: true };
  }
  // Claim the slot before awaiting, so a fast double-click is caught too.
  lastSend = { key, at: Date.now() };
  try {
    // First-touch attribution stashed by Layout.astro on the landing page.
    let attr = '';
    try { attr = sessionStorage.getItem('attr') || ''; } catch { /* storage blocked */ }
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attr ? { ...payload, attr } : payload),
    });
    let body = {};
    try {
      body = await res.json();
    } catch {
      // non-JSON response
    }
    if (res.ok && body.ok) return { ok: true };
    lastSend = { key: '', at: 0 }; // nothing was delivered — let them retry
    return { ok: false, error: body.error || 'send_failed' };
  } catch {
    lastSend = { key: '', at: 0 };
    return { ok: false, error: 'network_error' };
  }
}

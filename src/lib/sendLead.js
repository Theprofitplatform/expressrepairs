// Posts a lead (contact form or booking widget) to the /api/lead Pages
// Function, which emails it to the shop. Resolves to { ok, error }.
//
// On any failure we surface a "call us" message rather than the old behaviour
// of showing success while the enquiry went nowhere.
export async function sendLead(payload) {
  try {
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let body = {};
    try {
      body = await res.json();
    } catch {
      // non-JSON response
    }
    if (res.ok && body.ok) return { ok: true };
    return { ok: false, error: body.error || 'send_failed' };
  } catch {
    return { ok: false, error: 'network_error' };
  }
}

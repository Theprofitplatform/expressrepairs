// Cloudflare Pages Function — POST /api/review-sms
//
// Staff-triggered Google-review request SMS. A PIN-gated internal page
// (src/pages/staff/review-request.astro) posts { name, mobile, device, pin };
// this endpoint validates the PIN, normalises the mobile to an AU E.164 number,
// and sends a review-request SMS via ClickSend.
//
// Config (Cloudflare Pages → Settings → Environment variables / Secrets):
//   CLICKSEND_USERNAME  (secret, required)  — ClickSend account username
//   CLICKSEND_API_KEY   (secret, required)  — ClickSend API key
//   REVIEW_SMS_PIN      (secret, required)  — staff PIN gating this endpoint
//   REVIEW_LINK         (required)          — https://g.page/r/…/review
//   CLICKSEND_SENDER    (optional)          — sender ID, default 'Xpress' (≤11 chars)
//
// Self-contained by design: it duplicates lead.js's small guard helpers rather
// than editing lead.js, so the two endpoints never conflict.

const MAX_BODY_BYTES = 16 * 1024;

// Single-line, length-capped value — strips CR/LF and other control chars.
const oneLine = (s, max = 200) => {
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

export function buildReviewMessage(name, reviewLink) {
  const safeName = oneLine(name, 40) || 'there';
  return (
    `Hi ${safeName}, thanks for choosing Xpress Phone Repairs at Riverwood Plaza! ` +
    `If you're happy with the repair, a quick Google review means a lot to us: ` +
    `${reviewLink} — The team`
  );
}

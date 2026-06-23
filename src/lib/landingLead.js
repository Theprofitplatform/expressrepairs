// Pure helpers for the landing-page callback form, kept out of the React island
// so they can be unit-tested in node (no DOM). Phone rule mirrors BookingWidget.
export function validateContact({ name, phone }) {
  const errors = {};
  if (!String(name || '').trim()) errors.name = 'Please enter your name';
  const p = String(phone || '').trim();
  if (!p) errors.phone = 'We need a number to call back';
  else if (!/^[\d\s+()-]{8,}$/.test(p)) errors.phone = 'That phone number looks off';
  return errors;
}

export function buildLeadPayload({ name, phone, slug, service, company = '' }) {
  return {
    source: `landing:${slug}`,
    name: String(name || '').trim(),
    phone: String(phone || '').trim(),
    type: service || 'general',
    company,
  };
}

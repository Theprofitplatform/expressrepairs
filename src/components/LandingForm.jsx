import React, { useState } from 'react';
import { SITE } from '../data/site.js';
import { sendLead } from '../lib/sendLead.js';
import { validateContact, buildLeadPayload } from '../lib/landingLead.js';

// Lean 2-field callback form for ad landing pages. Props: slug, service.
export function LandingForm({ slug, service = null }) {
  const [form, setForm] = useState({ name: '', phone: '', company: '' });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');

  async function submit() {
    const errs = validateContact(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSending(true);
    setSendError('');
    const res = await sendLead(buildLeadPayload({ ...form, slug, service }));
    setSending(false);
    if (res.ok) {
      setSent(true);
      // AdTracking listens for this and fires the lead conversion.
      document.dispatchEvent(new CustomEvent('lead-success'));
    } else {
      setSendError(`Couldn't send — please call us on ${SITE.phone}.`);
    }
  }

  if (sent) {
    return (
      <div className="form-success" role="status" aria-live="polite">
        ✓ Thanks {form.name.split(' ')[0] || 'mate'} — we'll call you back shortly.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="form-field">
        <label htmlFor="lf-name">Your name</label>
        <input id="lf-name" type="text" value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Jane Doe"
          aria-invalid={errors.name ? 'true' : undefined}
          aria-describedby={errors.name ? 'lf-name-err' : undefined} />
        {errors.name && <div id="lf-name-err" className="form-error" role="alert">{errors.name}</div>}
      </div>
      <div className="form-field">
        <label htmlFor="lf-phone">Phone number</label>
        <input id="lf-phone" type="tel" value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="04xx xxx xxx"
          aria-invalid={errors.phone ? 'true' : undefined}
          aria-describedby={errors.phone ? 'lf-phone-err' : undefined} />
        {errors.phone && <div id="lf-phone-err" className="form-error" role="alert">{errors.phone}</div>}
      </div>
      {/* Honeypot — hidden from users; the server rejects the lead if filled. */}
      <input type="text" name="company" tabIndex="-1" autoComplete="off" aria-hidden="true"
        value={form.company}
        onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
      <button className="btn btn-primary btn-block btn-lg" disabled={sending} onClick={submit}>
        {sending ? 'Sending…' : 'Request my callback'}
      </button>
      {sendError && <div className="form-error" role="alert">{sendError}</div>}
      <div style={{ fontSize: 13, color: 'var(--text-subtle)' }}>
        No spam, no obligation — just a friendly call back.
      </div>
    </div>
  );
}

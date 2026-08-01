import { useState } from 'react';
import { sendLead } from '../lib/sendLead.js';
import { SITE } from '../data/site.js';

const INTERESTS = [
  'Refurbished iPhone',
  'Refurbished Samsung',
  'New phone',
  'Trade-in quote',
  'Not sure yet',
];

// Phone sales enquiry form. Reuses the /api/lead contract as-is: what they're
// after rides in `model` (shows as "Device" in the lead email), budget/model
// notes in `details`, and source 'landing:phones' surfaces as campaign
// "phones" in the shop inbox.
export default function PhonesForm() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', interest: '', details: '', company: '' });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Please enter your name';
    if (!form.phone.trim()) errs.phone = 'We need a number to call back';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Email looks off';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSending(true);
    setSendError('');
    const res = await sendLead({
      source: 'landing:phones',
      name: form.name,
      phone: form.phone,
      email: form.email,
      model: form.interest || 'Phone — not sure yet',
      details: form.details,
      company: form.company,
    });
    setSending(false);
    if (res.ok) {
      setSent(true);
      // AdTracking listens for this and fires the lead conversion.
      document.dispatchEvent(new CustomEvent('lead-success'));
    } else {
      setSendError(`Sorry — that didn't send. Please call us on ${SITE.phone} and we'll sort it out.`);
    }
  };

  return (
    <form className="form-card" onSubmit={submit} noValidate>
      <div className="form-title">Ask about today's phones</div>
      <div className="form-sub">Tell us what you're after and we'll text or call you back with what's in stock and the price.</div>

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="ph-name">Full name</label>
          <input id="ph-name" type="text" value={form.name} onChange={(e) => upd('name', e.target.value)} placeholder="Jane Doe"
            aria-invalid={errors.name ? 'true' : undefined} aria-describedby={errors.name ? 'ph-name-err' : undefined} />
          {errors.name && <div id="ph-name-err" className="form-error" role="alert">{errors.name}</div>}
        </div>
        <div className="form-field">
          <label htmlFor="ph-phone">Phone</label>
          <input id="ph-phone" type="tel" value={form.phone} onChange={(e) => upd('phone', e.target.value)} placeholder="04xx xxx xxx"
            aria-invalid={errors.phone ? 'true' : undefined} aria-describedby={errors.phone ? 'ph-phone-err' : undefined} />
          {errors.phone && <div id="ph-phone-err" className="form-error" role="alert">{errors.phone}</div>}
        </div>
        <div className="form-field">
          <label htmlFor="ph-email">Email <span style={{color:'var(--text-subtle)', fontWeight:400}}>(optional)</span></label>
          <input id="ph-email" type="email" value={form.email} onChange={(e) => upd('email', e.target.value)} placeholder="you@email.com"
            aria-invalid={errors.email ? 'true' : undefined} aria-describedby={errors.email ? 'ph-email-err' : undefined} />
          {errors.email && <div id="ph-email-err" className="form-error" role="alert">{errors.email}</div>}
        </div>
        <div className="form-field">
          <label htmlFor="ph-interest">What are you after?</label>
          <select id="ph-interest" value={form.interest} onChange={(e) => upd('interest', e.target.value)}>
            <option value="">Not sure yet — help me choose</option>
            {INTERESTS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div className="form-field full">
          <label htmlFor="ph-details">Model or budget <span style={{color:'var(--text-subtle)', fontWeight:400}}>(optional)</span></label>
          <input id="ph-details" type="text" value={form.details} onChange={(e) => upd('details', e.target.value)}
            placeholder="e.g. iPhone 13 128GB, or 'best phone under $500'" />
        </div>
        {/* Honeypot — hidden from users, catches bots. */}
        <input type="text" name="company" tabIndex="-1" autoComplete="off" aria-hidden="true"
          value={form.company} onChange={(e) => upd('company', e.target.value)}
          style={{position:'absolute', left:'-9999px', width:1, height:1, opacity:0}} />
        <div className="form-field full">
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={sending}>
            {sending ? 'Sending…' : "Check what's in stock"}
          </button>
        </div>
      </div>

      {sendError && (
        <div className="form-error" role="alert" style={{marginTop:14}}>{sendError}</div>
      )}
      {sent && (
        <div className="form-success" role="status" aria-live="polite">
          Thanks {form.name || 'mate'} — we'll get back to you with today's stock and prices, usually within a few hours.
        </div>
      )}
    </form>
  );
}

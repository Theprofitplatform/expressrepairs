import { useState, useEffect } from 'react';
import { sendLead } from '../lib/sendLead.js';
import { SITE } from '../data/site.js';
import { NBN_PLANS } from '../data/plans.js';

// NBN availability/enquiry form. Reuses the /api/lead contract as-is: the
// chosen plan rides in `model` (shows as "Device" in the lead email), the
// connection address in `details`, and source 'landing:nbn' surfaces as
// campaign "nbn" in the shop inbox.
export default function NbnForm() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', plan: '', address: '', company: '' });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Plan cards link to ?plan=<name>#enquire — preselect it.
  useEffect(() => {
    const want = new URLSearchParams(window.location.search).get('plan');
    if (want && NBN_PLANS.some((p) => p.name === want)) upd('plan', want);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Please enter your name';
    if (!form.phone.trim()) errs.phone = 'We need a number to call back';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Email looks off';
    if (!form.address.trim()) errs.address = 'We need the connection address to check availability';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSending(true);
    setSendError('');
    const res = await sendLead({
      source: 'landing:nbn',
      name: form.name,
      phone: form.phone,
      email: form.email,
      model: form.plan || 'NBN — not sure yet',
      details: `Connection address: ${form.address}`,
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
      <div className="form-title">Check availability at your address</div>
      <div className="form-sub">No obligation — we'll confirm the best plan for your address and call you back.</div>

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="nbn-name">Full name</label>
          <input id="nbn-name" type="text" value={form.name} onChange={(e) => upd('name', e.target.value)} placeholder="Jane Doe"
            aria-invalid={errors.name ? 'true' : undefined} aria-describedby={errors.name ? 'nbn-name-err' : undefined} />
          {errors.name && <div id="nbn-name-err" className="form-error" role="alert">{errors.name}</div>}
        </div>
        <div className="form-field">
          <label htmlFor="nbn-phone">Phone</label>
          <input id="nbn-phone" type="tel" value={form.phone} onChange={(e) => upd('phone', e.target.value)} placeholder="04xx xxx xxx"
            aria-invalid={errors.phone ? 'true' : undefined} aria-describedby={errors.phone ? 'nbn-phone-err' : undefined} />
          {errors.phone && <div id="nbn-phone-err" className="form-error" role="alert">{errors.phone}</div>}
        </div>
        <div className="form-field">
          <label htmlFor="nbn-email">Email <span style={{color:'var(--text-subtle)', fontWeight:400}}>(optional)</span></label>
          <input id="nbn-email" type="email" value={form.email} onChange={(e) => upd('email', e.target.value)} placeholder="you@business.com.au"
            aria-invalid={errors.email ? 'true' : undefined} aria-describedby={errors.email ? 'nbn-email-err' : undefined} />
          {errors.email && <div id="nbn-email-err" className="form-error" role="alert">{errors.email}</div>}
        </div>
        <div className="form-field">
          <label htmlFor="nbn-plan">Plan</label>
          <select id="nbn-plan" value={form.plan} onChange={(e) => upd('plan', e.target.value)}>
            <option value="">Not sure yet — recommend one</option>
            {NBN_PLANS.map((p) => <option key={p.name} value={p.name}>{p.name} — ${p.price}/mth</option>)}
          </select>
        </div>
        <div className="form-field full">
          <label htmlFor="nbn-address">Connection address</label>
          <input id="nbn-address" type="text" value={form.address} onChange={(e) => upd('address', e.target.value)} placeholder="Shop 1, 123 Belmore Rd, Riverwood NSW"
            aria-invalid={errors.address ? 'true' : undefined} aria-describedby={errors.address ? 'nbn-address-err' : undefined} />
          {errors.address && <div id="nbn-address-err" className="form-error" role="alert">{errors.address}</div>}
        </div>
        {/* Honeypot — hidden from users, catches bots. */}
        <input type="text" name="company" tabIndex="-1" autoComplete="off" aria-hidden="true"
          value={form.company} onChange={(e) => upd('company', e.target.value)}
          style={{position:'absolute', left:'-9999px', width:1, height:1, opacity:0}} />
        <div className="form-field full">
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={sending}>
            {sending ? 'Sending…' : 'Check availability'}
          </button>
        </div>
      </div>

      {sendError && (
        <div className="form-error" role="alert" style={{marginTop:14}}>{sendError}</div>
      )}
      {sent && (
        <div className="form-success" role="status" aria-live="polite">
          Thanks {form.name || 'mate'} — we'll check your address and call you back within one business day.
        </div>
      )}
    </form>
  );
}

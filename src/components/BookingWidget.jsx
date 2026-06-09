import React, { useState } from 'react';
import { Icon, BrandLogo } from './icons.jsx';
import { BRANDS } from '../data/brands.js';
import { ISSUES } from '../data/services.js';
import { SITE } from '../data/site.js';

// Booking widget — 5 steps: brand → model → issue → quote → details

export function BookingWidget() {
  const [step, setStep] = useState(0);
  const [brand, setBrand] = useState(null);
  const [model, setModel] = useState(null);
  const [issue, setIssue] = useState(null);
  const [details, setDetails] = useState({ name: '', phone: '' });
  const [detailsErr, setDetailsErr] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const reset = () => { setStep(0); setBrand(null); setModel(null); setIssue(null); setDetails({name:'',phone:''}); setDetailsErr({}); setSubmitted(false); };

  const price = (brand && issue) ? issue.basePrice[brand.id] : 0;
  const back = () => setStep(s => Math.max(s - 1, 0));

  return (
    <div className="booking">
      <div className="booking-head">
        <div>
          <div className="booking-title">Get a repair quote</div>
          <div className="booking-sub">Takes 20 seconds. No obligation.</div>
        </div>
        <div className="booking-steps" aria-label={`Step ${step+1} of 5`}>
          {[0,1,2,3,4].map(i => (
            <div key={i} className={`booking-step-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
          ))}
        </div>
      </div>

      <div className="booking-stepwrap">
        {step === 0 && (
          <>
            <div className="booking-steplabel">Step 1 of 5</div>
            <div className="booking-question">What brand is your device?</div>
            <div className="brand-grid">
              {BRANDS.map(b => (
                <button key={b.id} className={`brand-chip ${brand?.id === b.id ? 'selected' : ''}`} onClick={() => { setBrand(b); setModel(null); setTimeout(() => setStep(1), 180); }}>
                  <span className="brand-logo" style={{display:'flex', alignItems:'center', justifyContent:'center', minHeight:28}}><BrandLogo id={b.id} size={24} /></span>
                  <span>{b.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && brand && (
          <>
            <div className="booking-steplabel">Step 2 of 5 · {brand.name}</div>
            <div className="booking-question">Pick your model</div>
            <div className="model-list">
              {brand.models.map(m => (
                <button key={m} className={`model-row ${model === m ? 'selected' : ''}`} onClick={() => { setModel(m); setTimeout(() => setStep(2), 180); }}>
                  <span>{m}</span>
                  {model === m && <Icon.Check size={14} />}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="booking-steplabel">Step 3 of 5 · {model}</div>
            <div className="booking-question">What needs fixing?</div>
            <div className="issue-grid">
              {ISSUES.slice(0, 9).map(i => (
                <button key={i.id} className={`issue-chip ${issue?.id === i.id ? 'selected' : ''}`} onClick={() => { setIssue(i); setTimeout(() => setStep(3), 180); }}>
                  <span className="issue-emoji">{i.emoji}</span>
                  <span>{i.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && brand && issue && (
          <>
            <div className="booking-steplabel">Step 4 of 5 · Your quote</div>
            <div className="booking-question">Here's your estimate</div>
            <div className="quote-summary">
              <div className="quote-line"><span style={{color:'var(--text-muted)'}}>Device</span><span style={{fontWeight:600}}>{brand.name} {model}</span></div>
              <div className="quote-line"><span style={{color:'var(--text-muted)'}}>Service</span><span style={{fontWeight:600}}>{issue.label}</span></div>
              <div className="quote-line"><span style={{color:'var(--text-muted)'}}>Turnaround</span><span style={{fontWeight:600}}>{issue.id === 'water' ? '2–3 hours' : '30–90 minutes'}</span></div>
              <div className="quote-line"><span style={{color:'var(--text-muted)'}}>Warranty</span><span style={{fontWeight:600}}>6–12 months</span></div>
            </div>
            <div style={{display:'flex', alignItems:'baseline', gap:8}}>
              <span style={{fontSize:14, color:'var(--text-muted)'}}>Estimate</span>
              <div className="quote-price">{price > 0 ? `$${price}` : 'Free'}</div>
            </div>
            <div className="quote-note">Final price confirmed on inspection. One last step to book.</div>

            <div style={{display:'flex', gap:10, marginTop:16}}>
              <button className="btn btn-primary btn-block" onClick={() => setStep(4)}>
                Book this repair <Icon.ArrowRight />
              </button>
              <a href={SITE.phoneHref} className="btn btn-ghost" title="Call us">
                <Icon.Phone size={16} />
              </a>
            </div>
          </>
        )}

        {step === 4 && brand && issue && (
          <>
            <div className="booking-steplabel">Step 5 of 5 · Your details</div>
            <div className="booking-question">Who should we call back?</div>

            {submitted ? (
              <div className="form-success" style={{marginTop:8}}>
                <Icon.Check /> Thanks {details.name.split(' ')[0] || 'mate'} — we'll call you within 30 min to confirm.
              </div>
            ) : (
              <>
                <div className="quote-summary" style={{padding:'12px 16px'}}>
                  <div className="quote-line" style={{fontSize:13}}>
                    <span style={{color:'var(--text-muted)'}}>{brand.name} {model} · {issue.label}</span>
                    <span style={{fontWeight:700, color:'var(--brand-700)'}}>{price > 0 ? `$${price}` : 'Free'}</span>
                  </div>
                </div>

                <div style={{display:'flex', flexDirection:'column', gap:12, marginTop:14}}>
                  <div className="form-field">
                    <label>Your name</label>
                    <input type="text" value={details.name}
                      onChange={e => setDetails(d => ({...d, name: e.target.value}))}
                      placeholder="Jane Doe" autoFocus />
                    {detailsErr.name && <div className="form-error">{detailsErr.name}</div>}
                  </div>
                  <div className="form-field">
                    <label>Phone number</label>
                    <input type="tel" value={details.phone}
                      onChange={e => setDetails(d => ({...d, phone: e.target.value}))}
                      placeholder="04xx xxx xxx" />
                    {detailsErr.phone && <div className="form-error">{detailsErr.phone}</div>}
                  </div>
                </div>

                <div style={{display:'flex', gap:10, marginTop:16}}>
                  <button className="btn btn-primary btn-block" onClick={() => {
                    const errs = {};
                    if (!details.name.trim()) errs.name = 'Please enter your name';
                    if (!details.phone.trim()) errs.phone = 'We need a number to call back';
                    else if (!/^[\d\s+()-]{8,}$/.test(details.phone.trim())) errs.phone = 'That phone number looks off';
                    setDetailsErr(errs);
                    if (Object.keys(errs).length === 0) setSubmitted(true);
                  }}>
                    Confirm booking <Icon.ArrowRight />
                  </button>
                </div>
                <div className="quote-note" style={{marginTop:10}}>
                  By booking you agree to a friendly call-back — no spam, no obligation.
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="booking-footer">
        {step > 0 ? (
          <button className="back-link" onClick={back}>← Back</button>
        ) : <span />}
        {step < 3 && (
          <span style={{fontSize:13, color:'var(--text-subtle)'}}>
            {step === 0 && 'Tap a brand to continue'}
            {step === 1 && 'Tap your model to continue'}
            {step === 2 && 'Tap a service to see your quote'}
          </span>
        )}
        {(step === 3 || step === 4) && (
          <button className="back-link" onClick={reset}>Start over ↺</button>
        )}
      </div>
    </div>
  );
}

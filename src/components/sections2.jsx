import React, { useState } from 'react';
import { Icon, BrandLogo } from './icons.jsx';
import { isOpenNow } from '../lib/hours.js';
import { SITE } from '../data/site.js';
import { HOURS, TESTIMONIALS, WARRANTIES, FAQS } from '../data/content.js';
import { BRAND_TILES } from '../data/accessories.js';
import { sendLead } from '../lib/sendLead.js';

// Lower sections: Brands, WhyUs, Testimonials, Warranty, FAQ, Store, Contact, Footer

export function BrandsStrip() {
  return (
    <section className="section-tight">
      <div className="container-wide">
        <span className="eyebrow">Brands we repair</span>
        <h2 className="section-title" style={{marginTop:14, fontSize:'clamp(28px, 3.5vw, 40px)'}}>Apple, Samsung, Google, Oppo — and most of the rest.</h2>
        <div className="brand-strip">
          {BRAND_TILES.map((b, i) => (
            <div key={i} className="brand-tile">
              <div className="brand-tile-logo" style={{display:'flex', alignItems:'center', justifyContent:'center', minHeight:36, color:'var(--text)'}}>
                <BrandLogo id={b.id} size={28} />
              </div>
              <div className="brand-tile-name">{b.name}</div>
              <div className="brand-tile-sub">{b.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WhyUs() {
  return (
    <section className="section" style={{background:'var(--bg-soft)'}}>
      <div className="container-wide">
        <span className="eyebrow">Why choose us</span>
        <h2 className="section-title" style={{marginTop:14}}>Local, honest, fast — pick all three.</h2>
        <p className="section-lede" style={{marginBottom:44}}>No corporate call centre, no "we'll call you back next week." Just a friendly crew fixing phones in your neighbourhood.</p>

        <div className="why-grid">
          <div className="why-card span-7 dark">
            <div className="why-eyebrow" style={{color:'var(--brand-300)'}}>Built to last</div>
            <h3 className="why-title" style={{color:'#fff'}}>Professional repairs using industry-leading techniques and genuine parts.</h3>
            <p className="why-sub">Certified processes, original-quality components, and a 6–12 month warranty on every repair. Your device back to factory-fresh.</p>
            <div className="stat-row">
              <div className="stat"><div className="stat-num">6–12mo</div><div className="stat-label">Warranty</div></div>
              <div className="stat"><div className="stat-num">5,000+</div><div className="stat-label">Repairs done</div></div>
              <div className="stat"><div className="stat-num">4.9★</div><div className="stat-label">Google rating</div></div>
            </div>
          </div>

          <div className="why-card span-5">
            <div className="why-eyebrow"><Icon.Zap size={14} style={{verticalAlign:'-2px', marginRight:4}} />Fast</div>
            <h3 className="why-title">Most repairs done in 30–90 minutes.</h3>
            <p className="why-sub">Grab a coffee down the road and your phone's ready by the time you finish it.</p>
            <div style={{display:'flex', gap:16, marginTop:22, flexWrap:'wrap'}}>
              <div style={{padding:'12px 16px', background:'var(--ink-25)', borderRadius:12, border:'1px solid var(--border)'}}>
                <div style={{fontSize:12, color:'var(--text-muted)', fontWeight:600}}>Walk-ins</div>
                <div style={{fontSize:13, marginTop:2}}>Welcome · Mon–Sat</div>
              </div>
              <div style={{padding:'12px 16px', background:'var(--ink-25)', borderRadius:12, border:'1px solid var(--border)'}}>
                <div style={{fontSize:12, color:'var(--text-muted)', fontWeight:600}}>Call anytime</div>
                <div style={{fontSize:13, marginTop:2, fontWeight:700}}>{SITE.phone}</div>
              </div>
            </div>
          </div>

          <div className="why-card span-8">
            <div className="why-eyebrow">How it works</div>
            <h3 className="why-title">Three steps, one short visit.</h3>
            <div className="process-strip">
              <div className="process-step">
                <div className="process-step-num">1</div>
                <div className="process-step-title">Pick your device</div>
                <div className="process-step-desc">Brand & model, on our site or in store</div>
              </div>
              <div className="process-step">
                <div className="process-step-num">2</div>
                <div className="process-step-title">Choose the repair</div>
                <div className="process-step-desc">Price confirmed up front</div>
              </div>
              <div className="process-step">
                <div className="process-step-num">3</div>
                <div className="process-step-title">Walk out fixed</div>
                <div className="process-step-desc">Tested &amp; warrantied, same day</div>
              </div>
            </div>
          </div>

          <div className="why-card span-4">
            <div className="why-eyebrow"><Icon.Shield size={14} style={{verticalAlign:'-2px', marginRight:4}} />Warranty</div>
            <h3 className="why-title" style={{fontSize:38, letterSpacing:'-.03em', marginTop:14}}>6–12<span style={{fontSize:18, color:'var(--text-muted)', fontWeight:600, marginLeft:6}}>months</span></h3>
            <p className="why-sub">All repairs backed by comprehensive warranty coverage. Peace of mind, guaranteed.</p>
            <a href="#warranty" className="btn btn-ghost btn-sm" style={{marginTop:14}}>Learn more <Icon.ArrowRight size={12}/></a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Testimonials() {
  return (
    <section className="section" id="reviews">
      <div className="container-wide">
        <span className="eyebrow">Reviews</span>
        <h2 className="section-title" style={{marginTop:14}}>Loved by 1,000+ locals.</h2>
        <p className="section-lede" style={{marginBottom:44}}>Don't take our word for it — here's what our customers say.</p>

        <div className="t-grid">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="t-card">
              <div className="t-stars">★★★★★</div>
              <p className="t-quote">"{t.text}"</p>
              <div className="t-author">
                <span className="avatar-initials" aria-hidden="true">{t.initials}</span>
                <div>
                  <div className="t-author-name">{t.name}</div>
                  <div className="t-author-source">{t.source}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="t-stats">
          <div className="t-stat"><div className="t-stat-num">4.9★</div><div className="t-stat-label">Average rating</div></div>
          <div className="t-stat"><div className="t-stat-num">1,000+</div><div className="t-stat-label">Happy customers</div></div>
          <div className="t-stat"><div className="t-stat-num">5,000+</div><div className="t-stat-label">Repairs completed</div></div>
          <div className="t-stat"><div className="t-stat-num">Same Day</div><div className="t-stat-label">Service available</div></div>
        </div>
      </div>
    </section>
  );
}

export function Warranty() {
  return (
    <section className="section-tight" id="warranty" style={{background:'var(--bg-soft)'}}>
      <div className="container-wide">
        <span className="eyebrow">Our promise</span>
        <h2 className="section-title" style={{marginTop:14, fontSize:'clamp(28px, 3.5vw, 40px)'}}>We stand behind every repair.</h2>
        <div className="warr-grid">
          {WARRANTIES.map((w, i) => (
            <div key={i} className="warr-card">
              <div className="warr-check"><Icon.Check size={16} /></div>
              <div className="warr-title">{w.title}</div>
              <div className="warr-desc">{w.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section className="section" id="faq">
      <div className="container-wide">
        <div style={{textAlign:'center'}}>
          <span className="eyebrow">FAQ</span>
          <h2 className="section-title" style={{marginTop:14, marginInline:'auto'}}>Questions people usually ask.</h2>
          <p className="section-lede" style={{marginInline:'auto'}}>Not seeing yours? Call us — we're happy to chat.</p>
        </div>
        <div className="faq-list">
          {FAQS.map((f, i) => (
            <div key={i} className="faq-item" data-open={open === i}>
              <button type="button" className="faq-q" aria-expanded={open === i} aria-controls={`home-faq-a-${i}`} onClick={() => setOpen(open === i ? -1 : i)}>
                <span>{f.q}</span>
                <span className="faq-toggle" aria-hidden="true">+</span>
              </button>
              <div className="faq-a" id={`home-faq-a-${i}`} role="region">{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Store() {
  const open = isOpenNow(HOURS);
  return (
    <section className="section" id="visit" style={{background:'var(--bg-soft)'}}>
      <div className="container-wide">
        <span className="eyebrow">Visit us</span>
        <h2 className="section-title" style={{marginTop:14}}>Easy to find, free parking.</h2>
        <p className="section-lede">Drop by — walk-ins welcome, always a spot out front.</p>

        <div className="store-grid">
          <div className="store-info-card">
            <div className="store-row">
              <div className="store-icon"><Icon.Pin size={18} /></div>
              <div>
                <div className="store-row-title">Address</div>
                <div className="store-row-body">
                  {SITE.addressLines.map((l, i) => (
                    <React.Fragment key={i}>{l}{i < SITE.addressLines.length - 1 && <br/>}</React.Fragment>
                  ))}
                </div>
                <a href={`https://maps.google.com/?q=${encodeURIComponent(SITE.mapsQuery)}`} target="_blank" rel="noreferrer" style={{fontSize:13.5, color:'var(--brand-700)', fontWeight:700, marginTop:8, display:'inline-block'}}>Get directions →</a>
              </div>
            </div>

            <div className="store-row">
              <div className="store-icon"><Icon.Clock size={18} /></div>
              <div style={{flex:1}}>
                <div className="store-row-title">Opening hours</div>
                <table className="hours-table"><tbody>
                  {HOURS.map((h, i) => (
                    <tr key={i}><td>{h.day}</td><td>{h.hrs}</td></tr>
                  ))}
                </tbody></table>
                {open && <div className="open-now-pill"><span className="open-dot" /> Open now</div>}
              </div>
            </div>

            <div className="store-row">
              <div className="store-icon"><Icon.Phone size={18} /></div>
              <div>
                <div className="store-row-title">Phone</div>
                <div className="store-row-body"><a href={SITE.phoneHref} style={{color:'var(--brand-700)', fontWeight:700}}>{SITE.phone}</a><br/>Call for bookings &amp; quotes</div>
              </div>
            </div>
          </div>

          <div style={{background:'var(--surface)', border:'1px solid var(--border)', borderRadius:22, overflow:'hidden', minHeight:400, position:'relative'}}>
            <div style={{
              position:'absolute', inset:0,
              background: 'linear-gradient(135deg, var(--brand-50), var(--ink-25))',
              backgroundImage: `
                linear-gradient(var(--border) 1px, transparent 1px),
                linear-gradient(90deg, var(--border) 1px, transparent 1px)
              `,
              backgroundSize: '28px 28px'
            }} />
            <div style={{position:'absolute', inset:0, display:'grid', placeItems:'center'}}>
              <div style={{textAlign:'center', padding:'24px 32px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:18, boxShadow:'var(--shadow-md)', maxWidth:300}}>
                <div style={{width:48, height:48, borderRadius:'50%', background:'var(--brand-600)', color:'#fff', display:'grid', placeItems:'center', margin:'0 auto 12px'}}><Icon.Pin size={22}/></div>
                <div style={{fontWeight:800, fontSize:18, lineHeight:1.25}}>{SITE.storeName}<span style={{display:'block', fontWeight:600, fontSize:13, color:'var(--text-muted)', marginTop:3}}>{SITE.storeSub}</span></div>
                <div style={{fontSize:13, color:'var(--text-muted)', marginTop:2}}>{SITE.addressShort}</div>
                <a href={`https://maps.google.com/?q=${encodeURIComponent(SITE.mapsQuery)}`} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{marginTop:14}}>Open in Maps <Icon.ArrowRight size={12}/></a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Contact() {
  const [form, setForm] = useState({ name:'', phone:'', email:'', model:'', type:'', details:'', company:'' });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const upd = (k, v) => setForm(f => ({...f, [k]: v}));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Please enter your name';
    if (!form.phone.trim()) errs.phone = 'We need a number to call back';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Email looks off';
    if (!form.type) errs.type = 'Pick a repair type';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSending(true);
    setSendError('');
    const res = await sendLead({ source: 'contact', ...form });
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
    <section className="section" id="contact">
      <div className="container-wide">
        <div style={{display:'grid', gridTemplateColumns:'1fr 1.2fr', gap:48, alignItems:'start'}} className="contact-grid">
          <div>
            <span className="eyebrow">Get in touch</span>
            <h2 className="section-title" style={{marginTop:14}}>Get your free quote.</h2>
            <p className="section-lede">Drop by the store or fill out the form — we typically reply within 30 minutes during business hours. No obligation, 100% free.</p>

            <div style={{marginTop:32, display:'flex', flexDirection:'column', gap:16}}>
              <div className="store-row">
                <div className="store-icon"><Icon.Pin size={18}/></div>
                <div>
                  <div className="store-row-title">Visit our store</div>
                  <div className="store-row-body">{SITE.addressShort}</div>
                </div>
              </div>
              <div className="store-row">
                <div className="store-icon"><Icon.Phone size={18}/></div>
                <div>
                  <div className="store-row-title">Call us anytime</div>
                  <div className="store-row-body"><a href={SITE.phoneHref} style={{color:'var(--brand-700)', fontWeight:700}}>{SITE.phone}</a></div>
                </div>
              </div>
              <div className="store-row">
                <div className="store-icon"><Icon.Clock size={18}/></div>
                <div>
                  <div className="store-row-title">Opening hours</div>
                  <div className="store-row-body">Mon–Fri 9AM – 6PM (Thu to 7) · Sat 9AM – 5PM · Sun closed</div>
                </div>
              </div>
            </div>
          </div>

          <form className="form-card" onSubmit={submit} noValidate>
            <div className="form-title">Request a free quote</div>
            <div className="form-sub">Response within 30 min during business hours.</div>

            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="contact-name">Full name</label>
                <input id="contact-name" type="text" value={form.name} onChange={e => upd('name', e.target.value)} placeholder="Jane Doe"
                  aria-invalid={errors.name ? 'true' : undefined} aria-describedby={errors.name ? 'contact-name-err' : undefined} />
                {errors.name && <div id="contact-name-err" className="form-error" role="alert">{errors.name}</div>}
              </div>
              <div className="form-field">
                <label htmlFor="contact-phone">Phone</label>
                <input id="contact-phone" type="tel" value={form.phone} onChange={e => upd('phone', e.target.value)} placeholder="04xx xxx xxx"
                  aria-invalid={errors.phone ? 'true' : undefined} aria-describedby={errors.phone ? 'contact-phone-err' : undefined} />
                {errors.phone && <div id="contact-phone-err" className="form-error" role="alert">{errors.phone}</div>}
              </div>
              <div className="form-field">
                <label htmlFor="contact-email">Email <span style={{color:'var(--text-subtle)', fontWeight:400}}>(optional)</span></label>
                <input id="contact-email" type="email" value={form.email} onChange={e => upd('email', e.target.value)} placeholder="you@email.com"
                  aria-invalid={errors.email ? 'true' : undefined} aria-describedby={errors.email ? 'contact-email-err' : undefined} />
                {errors.email && <div id="contact-email-err" className="form-error" role="alert">{errors.email}</div>}
              </div>
              <div className="form-field">
                <label htmlFor="contact-model">Device model</label>
                <input id="contact-model" type="text" value={form.model} onChange={e => upd('model', e.target.value)} placeholder="e.g. iPhone 14 Pro" />
              </div>
              <div className="form-field full">
                <label htmlFor="contact-type">Repair type</label>
                <select id="contact-type" value={form.type} onChange={e => upd('type', e.target.value)}
                  aria-invalid={errors.type ? 'true' : undefined} aria-describedby={errors.type ? 'contact-type-err' : undefined}>
                  <option value="">Select repair type</option>
                  <option value="screen">Screen Repair — from $99</option>
                  <option value="battery">Battery Replacement — from $59</option>
                  <option value="port">Charging Port — from $49</option>
                  <option value="backglass">Back Glass — from $69</option>
                  <option value="diagnostic">Free Diagnostic</option>
                  <option value="other">Other (describe below)</option>
                </select>
                {errors.type && <div id="contact-type-err" className="form-error" role="alert">{errors.type}</div>}
              </div>
              <div className="form-field full">
                <label htmlFor="contact-details">Additional details <span style={{color:'var(--text-subtle)', fontWeight:400}}>(optional)</span></label>
                <textarea id="contact-details" rows="3" value={form.details} onChange={e => upd('details', e.target.value)} placeholder="Tell us what happened..."></textarea>
              </div>
              {/* Honeypot — hidden from users, catches bots. */}
              <input type="text" name="company" tabIndex="-1" autoComplete="off" aria-hidden="true"
                value={form.company} onChange={e => upd('company', e.target.value)}
                style={{position:'absolute', left:'-9999px', width:1, height:1, opacity:0}} />
              <div className="form-field full">
                <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={sending}>
                  {sending ? 'Sending…' : <>Get my free quote <Icon.ArrowRight /></>}
                </button>
              </div>
            </div>

            {sendError && (
              <div className="form-error" role="alert" style={{marginTop:14}}>{sendError}</div>
            )}
            {sent && (
              <div className="form-success" role="status" aria-live="polite">
                <Icon.Check /> Thanks {form.name || 'mate'} — we'll be in touch within 30 min.
              </div>
            )}
          </form>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .contact-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container-wide">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="brand" style={{color:'#fff'}}>
              <span className="brand-mark">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
              </span>
              {SITE.name}
            </div>
            <p className="footer-desc">Your trusted local for phone repairs, plans, and accessories. Same-day service, 6–12 month warranty, honest prices.</p>
          </div>
          <div>
            <h4>Services</h4>
            <ul>
              <li><a href="#repairs">Phone Repairs</a></li>
              <li><a href="#repairs">Screen Replacement</a></li>
              <li><a href="#repairs">Battery Service</a></li>
              <li><a href="#repairs">Diagnostics</a></li>
            </ul>
          </div>
          <div>
            <h4>Links</h4>
            <ul>
              <li><a href="#plans">Plans</a></li>
              <li><a href="#accessories">Accessories</a></li>
              <li><a href="#faq">FAQ</a></li>
              <li><a href="#warranty">Warranty</a></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li><a href={SITE.phoneHref}>{SITE.phone}</a></li>
              <li><a href={SITE.landlineHref}>{SITE.landline}</a> (landline)</li>
              <li><a href="#visit">{SITE.addressShort}</a></li>
              <li><a href="#contact">Get a quote</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</div>
          <div>ABN on request</div>
        </div>
      </div>
    </footer>
  );
}

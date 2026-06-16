import React, { useState } from 'react';
import { Icon } from './icons.jsx';
import { BookingWidget } from './BookingWidget.jsx';
import { isOpenNow } from '../lib/hours.js';
import { SITE } from '../data/site.js';
import { HOURS } from '../data/content.js';
import { REPAIR_CARDS } from '../data/services.js';
import { SIM_PLANS, HANDSET_PLANS } from '../data/plans.js';
import { ACCESSORIES } from '../data/accessories.js';

// International-call inclusions (shown in the Plans modal).
const INTL_UNLIMITED = [
  ['🇧🇩','Bangladesh'],['🇨🇦','Canada'],['🇨🇴','Colombia'],['🇬🇷','Greece'],['🇮🇳','India'],
  ['🇯🇵','Japan'],['🇳🇿','New Zealand'],['🇸🇬','Singapore'],['🇹🇭','Thailand'],['🇺🇸','USA'],
  ['🇧🇷','Brazil'],['🇨🇳','China'],['🇩🇰','Denmark'],['🇭🇰','Hong Kong'],['🇮🇪','Ireland'],
  ['🇲🇾','Malaysia'],['🇳🇴','Norway'],['🇰🇷','South Korea'],['🇬🇧','UK'],['🇻🇳','Vietnam'],
];
const INTL_LIMITED = [
  ['🇰🇭','Cambodia'],['🇨🇾','Cyprus'],['🇪🇬','Egypt'],['🇩🇪','Germany'],['🇮🇹','Italy'],
  ['🇲🇺','Mauritius'],['🇳🇬','Nigeria'],['🇵🇭','Philippines'],['🇪🇸','Spain'],['🇹🇼','Taiwan'],
  ['🇨🇱','Chile'],['🇨🇿','Czechia'],['🇫🇷','France'],['🇮🇩','Indonesia'],['🇱🇧','Lebanon'],
  ['🇳🇵','Nepal'],['🇵🇰','Pakistan'],['🇷🇴','Romania'],['🇱🇰','Sri Lanka'],['🇹🇷','Turkey'],
];

function IntlCallModal({ open, onClose }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div className="intl-modal-overlay" data-open={open} role="dialog" aria-modal="true" aria-labelledby="intl-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="intl-modal">
        <div className="intl-modal-head">
          <div className="intl-modal-title" id="intl-modal-title">International Call Inclusions</div>
          <button type="button" className="intl-modal-close" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="intl-modal-body">
          <div className="intl-subhead"><span className="intl-badge">Unlimited</span> Calls to these 20 countries</div>
          <div className="intl-grid">
            {INTL_UNLIMITED.map(([flag, name]) => (
              <div key={name} className="intl-country"><span className="intl-flag">{flag}</span>{name}</div>
            ))}
          </div>
          <div className="intl-subhead"><span className="intl-badge limited">Limited</span> Calls to these 20 countries</div>
          <div className="intl-grid">
            {INTL_LIMITED.map(([flag, name]) => (
              <div key={name} className="intl-country"><span className="intl-flag">{flag}</span>{name}</div>
            ))}
          </div>
          <p className="intl-modal-note">Inclusions vary by plan — plans marked “International calling (20 countries)” include the unlimited list. Ask in-store or call <a href={SITE.phoneHref} style={{color:'var(--brand-700)', fontWeight:700}}>{SITE.phone}</a> for details.</p>
        </div>
      </div>
    </div>
  );
}

// Top sections: Nav, Hero, Repairs, Plans, Accessories

export function Nav() {
  return (
    <header className="nav">
      <div className="container-wide nav-inner">
        <a href="/" className="brand">
          <span className="brand-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          </span>
          {SITE.name}
        </a>
        <nav className="nav-links">
          <a href="/repairs/">Repairs</a>
          <a href="#plans">Plans</a>
          <a href="#accessories">Accessories</a>
          <a href="/blog/">Blog</a>
          <a href="#visit">Visit</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="nav-cta">
          <a href={SITE.phoneHref} className="nav-phone">
            <Icon.Phone size={16} /><span>{SITE.phone}</span>
          </a>
          <a href="#contact" className="btn btn-primary btn-sm">Get a quote</a>
        </div>
      </div>
    </header>
  );
}

export function Hero() {
  const open = isOpenNow(HOURS);
  const d = new Date();
  const today = HOURS.find(h => h.dow === d.getDay());
  return (
    <section className="hero">
      <div className="hero-bg" />
      <div className="container-wide">
        <div className="hero-grid">
          <div>
            <span className="hero-badge">
              <span className="hero-badge-pill">Express</span>
              <span>Open Mon–Sat · Same-day repairs</span>
            </span>
            <h1 className="hero-title">
              Your phone, <em>fixed fast</em>, by people you can actually talk to.
            </h1>
            <p className="hero-sub">
              Walk in with a cracked screen or dead battery — walk out 30 minutes later with a phone that feels brand new. No jargon, no upsell, just honest work.
            </p>
            <div className="hero-ctas">
              <a href="#contact" className="btn btn-primary btn-lg">
                Get a free quote <Icon.ArrowRight />
              </a>
              <a href={SITE.phoneHref} className="btn btn-ghost btn-lg">
                <Icon.Phone size={16} /> {SITE.phone}
              </a>
            </div>
            <div className="trust-row">
              <div className="avatars" aria-hidden="true">
                {['LB','RT','SM','JK','TE'].map(ini => <span key={ini} className="avatar-initials">{ini}</span>)}
              </div>
              <div className="trust-text">
                <div className="stars">★★★★★ <strong style={{marginLeft:6}}>4.9/5</strong></div>
                <div>Loved by <strong>1,000+</strong> locals</div>
              </div>
            </div>

            <div className="hero-infobar">
              <div>
                <div className="hero-info-label">Today</div>
                <div className="hero-info-value">{today ? today.hrs : 'See hours'}</div>
              </div>
              <div>
                <div className="hero-info-label">Turnaround</div>
                <div className="hero-info-value">30–90 min</div>
              </div>
              <div>
                <div className="hero-info-label">Warranty</div>
                <div className="hero-info-value">6–12 months</div>
              </div>
              <div>
                <div className="hero-info-label">Status</div>
                <div className="hero-info-value" style={{color: open ? '#16a34a' : 'var(--text-muted)'}}>
                  {open ? '● Open now' : '○ Closed'}
                </div>
              </div>
            </div>
          </div>
          <div id="booking">
            <BookingWidget />
          </div>
        </div>
      </div>
    </section>
  );
}

// Map homepage bento cards to their service-page routes.
const REPAIR_HREF = {
  screen: '/repairs/screen/',
  battery: '/repairs/battery/',
  backglass: '/repairs/back-glass/',
  port: '/repairs/charging-port/',
  other: '/repairs/water-damage/',
  diagnostic: '/repairs/',
};

export function RepairServices() {
  return (
    <section className="section" id="repairs">
      <div className="container-wide">
        <span className="eyebrow">Repairs</span>
        <h2 className="section-title" style={{marginTop:14}}>Common fixes — priced up front, done the same day.</h2>
        <p className="section-lede">Whatever's broken, there's a good chance we've seen it a hundred times. Pick your service and we'll have you sorted before lunch.</p>

        <div className="bento-grid">
          {REPAIR_CARDS.map((r) => (
            <a key={r.id} href={REPAIR_HREF[r.id] || '#booking'} className={`bento-card bento-${r.size}`}>
              <div className="bento-img" style={{backgroundImage: `url(${r.img})`}} />
              <div className="bento-overlay" />
              {r.tag && <span className={`bento-badge ${r.tag.includes('Popular') ? 'pop' : r.tag === 'Free' ? 'free' : ''}`}>{r.tag}</span>}
              <div className="bento-body">
                <h3 className="bento-title">{r.title}</h3>
                <p className="bento-desc">{r.desc}</p>
                <div className="bento-meta">
                  <span className="bento-price">{r.from}</span>
                  <span className="bento-arrow">Select <Icon.ArrowRight size={14} /></span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Plans() {
  const [mode, setMode] = useState('sim');
  const [intlOpen, setIntlOpen] = useState(false);
  const plans = mode === 'sim' ? SIM_PLANS : HANDSET_PLANS;
  return (
    <section className="section" id="plans" style={{background:'var(--bg-soft)'}}>
      <div className="container-wide">
        <div className="plans-head">
          <div>
            <span className="eyebrow">Mobile Plans</span>
            <h2 className="section-title" style={{marginTop:14}}>Mobile plans that don't punish you for using your phone.</h2>
            <p className="section-lede">On a trusted mobile network. Keep your number, swap anytime, no nasty surprises.</p>
          </div>
          <div className="plan-toggle">
            <button className={mode === 'sim' ? 'active' : ''} onClick={() => setMode('sim')}>SIM only</button>
            <button className={mode === 'handset' ? 'active' : ''} onClick={() => setMode('handset')}>With handset</button>
          </div>
        </div>

        <div className="plan-grid">
          {plans.map((p) => (
            <div key={p.name} className={`plan ${p.featured ? 'featured' : ''}`}>
              {p.featured && <div className="plan-tag">Most popular</div>}
              <div className="plan-name">{p.name}</div>
              <div className="plan-price">
                <span className="dollar">$</span>
                <span className="num">{p.price}</span>
                <span className="per">/month</span>
              </div>
              <div className="plan-data">{p.data} data</div>
              <ul className="plan-features">
                {p.features.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
              <a href="#contact" className={`btn ${p.featured ? 'btn-primary' : 'btn-ghost'} btn-block`}>
                Choose {p.name}
              </a>
            </div>
          ))}
        </div>

        <div style={{display:'flex', justifyContent:'center', marginTop:32}}>
          <button type="button" className="btn btn-ghost" onClick={() => setIntlOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            International call inclusions
          </button>
        </div>

        <p className="plan-footer-note">
          All plans include unlimited talk &amp; text to standard numbers, data banking, and data gifting. Call <a href={SITE.phoneHref} style={{color:'var(--brand-700)', fontWeight:700}}>{SITE.phone}</a> or visit us in-store.
        </p>
      </div>
      <IntlCallModal open={intlOpen} onClose={() => setIntlOpen(false)} />
    </section>
  );
}

export function Accessories() {
  return (
    <section className="section" id="accessories">
      <div className="container-wide">
        <span className="eyebrow">Accessories</span>
        <h2 className="section-title" style={{marginTop:14}}>Pick up a case while you wait.</h2>
        <p className="section-lede">Quality cases, cables, chargers and audio — stocked for every model we sell and service.</p>

        <div className="acc-grid" style={{marginTop:48}}>
          {ACCESSORIES.map((a, i) => (
            <div key={i} className="acc-card">
              <div className="acc-visual">
                {a.tag && <span className={`acc-tag ${a.tag === 'Sale' ? 'sale' : ''}`}>{a.tag}</span>}
                <div className="acc-img" style={{backgroundImage:`url(${a.img})`}} />
              </div>
              <div className="acc-body">
                <div className="acc-title">{a.title}</div>
                <div className="acc-desc">{a.desc}</div>
                <div className="acc-price">{a.price}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

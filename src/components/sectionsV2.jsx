import React, { useState } from 'react';
import { Icon } from './icons.jsx';
import { BookingWidget } from './BookingWidget.jsx';
import { isOpenNow } from '../lib/hours.js';
import { SITE } from '../data/site.js';
import { HOURS } from '../data/content.js';
import { SIM_PLANS, HANDSET_PLANS } from '../data/plans.js';

/* V2 variants of Hero and Plans for the /home-preview/ review page.
   Once the owner approves, port these diffs into sections.jsx and delete
   this file plus src/pages/home-preview.astro. Differences from v1:
   - Hero: booking widget sits ABOVE the info bar on mobile (info bar is
     rendered twice, one copy per breakpoint), and the rating is
     attributed to Google.
   - Plans: compact — 3 cards instead of 6, with a "See all plans" link
     to /plans/ instead of the intl-modal button and footer note. */

function InfoBar({ className }) {
  const open = isOpenNow(HOURS);
  const d = new Date();
  const today = HOURS.find(h => h.dow === d.getDay());
  return (
    <div className={className}>
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
  );
}

export function HeroV2() {
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
                {/* Initials of real Google reviewers (VERIFIED_REVIEWS in src/data/reviews.js). */}
                {['MD','MT','NB','SA','KK'].map(ini => <span key={ini} className="avatar-initials">{ini}</span>)}
              </div>
              <div className="trust-text">
                <div className="stars">★★★★★ <strong style={{marginLeft:6}}>{SITE.rating.value.toFixed(1)}/5 on Google</strong></div>
                <div>Loved by <strong>1,000+</strong> locals</div>
              </div>
            </div>

            <InfoBar className="hero-infobar hp-desktop" />
          </div>
          <div id="booking">
            <BookingWidget />
            <InfoBar className="hero-infobar hp-mobile" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function PlansV2({ ctaHref = '#contact' }) {
  const [mode, setMode] = useState('sim');
  const plans = (mode === 'sim' ? SIM_PLANS : HANDSET_PLANS).slice(0, 3);
  const total = mode === 'sim' ? SIM_PLANS.length : HANDSET_PLANS.length;
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
              <a href={ctaHref} className={`btn ${p.featured ? 'btn-primary' : 'btn-ghost'} btn-block`}>
                Choose {p.name}
              </a>
            </div>
          ))}
        </div>

        <div style={{display:'flex', justifyContent:'center', marginTop:32}}>
          <a href="/plans/" className="btn btn-primary">
            {total > 3 ? `See all ${total} plans` : 'See plan details'} <Icon.ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}

// Top sections: Nav, Hero, Repairs, Plans, Accessories

function Nav() {
  return (
    <header className="nav">
      <div className="container-wide nav-inner">
        <a href="#" className="brand">
          <span className="brand-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          </span>
          {SITE.name}
        </a>
        <nav className="nav-links">
          <a href="#repairs">Repairs</a>
          <a href="#plans">Plans</a>
          <a href="#accessories">Accessories</a>
          <a href="#reviews">Reviews</a>
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

function isOpenNow() {
  const d = new Date();
  const dow = d.getDay();
  const h = HOURS.find(x => x.dow === dow);
  if (!h) return false;
  const hr = d.getHours();
  const [oPart, cPart] = h.hrs.split(' – ');
  const parseTime = s => {
    const m = s.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!m) return 0;
    let hh = parseInt(m[1]);
    if (m[3].toUpperCase() === 'PM' && hh !== 12) hh += 12;
    if (m[3].toUpperCase() === 'AM' && hh === 12) hh = 0;
    return hh;
  };
  return hr >= parseTime(oPart) && hr < parseTime(cPart);
}

function Hero() {
  const open = isOpenNow();
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
              <span>Open 7 days · Same-day repairs</span>
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
              <div className="avatars">
                {[1,2,3,4,5].map(i => <img key={i} src={`https://i.pravatar.cc/80?img=${i}`} alt="" />)}
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

function RepairServices() {
  return (
    <section className="section" id="repairs">
      <div className="container-wide">
        <span className="eyebrow">Repairs</span>
        <h2 className="section-title" style={{marginTop:14}}>Common fixes — priced up front, done the same day.</h2>
        <p className="section-lede">Whatever's broken, there's a good chance we've seen it a hundred times. Pick your service and we'll have you sorted before lunch.</p>

        <div className="bento-grid">
          {REPAIR_CARDS.map((r) => (
            <a key={r.id} href="#booking" className={`bento-card bento-${r.size}`}>
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

function Plans() {
  const [mode, setMode] = useState('sim');
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

        <p className="plan-footer-note">
          All plans include unlimited talk &amp; text to standard numbers, data banking, and data gifting. Call <a href={SITE.phoneHref} style={{color:'var(--brand-700)', fontWeight:700}}>{SITE.phone}</a> or visit us in-store.
        </p>
      </div>
    </section>
  );
}

function Accessories() {
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

Object.assign(window, { Nav, Hero, RepairServices, Plans, Accessories, isOpenNow });

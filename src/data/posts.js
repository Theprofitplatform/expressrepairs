// Blog content. The cost guide is written in full; the remaining cards are
// headline-only stubs (per the design handoff) and link back to the index until
// their articles are written.

export const POSTS = [
  {
    slug: 'screen-repair-cost-sydney',
    tag: 'Pricing',
    date: '11 June 2026',
    dateISO: '2026-06-11',
    read: '6 min read',
    img: '/images/screen-repair.jpg',
    featured: true,
    title: 'How much does phone screen repair cost in Sydney? (2026 guide)',
    excerpt: 'Quotes for the same cracked screen can range from $99 to $450. Here\'s what actually drives the price — and how to tell a fair quote from a rip-off.',
    lede: 'Three shops, three quotes, $300 apart — for the same cracked screen. Here\'s what actually drives the price, and how to tell a fair quote from a rip-off.',
    // Article body rendered with set:html — uses the .article-body prose styles.
    body: `
      <p>If you've rung around for a screen repair quote, you've probably noticed the spread is enormous. The same cracked iPhone can be quoted anywhere from $99 at a market stall to $450 at an authorised service centre. Neither number is automatically wrong — they're just answering different questions. This guide breaks down where the money goes.</p>

      <h2>The short answer: typical Sydney prices</h2>
      <p>At our <a href="/repairs/screen/riverwood/">Riverwood store</a>, screen replacements with original-quality parts currently start at these prices:</p>

      <div class="price-table-wrap">
        <table class="price-table">
          <thead>
            <tr><th>Brand</th><th>Screen repair</th><th class="pt-time-col">Turnaround</th></tr>
          </thead>
          <tbody>
            <tr><td><span class="pt-brand"><span class="pt-brand-logo"></span>Apple iPhone</span></td><td><span class="pt-price"><span class="pt-from">from</span>$149</span></td><td class="pt-time-col"><span class="pt-time">30–60 min</span></td></tr>
            <tr><td><span class="pt-brand"><span class="pt-brand-logo">S</span>Samsung Galaxy</span></td><td><span class="pt-price"><span class="pt-from">from</span>$169</span></td><td class="pt-time-col"><span class="pt-time">45–90 min</span></td></tr>
            <tr><td><span class="pt-brand"><span class="pt-brand-logo">G</span>Google Pixel</span></td><td><span class="pt-price"><span class="pt-from">from</span>$129</span></td><td class="pt-time-col"><span class="pt-time">30–60 min</span></td></tr>
            <tr><td><span class="pt-brand"><span class="pt-brand-logo">O</span>Oppo / Motorola</span></td><td><span class="pt-price"><span class="pt-from">from</span>$99</span></td><td class="pt-time-col"><span class="pt-time">30–60 min</span></td></tr>
          </tbody>
        </table>
      </div>

      <p>"From" matters: within each brand, newer flagships cost more because the panels themselves cost more. An iPhone 15 Pro Max screen is a fundamentally more expensive part than an iPhone 11's.</p>

      <h2>What actually drives the price</h2>

      <h3>1. The panel technology</h3>
      <p>OLED panels (every recent flagship) cost two to four times what an LCD does. Foldables are in their own league again — a Galaxy Z Fold inner screen is one of the most expensive parts in any phone. If your quote seems high for a new flagship, the part price is usually the reason.</p>

      <h3>2. Part quality: OEM vs aftermarket</h3>
      <p>This is the biggest source of the quote spread. A <strong>genuine OEM panel</strong> is identical to what left the factory. A <strong>premium aftermarket</strong> panel meets or exceeds the original spec — we fit both, and always tell you which is which. A <strong>budget aftermarket</strong> panel is where the $99-anywhere quotes come from: dimmer, washed-out colour, and touch response that misses taps. Cheap panels are why a bargain repair often becomes two repairs.</p>

      <h3>3. What "screen repair" includes</h3>
      <p>A fair quote includes the part, fitting, full testing (touch, True Tone/brightness sensors, Face ID alignment on iPhones) and a written warranty. Ask these three questions of any shop:</p>
      <ul>
        <li>Is the price for glass only, or the full display assembly?</li>
        <li>What warranty do I get in writing, and for how long?</li>
        <li>If the screen turns out not to be the problem, do I pay anything?</li>
      </ul>

      <div class="article-callout">
        <span class="callout-icon">✓</span>
        <span><strong>Our policy:</strong> free diagnostic, price confirmed before any work starts, and a 6–12 month warranty on every screen. If we can't fix it, you don't pay. <a href="/repairs/screen/">See screen repair pricing →</a></span>
      </div>

      <h2>Repair, claim, or replace?</h2>
      <p>A quick framework. <strong>Repair</strong> if the phone is under ~3 years old and the quote is under a quarter of the replacement cost — which covers almost every screen we see. <strong>Claim on insurance</strong> only if your excess is meaningfully below the repair price (it often isn't). <strong>Replace the phone</strong> when the screen is one of several failing parts — at that point, put the money toward the upgrade instead. We'll tell you honestly which side of the line you're on.</p>

      <h2>The bottom line</h2>
      <p>Expect to pay <strong>$99–$169 to start</strong> for a quality same-day screen repair in Sydney, more for new flagships and foldables. Be suspicious of quotes far below that — the saving usually comes out of the panel — and of any shop that won't put a warranty in writing.</p>
      <p>Got a cracked screen right now? <a href="/repairs/screen/riverwood/">Drop into Riverwood Plaza</a> or call <a href="tel:+61295333300">(02) 9533 3300</a> — most screens are done in under an hour.</p>
    `,
  },
  // Headline-only stubs (no body yet → link back to the index).
  { slug: null, tag: 'Batteries', date: '4 June 2026', img: '/images/battery-repair.jpg', title: 'Battery draining fast? Try these 7 fixes before replacing it', excerpt: 'Half of "dead battery" phones we see just need a settings change. Run through these first.' },
  { slug: null, tag: 'Guides', date: '28 May 2026', img: '/images/other-repairs.jpg', title: 'Dropped your phone in water? The first 10 minutes decide everything', excerpt: 'Skip the rice. Here\'s the first-aid sequence that actually saves water-damaged phones.' },
  { slug: null, tag: 'Screens', date: '21 May 2026', img: '/images/glass-repair.jpg', title: "OEM vs aftermarket screens: what's the real difference?", excerpt: 'Brightness, touch response, colour — where cheap screens cut corners, and when aftermarket is genuinely fine.' },
  { slug: null, tag: 'Guides', date: '14 May 2026', img: '/images/port-repair.jpg', title: "Charging cable finicky? It's probably lint, not a broken port", excerpt: 'How to tell a dirty port from a dead one — and why you shouldn\'t go at it with a toothpick.' },
  { slug: null, tag: 'Guides', date: '7 May 2026', img: '/images/diagnostic.jpg', title: 'Repair or upgrade? A simple framework for deciding', excerpt: 'The maths that tells you when a $79 battery beats a $1,400 handset — and when it doesn\'t.' },
];

export const POST_BY_SLUG = Object.fromEntries(POSTS.filter((p) => p.slug).map((p) => [p.slug, p]));
export const BLOG_TAGS = ['All posts', 'Screens', 'Batteries', 'Pricing', 'Guides'];

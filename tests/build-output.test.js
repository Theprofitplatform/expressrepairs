import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { TRACKING } from '../src/data/tracking.js';

let html = '';
beforeAll(() => {
  // Cold Astro build can take ~60-90s; allow generous headroom.
  execSync('npm run build', { stdio: 'inherit' });
  html = readFileSync('dist/index.html', 'utf8');
}, 120000);

function jsonLdBlocks(markup) {
  return [...markup.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1]));
}

describe('built homepage', () => {
  it('has the canonical tag', () => {
    expect(html).toContain('rel="canonical" href="https://expressrepairs.com.au/"');
  });
  it('server-renders core content (not a blank SPA shell)', () => {
    expect(html).toContain('(02) 9533 3300');
    expect(html).toContain('Get a free quote');
  });
  it('renders the real NAP (Riverwood Plaza, minute-accurate closes)', () => {
    expect(html).toContain('Riverwood NSW 2210');
    const lb = jsonLdBlocks(html).find((b) => b['@type'] === 'LocalBusiness');
    expect(lb.address.addressLocality).toBe('Riverwood');
    expect(lb.address.postalCode).toBe('2210');
    const monday = lb.openingHoursSpecification.find((o) => o.dayOfWeek === 'Monday');
    expect(monday.closes).toBe('18:00');
    // Sunday is closed → omitted from the opening-hours spec entirely.
    expect(lb.openingHoursSpecification.find((o) => o.dayOfWeek === 'Sunday')).toBeUndefined();
  });
  it('includes LocalBusiness and FAQ JSON-LD (parsed, order-independent)', () => {
    const types = jsonLdBlocks(html).map((b) => b['@type']);
    expect(types).toContain('LocalBusiness');
    expect(types).toContain('FAQPage');
  });
  it('does NOT load Babel standalone or unpkg React (the old SPA stack)', () => {
    expect(html).not.toContain('@babel/standalone');
    expect(html).not.toContain('unpkg.com/react');
  });
  it('emitted a sitemap and a real 404 page', () => {
    expect(existsSync('dist/sitemap-index.xml')).toBe(true);
    expect(existsSync('dist/404.html')).toBe(true);
  });
  it('ships an og:image and a real <main> landmark + skip link', () => {
    expect(html).toContain('property="og:image"');
    expect(html).toContain('id="main-content"');
    expect(html).toContain('class="skip-link"');
  });
  it('no longer pulls avatars from the i.pravatar.cc placeholder service', () => {
    expect(html).not.toContain('pravatar');
  });
  it('loads GA4 site-wide (homepage carries the measurement id + gtag loader)', () => {
    // GA4 must be present on a non-/go/ page — proves SiteAnalytics is site-wide,
    // not scoped to the ad landing pages. Skips automatically if GA4 is unset.
    if (TRACKING.ga4Id) {
      expect(html).toContain('googletagmanager.com/gtag/js');
      expect(html).toContain(TRACKING.ga4Id);
    }
  });
});

describe('built local-SEO pages', () => {
  it('the suburb page carries Service + FAQPage + a single canonical LocalBusiness @id', () => {
    const suburb = readFileSync('dist/repairs/screen/riverwood/index.html', 'utf8');
    const blocks = jsonLdBlocks(suburb);
    const types = blocks.map((b) => b['@type']);
    expect(types).toContain('Service');
    expect(types).toContain('FAQPage');
    const lb = blocks.find((b) => b['@type'] === 'LocalBusiness');
    expect(lb['@id']).toContain('#business');
    const svc = blocks.find((b) => b['@type'] === 'Service');
    expect(String(svc.offers.price)).toBeTruthy();
  });
  it('the service page carries an FAQPage and a Home-rooted breadcrumb', () => {
    const svc = readFileSync('dist/repairs/screen/index.html', 'utf8');
    const blocks = jsonLdBlocks(svc);
    expect(blocks.map((b) => b['@type'])).toContain('FAQPage');
    const crumbs = blocks.find((b) => b['@type'] === 'BreadcrumbList');
    expect(crumbs.itemListElement[0].name).toBe('Home');
  });
  it('does not ship crawlable dead "#" suburb links', () => {
    const svc = readFileSync('dist/repairs/back-glass/index.html', 'utf8');
    expect(svc).not.toContain('class="link-chip" href="#"');
  });
  it('the sitemap lists a built local page', () => {
    const sm = readFileSync('dist/sitemap-0.xml', 'utf8');
    expect(sm).toContain('/repairs/screen/riverwood/');
  });
});

describe('staff review-request page', () => {
  it('builds as a noindex page', () => {
    const staff = readFileSync('dist/staff/review-request/index.html', 'utf8');
    expect(staff).toContain('name="robots" content="noindex, nofollow"');
    expect(staff).toContain('id="rr-form"');
  });

  it('is excluded from the sitemap', () => {
    const sm = readFileSync('dist/sitemap-0.xml', 'utf8');
    expect(sm).not.toContain('/staff/');
  });
});

describe('shop pages', () => {
  it('builds /shop/ as a category landing page with no cost price', () => {
    const html = readFileSync('dist/shop/index.html', 'utf8');
    expect(html).toContain('/shop/');
    expect(html).not.toMatch(/costCents/);
  });

  it('builds a product detail page and a paginated category page per product (skips if catalog is empty pre-sync)', () => {
    const products = JSON.parse(readFileSync('src/data/products.json', 'utf8'));
    if (products.length === 0) return;
    const p = products[0];

    const detail = readFileSync(`dist/shop/${p.id}/index.html`, 'utf8');
    expect(detail).toContain(p.name);
    expect(detail).toContain('data-add-to-cart');
    expect(detail).toContain('In stock — dispatched in 1-2 business days');

    const hoco = JSON.parse(readFileSync('src/data/hoco-products.json', 'utf8'));
    if (hoco.length) {
      const hp = readFileSync(`dist/shop/${hoco[0].id}/index.html`, 'utf8');
      expect(hp).toContain('In stock — dispatched in 2-3 business days');
    }

    const slug = p.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const category = readFileSync(`dist/shop/c/${slug}/index.html`, 'utf8');
    expect(category).toContain(p.name);
    expect(category).toContain('Page 1 of');
    expect(category).toContain('acc-grid acc-grid--dense');
    expect(category).toContain('section-tight');
    // "Show all on one page" replaces pagination with an endless-scroll grid.
    expect(category).toContain('id="show-all"');
  });

  it('paginated category pages canonicalize to themselves, not page 1', async () => {
    const { PRODUCTS } = await import('../src/data/products.js');
    const { slugifyCategory } = await import('../src/lib/shop.js');
    const byCat = new Map();
    for (const p of PRODUCTS) byCat.set(p.category, (byCat.get(p.category) ?? 0) + 1);
    const big = [...byCat.entries()].find(([, n]) => n > 48)[0];
    const page2 = readFileSync(`dist/shop/c/${slugifyCategory(big)}/2/index.html`, 'utf8');
    expect(page2).toContain(`rel="canonical" href="https://expressrepairs.com.au/shop/c/${slugifyCategory(big)}/2/"`);
  });

  it('product pages ship their own og:image, description, and stock-true schema', async () => {
    const { PRODUCTS } = await import('../src/data/products.js');
    const p = PRODUCTS[0];
    const detail = readFileSync(`dist/shop/${p.id}/index.html`, 'utf8');
    expect(detail).toContain(`property="og:image" content="${p.image}"`);
    const product = jsonLdBlocks(detail).find((b) => b['@type'] === 'Product');
    expect(product.description).toContain(p.name);
    expect(product.offers.url).toBe(`https://expressrepairs.com.au/shop/${p.id}/`);
  });

  it('builds curated tag landing pages with ItemList schema, listed in the sitemap', async () => {
    const { CURATED_TAGS } = await import('../src/lib/tags.js');
    const { PRODUCTS } = await import('../src/data/products.js');
    const [biggest] = CURATED_TAGS
      .map((t) => [t.tag, PRODUCTS.filter((p) => p.tags.includes(t.tag)).length])
      .sort((a, b) => b[1] - a[1])[0];
    const html = readFileSync(`dist/shop/t/${biggest}/index.html`, 'utf8');
    expect(html).toContain('Page 1 of');
    const list = jsonLdBlocks(html).find((b) => b['@type'] === 'ItemList');
    expect(list.numberOfItems).toBeGreaterThan(0);
    const sm = readFileSync('dist/sitemap-0.xml', 'utf8');
    expect(sm).toContain(`/shop/t/${biggest}/`);
    expect(sm).not.toContain('/shop/search/');
  });

  it('builds device-model landing pages with a 4-level breadcrumb (skips pre-sync)', async () => {
    const products = JSON.parse(readFileSync('src/data/products.json', 'utf8'));
    if (products.length === 0) return;
    const { deviceModel, modelGroups, slugifyCategory } = await import('../src/lib/shop.js');
    // Derive the biggest bucket dynamically — never hardcode model names.
    const byCat = new Map();
    for (const p of products) byCat.set(p.category, [...(byCat.get(p.category) ?? []), p]);
    const [category, group] = [...byCat.entries()]
      .flatMap(([cat, items]) => modelGroups(items).map((g) => [cat, g]))
      .sort((a, b) => b[1].count - a[1].count)[0];
    const path = `dist/shop/c/${slugifyCategory(category)}/m/${group.key}/index.html`;
    const html = readFileSync(path, 'utf8');
    expect(html).toContain(group.label);
    const crumbs = jsonLdBlocks(html).find((b) => b['@type'] === 'BreadcrumbList');
    expect(crumbs.itemListElement).toHaveLength(4);
    expect(html).toContain('Page 1 of');
  });
});

describe('built product page — stock display and buy bar', () => {
  // Picks a real product from the synced catalogue rather than hardcoding an id,
  // so a DXPOS/HOCO re-sync can't silently break this test.
  const somePage = async () => {
    const { PRODUCTS } = await import('../src/data/products.js');
    const p = PRODUCTS.find((x) => x.inStock !== false);
    return { p, html: readFileSync(`dist/shop/${p.id}/index.html`, 'utf8') };
  };

  it('visible stock text agrees with the page\'s own Product schema', async () => {
    const { html: page } = await somePage();
    const offers = jsonLdBlocks(page).find((b) => b['@type'] === 'Product').offers;
    // The bug this guards: the page hardcoded "In stock" while seo.js and the
    // Google feed emitted availability from p.inStock, so an out-of-stock item
    // showed a page contradicting its own structured data and product feed.
    expect(offers.availability).toBe('https://schema.org/InStock');
    expect(page).toMatch(/In stock — dispatched in \d-\d business days/);
    expect(page).not.toContain('Out of stock');
  });

  it('renders the mobile buy bar with a working add-to-cart button', async () => {
    const { p, html: page } = await somePage();
    expect(page).toContain('class="buy-bar"');
    // Both the in-page button and the sticky bar must carry the hook that
    // cart-count.js binds with querySelectorAll — a bar that cannot add is worse
    // than no bar.
    expect((page.match(/data-add-to-cart/g) || []).length).toBe(2);
    expect((page.match(new RegExp(`data-id="${p.id}"`, 'g')) || []).length).toBe(2);
  });

  it('an out-of-stock product hides both add-to-cart buttons', async () => {
    const { PRODUCTS } = await import('../src/data/products.js');
    const oos = PRODUCTS.find((x) => x.inStock === false);
    // The catalogue currently carries no out-of-stock products (DXPOS holds no
    // stock records), so this asserts the invariant only when one appears.
    if (!oos) return;
    const page = readFileSync(`dist/shop/${oos.id}/index.html`, 'utf8');
    expect(page).not.toContain('data-add-to-cart');
    expect(page).not.toContain('class="buy-bar"');
    expect(page).toContain('Out of stock');
  });
});

describe('built shop thanks page', () => {
  const thanks = () => readFileSync('dist/shop/thanks/index.html', 'utf8');

  it('does not promise a Stripe receipt (payments are not enabled)', () => {
    expect(thanks()).not.toContain('Stripe receipt');
  });

  it('tells the customer we will call to confirm and take payment', () => {
    expect(thanks()).toContain('call you to confirm');
  });
});

describe('built NBN page', () => {
  it('renders every plan card with its list price', async () => {
    const { NBN_PLANS } = await import('../src/data/plans.js');
    const nbn = readFileSync('dist/nbn/index.html', 'utf8');
    for (const p of NBN_PLANS) {
      expect(nbn).toContain(p.name);
      expect(nbn).toContain(`>${p.price}<`); // big list price
      expect(nbn).toContain(`>${(p.price * 0.9).toFixed(2)}<`); // 10%-off toggle price
    }
    expect(nbn).toContain('No lock-in');
    expect(nbn).toContain('Want an extra 10% off?'); // in-store offer, no brand named
    const sm = readFileSync('dist/sitemap-0.xml', 'utf8');
    expect(sm).toContain('/nbn/');
  });

  it('never mentions TeleChoice — mobile and NBN are separate products', () => {
    expect(readFileSync('dist/nbn/index.html', 'utf8')).not.toMatch(/telechoice/i);
    expect(readFileSync('dist/nbn/terms/index.html', 'utf8')).not.toMatch(/telechoice/i);
  });

  it('is linked from the homepage nav and footer', () => {
    expect(html).toContain('href="/nbn/"');
  });

  it('builds the NBN service terms with the legal entity and TIO details', () => {
    const terms = readFileSync('dist/nbn/terms/index.html', 'utf8');
    expect(terms).toContain('Mertel Pty');
    expect(terms).toContain('644'); // ABN 88 644 567 019 (nbsp-separated in markup)
    expect(terms).toContain('Telecommunications Industry Ombudsman');
    expect(terms).toContain('no exit fees');
    const nbn = readFileSync('dist/nbn/index.html', 'utf8');
    expect(nbn).toContain('href="/nbn/terms/"');
  });

  it('advertises the VoIP inclusion and guards the emergency-call warning', () => {
    const nbn = readFileSync('dist/nbn/index.html', 'utf8');
    expect(nbn).toContain('Free business phone number');
    expect(nbn).toContain('Unlimited Call Pack');
    const terms = readFileSync('dist/nbn/terms/index.html', 'utf8');
    expect(terms).toContain('calls to 000');
    expect(terms).toContain('$10/mth');
  });
});

describe('built phones page', () => {
  const phones = () => readFileSync('dist/phones/index.html', 'utf8');

  it('sells both new and refurbished with the 12-month warranty and trade-ins', () => {
    const p = phones();
    expect(p).toContain('12-month warranty');
    expect(p).toContain('Refurbished');
    expect(p).toContain('sealed');
    expect(p).toContain('Trade-in');
    expect(p).toContain('Australian Consumer Law');
    // Stock churns daily — the page must never promise a price list.
    expect(p).not.toMatch(/\$\d+\s*(for|—)?\s*(iPhone|Galaxy)/i);
  });

  it('is linked from the homepage nav, the footer and the sitemap', () => {
    expect(html).toContain('href="/phones/"');
    expect(phones()).toContain('href="/phones/"'); // footer self-link via SiteFooter
    expect(readFileSync('dist/sitemap-0.xml', 'utf8')).toContain('/phones/');
  });
});

describe('built plans page', () => {
  it('renders every SIM plan with its price, linked from the homepage nav', async () => {
    const { SIM_PLANS } = await import('../src/data/plans.js');
    const plans = readFileSync('dist/plans/index.html', 'utf8');
    for (const p of SIM_PLANS) {
      expect(plans).toContain(p.name);
      expect(plans).toContain(`>${p.price}<`);
    }
    expect(html).toContain('href="/plans/"');
    expect(readFileSync('dist/sitemap-0.xml', 'utf8')).toContain('/plans/');
  });

  it('homepage header nav no longer carries the Accessories/Visit/FAQ anchor links', () => {
    // Footer quick-links may still anchor to these sections — only the nav dropped them.
    const nav = html.match(/<nav class="nav-links"[\s\S]*?<\/nav>/)[0];
    expect(nav).not.toContain('Accessories');
    expect(nav).not.toContain('Visit');
    expect(nav).not.toContain('FAQ');
    expect(nav).toContain('href="/plans/"');
  });
});

describe('built shop mega menu', () => {
  // The panel is inlined into every /shop/* page, so a link that stops
  // resolving breaks ~10,000 pages at once. shopMenu.test.js checks the data;
  // this checks the pages the data promised were actually written to disk.
  const panelOf = (file) => {
    const page = readFileSync(file, 'utf8');
    return page.slice(page.indexOf('mega-panel'), page.indexOf('</header>'));
  };

  it('renders on shop pages and not on the rest of the site', () => {
    expect(panelOf('dist/shop/index.html')).toContain('Shop by type');
    expect(readFileSync('dist/shop/H-2762/index.html', 'utf8')).toContain('mega-panel');
    expect(readFileSync('dist/repairs/index.html', 'utf8')).not.toContain('mega-panel');
  });

  it('every page it links to exists', () => {
    const panel = panelOf('dist/shop/H-2762/index.html');
    const hrefs = [...new Set([...panel.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]))];
    expect(hrefs.length).toBeGreaterThan(30);
    const missing = hrefs.filter((h) => !existsSync(`dist${h}index.html`));
    expect(missing).toEqual([]);
  });

  // The whole reason the cascade is fetched rather than inlined. Measured
  // 6,213 bytes before this menu and 5,032 after, against ~27KB if the full
  // tree were rendered — times the 10,000 pages that carry the nav. If this
  // trips, something started putting the model links back into the markup.
  it('stays small enough to inline 10,000 times', () => {
    expect(panelOf('dist/shop/H-2762/index.html').length).toBeLessThan(5500);
  });

  // The cascade is three files that have to agree: the panel's markup hooks,
  // the script that fills them, and the JSON it reads. Nothing else notices if
  // one of the three is renamed — the menu just silently stops cascading.
  it('wires the panel, the script and the JSON together', () => {
    const page = readFileSync('dist/shop/H-2762/index.html', 'utf8');
    expect(page).toContain('src="/shop-menu.js"');
    // Inlining it would put 2.6KB of uncacheable JS on all 10,347 pages.
    expect(page).not.toContain('querySelector("[data-cascade]")');
    const script = readFileSync('dist/shop-menu.js', 'utf8');
    expect(script).toContain('/shop/menu.json');
    const inPage = ['data-cascade', 'data-col="cats"', 'data-col="families"', 'data-col="models"',
      'data-head="families"', 'data-head="models"', 'data-cat='];
    for (const hook of inPage) expect(page, hook).toContain(hook);
    for (const hook of ['data-cascade', 'data-col', 'data-head', 'data-cat', 'data-fam']) {
      expect(script, hook).toContain(hook);
    }
  });

  // Three things have to name the same width: the query that hides the
  // desktop row, the one that shows the hamburger, and isDrawer() in
  // shop-menu.js. When the first two drifted apart, 481-900px rendered no
  // navigation at all — no links, no toggle — and nothing failed.
  it('hides the desktop row, shows the toggle and stacks the cascade at one width', () => {
    const css = readdirSync('dist/_astro')
      .filter((f) => f.endsWith('.css'))
      .map((f) => readFileSync(`dist/_astro/${f}`, 'utf8'))
      .find((c) => c.includes('.nav-toggle{display:grid'));
    expect(css, 'bundled nav css').toBeTruthy();
    const width = /@media\(max-width:(\d+)px\)\{\.nav-links\{display:none\}\.nav-toggle\{display:grid/.exec(css);
    expect(width, 'links hidden and toggle shown in the same query').toBeTruthy();
    expect(readFileSync('dist/shop-menu.js', 'utf8')).toContain(`max-width: ${width[1]}px`);
  });

  it('serves the cascade as JSON with only pages that exist', () => {
    const tree = JSON.parse(readFileSync('dist/shop/menu.json', 'utf8'));
    expect(tree.length).toBe(9);
    const hrefs = tree.flatMap((c) =>
      c.f.flatMap((f) => f.m.map((m) => `/shop/c/${c.s}/m/${m.k}/`)),
    );
    expect(hrefs.length).toBeGreaterThan(200);
    expect(hrefs.filter((h) => !existsSync(`dist${h}index.html`))).toEqual([]);
    // Cases & Covers, first and deepest — the panel's default column.
    expect(tree[0].s).toBe('cases-covers');
    expect(tree[0].f.map((f) => f.n)).toContain('iPhone');
  });

  it('builds the cross-category model pages and their index', () => {
    expect(existsSync('dist/shop/m/index.html')).toBe(true);
    const model = readFileSync('dist/shop/m/iphone-17-pro/index.html', 'utf8');
    expect(model).toContain('iPhone 17 Pro accessories');
    // Cross-category: cases AND screen protection on one page.
    expect(model).toContain('/shop/c/cases-covers/m/iphone-17-pro/');
    expect(model).toContain('/shop/c/screen-protection/m/iphone-17-pro/');
  });
});

describe('mobile nav toggle', () => {
  // Below 900px .nav-links is display:none, so before this existed the site
  // had no nav menu at all on phones. There are two nav implementations —
  // SiteNav.astro and the homepage Nav() in sections.jsx — and they drift
  // easily, so assert the toggle on one of each.
  for (const [label, file] of [
    ['homepage (sections.jsx)', 'dist/index.html'],
    ['inner page (SiteNav.astro)', 'dist/shop/index.html'],
    ['product page (SiteNav.astro)', 'dist/shop/H-2762/index.html'],
  ]) {
    it(`${label} ships a labelled toggle wired to the menu`, () => {
      const html = readFileSync(file, 'utf8');
      expect(html).toContain('class="nav-toggle"');
      expect(html).toContain('aria-controls="nav-menu"');
      expect(html).toContain('aria-expanded="false"');
      expect(html).toMatch(/class="nav-links"[^>]*id="nav-menu"|id="nav-menu"[^>]*class="nav-links"/);
    });
  }
});

import { describe, it, expect } from 'vitest';
import { SERVICES } from '../src/data/repairs.js';
import { MODEL_PRICES, isFoldable, ISSUES } from '../src/data/services.js';
import { BRANDS } from '../src/data/brands.js';

// The service-page "from $X" caption and the JSON-LD Offer `schemaPrice` are
// deliberately decoupled from the booking-widget basePrice, so nothing else
// guards them. This pins them to the cheapest row of the same table — catching
// a table edit that leaves the advertised/structured price stale.
describe('service price consistency', () => {
  for (const svc of SERVICES) {
    it(`${svc.slug}: fromAmount & schemaPrice equal the cheapest brand row`, () => {
      const min = Math.min(...svc.rows.map((r) => r.price));
      expect(Number(svc.fromAmount.replace(/[^0-9.]/g, ''))).toBe(min);
      expect(svc.schemaPrice).toBe(String(min));
    });
  }
});

// The /repairs/screen/ page hardcodes its price table and quotes bands again in
// prose (meta description + two FAQ answers), while the booking widget quotes
// from MODEL_PRICES. Nothing tied the two together, so raising the widget's
// iPhone screen tiers on 2026-07-30 left the published table advertising the
// OLD price on an indexed page — the widget said $249, the table said $199.
// The battery pages can't drift like this because they derive their copy; this
// page can, so pin it.
describe('iPhone screen page matches the booking widget', () => {
  const svc = SERVICES.find((s) => s.slug === 'iphone-screen');
  const iphoneScreen = Object.entries(MODEL_PRICES.screen).filter(([m]) => /^iPhone/.test(m));
  const widgetPrices = new Set(iphoneScreen.map(([, p]) => p));
  const tablePrices = new Set(svc.rows.map((r) => r.price));

  it('every price the widget can quote appears as a table band', () => {
    // The $99 band is the brand floor for models with no MODEL_PRICES entry
    // (iPhone 8/7), so the table is allowed one price the widget map lacks.
    const missing = [...widgetPrices].filter((p) => !tablePrices.has(p));
    expect(missing, `widget quotes ${missing.join(', ')} with no matching table band`).toEqual([]);
  });

  it('the prose price range covers the real top price', () => {
    const top = Math.max(...widgetPrices);
    const prose = [svc.description, ...svc.faqs.map((f) => f.a)].join(' ');
    expect(prose, `prose never mentions the top price $${top}`).toContain(`$${top}`);
  });

  it('no band advertises a price below what the widget would quote for it', () => {
    // A generation named in a band must not be priced under its widget price.
    for (const row of svc.rows) {
      for (const [model, price] of iphoneScreen) {
        const gen = model.replace(/^iPhone /, '').replace(/ (Pro Max|Pro|Plus|mini|Max)$/, '');
        if (!new RegExp(`(^|[^0-9])${gen.replace(/[()]/g, '\\$&')}([^0-9]|$)`).test(row.name)) continue;
        expect(row.price, `${row.name} band is $${row.price} but the widget quotes $${price} for ${model}`).toBe(price);
      }
    }
  });
});

// The shop does not routinely take Z Fold / Z Flip work (owner, 2026-07-31),
// so no foldable may carry an advertised number anywhere. This is easy to undo
// by accident: a Samsung price sweep re-adds the models to MODEL_PRICES, and a
// foldable with no entry still falls through to the flat Samsung basePrice on
// back glass / port / camera unless isFoldable short-circuits it first.
describe('foldables are never advertised with a price', () => {
  const foldables = BRANDS.find((b) => b.id === 'samsung').models.filter(isFoldable);

  it('the model picker still offers them, so the lead is captured', () => {
    expect(foldables.length).toBeGreaterThan(0);
  });

  it('no foldable has a per-model price in any MODEL_PRICES table', () => {
    for (const [issue, table] of Object.entries(MODEL_PRICES)) {
      const priced = Object.keys(table).filter(isFoldable);
      expect(priced, `${issue} prices ${priced.join(', ')}`).toEqual([]);
    }
  });

  it('isFoldable catches every Fold/Flip in the picker and nothing else', () => {
    expect(foldables).toEqual(expect.arrayContaining(['Galaxy Z Fold7', 'Galaxy Z Flip3']));
    expect(isFoldable('Galaxy S25 Ultra')).toBe(false);
    expect(isFoldable('Galaxy A54')).toBe(false);
    expect(isFoldable(null)).toBe(false);
  });

  it('no repair page quotes a price row for a foldable', () => {
    for (const s of SERVICES) {
      for (const row of s.rows ?? []) {
        expect(/Z Fold|Z Flip/.test(`${row.name} ${row.models ?? ''}`),
          `${s.slug} row "${row.name}" advertises a foldable at $${row.price}`).toBe(false);
      }
    }
  });
});

// Back glass was the third repair to drift the same way screens and batteries
// did: the widget quoted one flat $149 off the Apple brand floor while the
// page advertised $149-450 and the counter charged $99-199. Pin the three
// together so the next edit can't move one without the others.
describe('back glass page matches the booking widget', () => {
  const svc = SERVICES.find((s) => s.slug === 'back-glass');
  const apple = Object.entries(MODEL_PRICES.backglass).filter(([m]) => /^iPhone/.test(m));
  const widgetPrices = [...new Set(apple.map(([, p]) => p))].sort((a, b) => a - b);
  const appleRow = svc.rows[0];

  it('the Apple band spans exactly what the widget can quote', () => {
    expect(appleRow.price).toBe(Math.min(...widgetPrices));
    expect(appleRow.priceTo).toBe(Math.max(...widgetPrices));
  });

  it('nothing is quoted above the owner ceiling of $199', () => {
    const over = apple.filter(([, p]) => p > 199).map(([m]) => m);
    expect(over, `${over.join(', ')} quoted above $199`).toEqual([]);
    expect(Math.max(...svc.rows.map((r) => r.priceTo))).toBeLessThanOrEqual(199);
  });

  it('every glass-backed iPhone in the picker has a price', () => {
    // The 7/6s/6 are aluminium unibodies with no back glass at all, so they
    // are the only models allowed to have no entry.
    const ALUMINIUM = /^iPhone (7|6s|6)( Plus)?$/;
    const iphones = BRANDS.find((b) => b.id === 'apple').models.filter((m) => !ALUMINIUM.test(m));
    const missing = iphones.filter((m) => MODEL_PRICES.backglass[m] == null);
    expect(missing, `no back glass price for ${missing.join(', ')}`).toEqual([]);
  });
});

// Two issues quote a floor that is the cheapest version of the job rather than
// the job itself: the port price is a clean-and-realign, the camera price is
// the lens glass. Owner 2026-08-01: "some people don't know the difference."
// The service pages explain it; this pins the widget's caveat so a future edit
// can't quietly drop it and leave "from $49" reading as a full repair.
describe('entry-price issues say what the price actually buys', () => {
  const byId = Object.fromEntries(ISSUES.map((i) => [i.id, i]));

  it.each(['port', 'camera'])('%s carries a quoteNote', (id) => {
    expect(byId[id].quoteNote, `${id} lost its quoteNote`).toBeTruthy();
    expect(byId[id].quoteNote.length).toBeGreaterThan(40);
  });

  it('the note admits the real repair costs more', () => {
    for (const id of ['port', 'camera']) {
      expect(byId[id].quoteNote).toMatch(/more|dearer/i);
    }
  });

  it('issues whose floor is the whole job carry no note', () => {
    for (const id of ['screen', 'battery', 'backglass']) {
      expect(byId[id].quoteNote, `${id} should not need a caveat`).toBeUndefined();
    }
  });
});

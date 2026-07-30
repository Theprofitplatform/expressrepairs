import { describe, it, expect } from 'vitest';
import { SERVICES } from '../src/data/repairs.js';
import { MODEL_PRICES } from '../src/data/services.js';

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

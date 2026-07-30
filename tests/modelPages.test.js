import { describe, it, expect } from 'vitest';
import { SERVICES } from '../src/data/repairs.js';
import { MODEL_PRICES, ISSUES } from '../src/data/services.js';

// Guards for the per-generation model landing pages
// (docs/superpowers/plans/2026-07-30-model-landing-pages.md).
//
// Two failure modes worth catching:
//
//  1. A page advertising a price the booking widget won't honour. These pages
//     derive from MODEL_PRICES, so drift can only happen by adding a variant that
//     is priced differently from its siblings — which is exactly what this checks.
//
//  2. The pages decaying into mail-merge. The whole reason these are landing pages
//     rather than doorway pages is that each says something true about that
//     generation. If someone adds a generation without it, that must fail loudly
//     rather than quietly ship a thin page.
const modelPages = SERVICES.filter((s) => s.modelPage && s.generation);
const APPLE_BATTERY_FLOOR = ISSUES.find((i) => i.id === 'battery').basePrice.apple;

describe('per-generation model pages', () => {
  it('there are model pages to check', () => {
    expect(modelPages.length).toBeGreaterThan(0);
  });

  for (const page of modelPages) {
    describe(page.slug, () => {
      // A generation is flat or base/Pro. A third price means the price book
      // changed shape and the page copy no longer describes it.
      it('covers at most a base and a Pro price', () => {
        const prices = page.generation.models.map(
          (m) => MODEL_PRICES.battery[m.name] ?? APPLE_BATTERY_FLOOR,
        );
        expect(new Set(prices).size, `prices: ${prices.join(', ')}`).toBeLessThanOrEqual(2);
      });

      it('every price row equals what the widget quotes for that model', () => {
        for (const row of page.rows) {
          const fromWidget = MODEL_PRICES.battery[row.name] ?? APPLE_BATTERY_FLOOR;
          expect(row.price, `${row.name} row`).toBe(fromWidget);
        }
      });

      it('the advertised price is the cheapest a customer can actually pay', () => {
        const prices = page.generation.models.map(
          (m) => MODEL_PRICES.battery[m.name] ?? APPLE_BATTERY_FLOOR,
        );
        const min = Math.min(...prices);
        expect(page.fromAmount).toBe(`$${min}`);
        expect(page.schemaPrice).toBe(String(min));
      });

      // A page quoting two prices must SAY so. Advertising "$159" on a page
      // whose Pro variants cost $199 is the bug this whole change fixes.
      it('a tiered page names both prices in its copy', () => {
        const prices = [...new Set(page.generation.models.map(
          (m) => MODEL_PRICES.battery[m.name] ?? APPLE_BATTERY_FLOOR,
        ))];
        if (prices.length < 2) return;
        const top = Math.max(...prices);
        const copy = [page.title, page.description, page.h1Html, page.sub, ...page.faqs.map((f) => f.a)].join(' ');
        expect(copy, `page never mentions the $${top} Pro price`).toContain(`$${top}`);
        expect(page.title + page.h1Html, 'headline must say "from"').toContain('from $');
      });

      // The anti-doorway rule, mechanically enforced.
      it('says something specific to this generation', () => {
        expect(page.priceNote?.length ?? 0, 'generation-specific note').toBeGreaterThan(120);
        expect(page.faqs.some((f) => f === page.generation.extraFaq)).toBe(true);
        expect(page.generation.extraFaq?.a?.length ?? 0, 'generation-specific FAQ').toBeGreaterThan(120);
      });

      it('names every variant it targets, so it can rank for each', () => {
        for (const m of page.generation.models) {
          expect(page.rows.some((r) => r.name === m.name), `row for ${m.name}`).toBe(true);
        }
      });

      it('has no empty FAQ slot', () => {
        for (const f of page.faqs) {
          expect(f?.q, `${page.slug} FAQ question`).toBeTruthy();
          expect(f?.a, `${page.slug} FAQ answer`).toBeTruthy();
        }
      });
    });
  }

  // Two pages sharing a note would mean the copy got pasted rather than written.
  it('no two model pages share the same generation note', () => {
    const notes = modelPages.map((p) => p.priceNote);
    expect(new Set(notes).size).toBe(notes.length);
  });
});

import { describe, it, expect } from 'vitest';
import { TRACKING } from '../src/data/tracking.js';

describe('tracking config', () => {
  it('exposes the expected tag keys as strings', () => {
    for (const k of ['ga4Id', 'googleAdsId', 'googleAdsCallLabel', 'googleAdsLeadLabel', 'metaPixelId']) {
      expect(TRACKING, k).toHaveProperty(k);
      expect(typeof TRACKING[k], k).toBe('string');
    }
  });

  it('has Meta Pixel, GA4, and Google Ads all configured', () => {
    // All tags are live: Meta Pixel + GA4 (G-RMD7TWKMXE) site-wide, and Google
    // Ads (AW-18232604052) with call + lead conversion labels on the /go/ pages.
    expect(TRACKING.metaPixelId).not.toBe('');
    expect(TRACKING.ga4Id).toBe('G-RMD7TWKMXE');
    expect(TRACKING.googleAdsId).toBe('AW-18232604052');
    expect(TRACKING.googleAdsCallLabel).not.toBe('');
    expect(TRACKING.googleAdsLeadLabel).not.toBe('');
  });
});

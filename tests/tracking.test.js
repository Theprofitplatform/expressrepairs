import { describe, it, expect } from 'vitest';
import { TRACKING } from '../src/data/tracking.js';

describe('tracking config', () => {
  it('exposes the expected tag keys as strings', () => {
    for (const k of ['ga4Id', 'googleAdsId', 'googleAdsCallLabel', 'googleAdsLeadLabel', 'metaPixelId']) {
      expect(TRACKING, k).toHaveProperty(k);
      expect(typeof TRACKING[k], k).toBe('string');
    }
  });

  it('has the Meta Pixel + GA4 configured; Google Ads not set yet', () => {
    // Meta Pixel is live on the ad pages. GA4 (G-RMD7TWKMXE) is now live
    // site-wide via SiteAnalytics. Google Ads is still empty — when you set it,
    // update this test to match.
    expect(TRACKING.metaPixelId).not.toBe('');
    expect(TRACKING.ga4Id).toBe('G-RMD7TWKMXE');
    expect(TRACKING.googleAdsId).toBe('');
  });
});

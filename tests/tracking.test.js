import { describe, it, expect } from 'vitest';
import { TRACKING } from '../src/data/tracking.js';

describe('tracking config', () => {
  it('exposes the expected tag keys as strings', () => {
    for (const k of ['ga4Id', 'googleAdsId', 'googleAdsCallLabel', 'googleAdsLeadLabel', 'metaPixelId']) {
      expect(TRACKING, k).toHaveProperty(k);
      expect(typeof TRACKING[k], k).toBe('string');
    }
  });

  it('has the Meta Pixel configured; GA4 + Google Ads not set yet', () => {
    // Meta Pixel is live on the ad pages. GA4 and Google Ads are intentionally
    // still empty — when you set them, update this test to match.
    expect(TRACKING.metaPixelId).not.toBe('');
    expect(TRACKING.ga4Id).toBe('');
    expect(TRACKING.googleAdsId).toBe('');
  });
});

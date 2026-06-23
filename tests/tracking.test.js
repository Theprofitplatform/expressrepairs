import { describe, it, expect } from 'vitest';
import { TRACKING } from '../src/data/tracking.js';

describe('tracking config', () => {
  it('exposes the expected tag keys as strings', () => {
    for (const k of ['ga4Id', 'googleAdsId', 'googleAdsCallLabel', 'googleAdsLeadLabel', 'metaPixelId']) {
      expect(TRACKING, k).toHaveProperty(k);
      expect(typeof TRACKING[k], k).toBe('string');
    }
  });

  it('ships empty placeholder IDs by default (nothing fires until configured)', () => {
    expect(TRACKING.ga4Id).toBe('');
    expect(TRACKING.googleAdsId).toBe('');
    expect(TRACKING.metaPixelId).toBe('');
  });
});

import { describe, it, expect } from 'vitest';
import { SERVICES } from '../src/data/repairs.js';

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

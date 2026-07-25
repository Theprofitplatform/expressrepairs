import { describe, it, expect } from 'vitest';
import { pinEqual, MIN_PIN_LENGTH } from '../functions/_shared.js';

describe('pinEqual', () => {
  it('matches only exact equal strings', () => {
    expect(pinEqual('secret-pin-123456', 'secret-pin-123456')).toBe(true);
    expect(pinEqual('secret-pin-123456', 'secret-pin-123457')).toBe(false);
    expect(pinEqual('short', 'shorter')).toBe(false);
    expect(pinEqual(undefined, 'x')).toBe(false);
  });
  it('exports the min length rule', () => {
    expect(MIN_PIN_LENGTH).toBe(10);
  });
});

const { onRequest } = await import('../functions/api/supplier-catalog.js');

const PIN = 'secret-pin-123456';
// Fabricated test data: sku/name/costCents do not correspond to real supplier rows.
// The repo is public, so cost prices must never leak in committed test fixtures.
const HOCO_ROWS = '[{"sku":"1001","name":"Fabricated Ring Stand","costCents":999}]';
const kv = { get: async (k) => (k === 'supplier-catalog:hoco' ? HOCO_ROWS : null) };
const env = { STAFF_PIN: PIN, ORDERS_KV: kv };

const req = (body, { method = 'POST', origin = 'https://expressrepairs.com.au', rawBody } = {}) => {
  const headers = new Headers();
  if (origin) headers.set('Origin', origin);
  const text = rawBody != null ? rawBody : JSON.stringify(body);
  const bytes = new TextEncoder().encode(text);
  return { method, headers, arrayBuffer: async () => bytes.buffer };
};

describe('POST /api/supplier-catalog', () => {
  it('rejects non-POST and cross-origin', async () => {
    expect((await onRequest({ request: req({}, { method: 'GET' }), env })).status).toBe(405);
    expect((await onRequest({ request: req({}, { origin: 'https://evil.example' }), env })).status).toBe(403);
  });
  it('503 when no PIN configured, 401 on wrong PIN', async () => {
    expect((await onRequest({ request: req({ pin: PIN, supplier: 'hoco' }), env: { ORDERS_KV: kv } })).status).toBe(503);
    expect((await onRequest({ request: req({ pin: 'nope-nope-nope', supplier: 'hoco' }), env })).status).toBe(401);
    // wrong PIN + unknown supplier must still be 401 — the PIN gate runs before the
    // supplier whitelist, so an unauthenticated caller can't probe valid supplier names
    expect((await onRequest({ request: req({ pin: 'nope-nope-nope', supplier: 'ebay' }), env })).status).toBe(401);
  });
  it('falls back to REVIEW_SMS_PIN when STAFF_PIN unset', async () => {
    const res = await onRequest({ request: req({ pin: PIN, supplier: 'hoco' }), env: { REVIEW_SMS_PIN: PIN, ORDERS_KV: kv } });
    expect(res.status).toBe(200);
  });
  it('400 on unknown supplier or non-object body', async () => {
    expect((await onRequest({ request: req({ pin: PIN, supplier: 'ebay' }), env })).status).toBe(400);
    expect((await onRequest({ request: req(null), env })).status).toBe(400);
  });
  it('returns the raw KV JSON with no-store, 404 when key missing', async () => {
    const res = await onRequest({ request: req({ pin: PIN, supplier: 'hoco' }), env });
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.text()).toBe(HOCO_ROWS);
    const miss = await onRequest({ request: req({ pin: PIN, supplier: 'mobilemall' }), env });
    expect(miss.status).toBe(404);
  });
  it('rejects an oversized body with 413 before the PIN is even checked', async () => {
    // A WRONG pin in an oversized body must still come back 413, not 401 —
    // proving the size cap runs before request.pin is ever read.
    const res = await onRequest({
      request: req(null, { rawBody: JSON.stringify({ pin: 'wrong-wrong-wrong', supplier: 'hoco', pad: 'x'.repeat(17 * 1024) }) }),
      env,
    });
    expect(res.status).toBe(413);
  });
});

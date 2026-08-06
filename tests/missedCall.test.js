import { describe, it, expect } from 'vitest';
import { validTwilioSignature } from '../functions/_shared.js';

// Vector generated independently with Node's crypto.createHmac (not the
// WebCrypto implementation under test), so this is a real cross-check.
const TOKEN = 'test_auth_token_abc123';
const URL_ = 'https://expressrepairs.com.au/api/missed-call';
const PARAMS = {
  AccountSid: 'ACtest',
  CallSid: 'CAtest123',
  CallStatus: 'no-answer',
  From: '+61412345678',
  To: '+61480000000',
};
const GOOD = 'XPaWuOOcDhGDf9KFiHzrh/214ho=';

describe('validTwilioSignature', () => {
  it('accepts a correctly signed request', async () => {
    expect(await validTwilioSignature(URL_, PARAMS, GOOD, TOKEN)).toBe(true);
  });

  it('rejects a tampered caller number', async () => {
    const tampered = { ...PARAMS, From: '+61499999999' };
    expect(await validTwilioSignature(URL_, tampered, GOOD, TOKEN)).toBe(false);
  });

  it('rejects a wrong auth token, a bad signature and junk', async () => {
    expect(await validTwilioSignature(URL_, PARAMS, GOOD, 'wrong')).toBe(false);
    expect(await validTwilioSignature(URL_, PARAMS, 'nope', TOKEN)).toBe(false);
    expect(await validTwilioSignature(URL_, PARAMS, '', TOKEN)).toBe(false);
  });
});

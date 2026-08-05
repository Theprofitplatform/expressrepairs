import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendLead } from '../src/lib/sendLead.js';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('sendLead (client)', () => {
  it('returns ok on a 200 {ok:true} response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    expect(await sendLead({ name: 'a' })).toEqual({ ok: true });
  });

  it('surfaces the server error message on a non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: false, error: 'boom' }), { status: 400 }));
    expect(await sendLead({})).toEqual({ ok: false, error: 'boom' });
  });

  it('does not report success on a 200 with a non-JSON body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not json', { status: 200 }));
    const r = await sendLead({});
    expect(r.ok).toBe(false);
  });

  it('returns network_error when fetch throws (never a false success)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    expect(await sendLead({})).toEqual({ ok: false, error: 'network_error' });
  });
});

// Live 2026-07-31: one customer's battery enquiry arrived twice, 14s apart.
describe('sendLead double-submit', () => {
  const ok = () => new Response(JSON.stringify({ ok: true }), { status: 200 });

  it('sends an identical payload only once inside the window', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok());
    const p = { source: 'contact', model: 'iPhone 11 Pro Max' };
    expect(await sendLead(p)).toEqual({ ok: true });
    expect(await sendLead({ ...p })).toEqual({ ok: true }); // 2nd click
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('still sends a genuinely different enquiry', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok());
    await sendLead({ source: 'contact', model: 'Pixel 8' });
    await sendLead({ source: 'contact', model: 'Galaxy S24' });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('lets the customer retry after a failed send', async () => {
    const f = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: 'boom' }), { status: 500 }))
      .mockResolvedValue(ok());
    const p = { source: 'contact', model: 'iPhone 15' };
    expect((await sendLead(p)).ok).toBe(false);
    expect(await sendLead({ ...p })).toEqual({ ok: true });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('allows the same enquiry again once the window passes', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok());
    const p = { source: 'contact', model: 'Oppo A78' };
    await sendLead(p);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 31_000);
    await sendLead({ ...p });
    vi.useRealTimers();
    expect(f).toHaveBeenCalledTimes(2);
  });
});

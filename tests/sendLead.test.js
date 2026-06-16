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

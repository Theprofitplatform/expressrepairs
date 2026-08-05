import { useEffect, useState } from 'react';
import { PRODUCTS, SHOP, fmtPrice } from '../data/products.js';
import { getCart, setQty, addToCart, cartCount } from '../shop/cart-store.js';
import { crossSells } from '../lib/shop.js';
import { shippingCents } from '../lib/orderRequest.js';
import { sendLead } from '../lib/sendLead.js';

const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

export default function ShopCartPage() {
  const [cart, setCart] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => setCart(getCart()), []);

  const lines = Object.entries(cart).filter(([id]) => byId[id]);
  const subtotal = lines.reduce((sum, [id, qty]) => sum + byId[id].priceCents * qty, 0);
  const upsells = crossSells(lines.map(([id]) => id), PRODUCTS);

  const update = (id, qty) => setCart({ ...setQty(id, qty) });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', fulfilment: 'pickup', address: '', company: '',
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const ship = shippingCents(subtotal, form.fulfilment, SHOP);
  const total = subtotal + ship;
  const freeShip = ship === 0;

  const submitOrder = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await sendLead({
      source: 'order',
      name: form.name,
      phone: form.phone,
      email: form.email,
      fulfilment: form.fulfilment,
      address: form.fulfilment === 'delivery' ? form.address : '',
      company: form.company, // honeypot — real customers leave it empty
      items: lines.map(([id, qty]) => ({ id, qty })),
    });
    if (res.ok) {
      window.fbq?.('track', 'Lead', {
        content_ids: lines.map(([id]) => id),
        content_type: 'product',
        value: total / 100,
        currency: 'AUD',
        num_items: cartCount(Object.fromEntries(lines)),
      });
      // Hand the Google Customer Reviews opt-in on /shop/thanks/ what it needs.
      // ponytail: order id is client-generated — Google only needs it unique
      // per order for survey dedup, nothing here reads it back.
      try {
        const days = form.fulfilment === 'delivery' ? 7 : 3;
        sessionStorage.setItem('gcr-order', JSON.stringify({
          order_id: 'XR' + Date.now().toString(36).toUpperCase(),
          email: form.email,
          estimated_delivery_date: new Date(Date.now() + days * 864e5).toISOString().slice(0, 10),
        }));
      } catch { /* storage blocked — opt-in just won't render */ }
      location.href = '/shop/thanks/';
      return;
    }
    setError('We couldn’t send your order just now — please call us on (02) 9533 3300 and we’ll take it over the phone.');
    setBusy(false);
  };

  if (!lines.length) {
    return <p>Your cart is empty. <a href="/shop/">Browse accessories</a>.</p>;
  }

  return (
    <div>
      {lines.map(([id, qty]) => (
        <div key={id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
          <img src={byId[id].thumb || byId[id].image} alt="" width="64" height="64" style={{ objectFit: 'contain', borderRadius: 10, border: '1px solid var(--border)' }} />
          <div style={{ flex: 1 }}>
            <strong>{byId[id].name}</strong>
            <div style={{ color: 'var(--brand-700)', fontWeight: 700 }}>{fmtPrice(byId[id].priceCents)}</div>
          </div>
          <input
            type="number"
            min="0"
            max="20"
            value={qty}
            onChange={(e) => update(id, Number(e.target.value))}
            aria-label={`Quantity for ${byId[id].name}`}
            style={{ width: '4rem', padding: '8px', border: '1px solid var(--border)', borderRadius: 8 }}
          />
          <button className="btn btn-ghost btn-sm" onClick={() => update(id, 0)} aria-label={`Remove ${byId[id].name}`}>✕</button>
        </div>
      ))}

      {upsells.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <strong>Popular add-ons</strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginTop: 10 }}>
            {upsells.map((p) => (
              <div key={p.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 10, textAlign: 'center' }}>
                <a href={`/shop/${p.id}/`}>
                  <img src={p.thumb || p.image} alt={p.name} width="120" height="90" loading="lazy" style={{ width: '100%', height: 'auto', aspectRatio: '4 / 3', objectFit: 'contain', background: '#fff' }} />
                  <div style={{ fontSize: '0.85rem', marginTop: 6 }}>{p.name}</div>
                </a>
                <div style={{ fontWeight: 700, color: 'var(--brand-700)', marginTop: 4 }}>{fmtPrice(p.priceCents)}</div>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => setCart({ ...addToCart(p.id) })}>Add</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="quote-summary" style={{ marginTop: '1.5rem' }}>
        <div className="quote-line">
          <span>Subtotal ({cartCount(Object.fromEntries(lines))} items)</span>
          <span style={{ fontWeight: 700 }}>{fmtPrice(subtotal)}</span>
        </div>
        <div className="quote-line">
          <span>Shipping</span>
          <span style={{ fontWeight: 700 }}>{freeShip ? 'FREE' : fmtPrice(ship)}</span>
        </div>
        <div className="quote-line">
          <span>Total</span>
          <span style={{ fontWeight: 700 }}>{fmtPrice(total)}</span>
        </div>
        <div className="quote-note">Free pickup in store at Riverwood Plaza.</div>
      </div>

      {form.fulfilment === 'delivery' && (
        <p style={{ marginTop: 12 }}>
          {freeShip
            ? '✓ Free shipping unlocked.'
            : <>Add <strong>{fmtPrice(SHOP.freeShippingThresholdCents - subtotal)}</strong> more for free shipping — otherwise {fmtPrice(SHOP.flatShippingCents)} flat / free pickup.</>}
        </p>
      )}

      {error && <div className="form-error" role="alert" style={{ marginTop: 10 }}>{error}</div>}

      {!showForm ? (
        <button className="btn btn-primary btn-lg" style={{ marginTop: 16 }} onClick={() => setShowForm(true)}>
          Order these items
        </button>
      ) : (
        <form onSubmit={submitOrder} style={{ marginTop: 20, display: 'grid', gap: 12, maxWidth: 420 }}>
          <p style={{ margin: 0, color: 'var(--muted, #555)' }}>
            Send us your order and we&rsquo;ll call to confirm it and take payment.
          </p>
          <label>
            Name*
            <input required value={form.name} onChange={set('name')} autoComplete="name"
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 }} />
          </label>
          <label>
            Phone*
            <input required type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel"
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 }} />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={set('email')} autoComplete="email"
              style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 }} />
          </label>
          <fieldset style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
            <legend style={{ padding: '0 6px' }}>How would you like it?</legend>
            <label style={{ display: 'block' }}>
              <input type="radio" name="fulfilment" value="pickup"
                checked={form.fulfilment === 'pickup'} onChange={set('fulfilment')} />{' '}
              Pickup in store — Riverwood Plaza (free)
            </label>
            <label style={{ display: 'block', marginTop: 6 }}>
              <input type="radio" name="fulfilment" value="delivery"
                checked={form.fulfilment === 'delivery'} onChange={set('fulfilment')} />{' '}
              Deliver to me
            </label>
          </fieldset>
          {form.fulfilment === 'delivery' && (
            <label>
              Delivery address*
              <textarea required rows={3} value={form.address} onChange={set('address')} autoComplete="street-address"
                style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 10 }} />
            </label>
          )}
          {/* Honeypot — hidden from people, filled by bots. Matches lead.js. */}
          <input type="text" name="company" value={form.company} onChange={set('company')}
            tabIndex={-1} autoComplete="off" aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }} />
          <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
            {busy ? 'Sending…' : `Send order — ${fmtPrice(total)}`}
          </button>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted, #555)' }}>
            No payment is taken online. We&rsquo;ll call you on the number above to confirm.
          </p>
        </form>
      )}
    </div>
  );
}

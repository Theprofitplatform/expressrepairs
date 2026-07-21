import { useEffect, useState } from 'react';
import { PRODUCTS, SHOP, fmtPrice } from '../data/products.js';
import { getCart, setQty, addToCart, cartCount } from '../shop/cart-store.js';
import { crossSells } from '../lib/shop.js';

const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

export default function ShopCartPage() {
  const [cart, setCart] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => setCart(getCart()), []);

  const lines = Object.entries(cart).filter(([id]) => byId[id]);
  const subtotal = lines.reduce((sum, [id, qty]) => sum + byId[id].priceCents * qty, 0);
  const freeShip = subtotal >= SHOP.freeShippingThresholdCents;
  const upsells = crossSells(lines.map(([id]) => id), PRODUCTS);

  const update = (id, qty) => setCart({ ...setQty(id, qty) });

  const checkout = async () => {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: lines.map(([id, qty]) => ({ id, qty })) }),
      });
      const body = await res.json();
      if (res.ok && body.url) { location.href = body.url; return; }
      setError(body.error || 'Checkout is unavailable right now — call us and we can take payment over the phone.');
    } catch {
      setError('Checkout is unavailable right now — call us and we can take payment over the phone.');
    }
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
          <span style={{ fontWeight: 700 }}>{freeShip ? 'FREE' : fmtPrice(SHOP.flatShippingCents)}</span>
        </div>
        <div className="quote-note">Or choose free pickup in store at checkout.</div>
      </div>

      <p style={{ marginTop: 12 }}>
        {freeShip
          ? '✓ Free shipping unlocked.'
          : <>Add <strong>{fmtPrice(SHOP.freeShippingThresholdCents - subtotal)}</strong> more for free shipping — otherwise {fmtPrice(SHOP.flatShippingCents)} flat / free pickup.</>}
      </p>

      {error && <div className="form-error" role="alert" style={{ marginTop: 10 }}>{error}</div>}

      <button className="btn btn-primary btn-lg" style={{ marginTop: 16 }} disabled={busy} onClick={checkout}>
        {busy ? 'Redirecting…' : 'Checkout securely'}
      </button>
    </div>
  );
}

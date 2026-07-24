// Wires [data-add-to-cart] buttons and [data-cart-count] badges on shop pages.
// Delegated click: filtered grids re-render via innerHTML, so per-button
// listeners would be lost.
import { getCart, addToCart, setQty, cartCount } from './cart-store.js';

const refresh = () => {
  const n = cartCount(getCart());
  document.querySelectorAll('[data-cart-count]').forEach((el) => (el.textContent = String(n)));
};

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-add-to-cart]');
  if (!btn) return;
  const qtyInput = document.querySelector('[data-qty]');
  if (qtyInput) {
    const qty = Math.min(20, Math.max(1, Number(qtyInput.value) || 1));
    setQty(btn.dataset.id, (getCart()[btn.dataset.id] || 0) + qty);
  } else {
    addToCart(btn.dataset.id);
  }
  window.fbq?.('track', 'AddToCart', {
    content_ids: [btn.dataset.id],
    content_type: 'product',
    value: Number(btn.dataset.price) / 100 || 0,
    currency: 'AUD',
  });
  refresh();
  btn.textContent = 'Added ✓';
  setTimeout(() => (btn.textContent = 'Add to cart'), 1200);
});
refresh();

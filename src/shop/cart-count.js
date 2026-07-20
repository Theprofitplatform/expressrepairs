// Wires [data-add-to-cart] buttons and [data-cart-count] badges on shop pages.
import { getCart, addToCart, cartCount } from './cart-store.js';

const refresh = () => {
  const n = cartCount(getCart());
  document.querySelectorAll('[data-cart-count]').forEach((el) => (el.textContent = String(n)));
};

document.querySelectorAll('[data-add-to-cart]').forEach((btn) =>
  btn.addEventListener('click', () => {
    addToCart(btn.dataset.id);
    refresh();
    btn.textContent = 'Added ✓';
    setTimeout(() => (btn.textContent = 'Add to cart'), 1200);
  }),
);
refresh();

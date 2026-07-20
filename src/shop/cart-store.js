// Tiny localStorage cart: { productId: qty }. Shared by the add-to-cart
// buttons (cart-count.js) and the cart page island (ShopCartPage.jsx).
const KEY = 'er-cart';
const MAX_QTY = 20; // per line — sanity cap, matches /api/checkout's limit

export function getCart() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || '{}');
    return c && typeof c === 'object' && !Array.isArray(c) ? c : {};
  } catch {
    return {};
  }
}

function save(cart) {
  localStorage.setItem(KEY, JSON.stringify(cart));
  return cart;
}

export const setQty = (id, qty) => {
  const cart = getCart();
  const n = Math.min(MAX_QTY, Math.max(0, Math.floor(qty)));
  if (n === 0) delete cart[id];
  else cart[id] = n;
  return save(cart);
};

export const addToCart = (id) => setQty(id, (getCart()[id] || 0) + 1);
export const clearCart = () => save({});
export const cartCount = (cart) => Object.values(cart).reduce((a, b) => a + b, 0);

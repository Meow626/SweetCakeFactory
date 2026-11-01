/* Shopping cart. Stored in this browser's localStorage (ids + quantities only, never prices).
   Prices always come from catalog-data.js, and the server re-checks them when an order is sent.
   Loaded on every page: keeps the header cart badge in sync and lets "Add to Cart" work anywhere. */
const Cart = (() => {
  const KEY = "scf_cart_v1";
  const MAX_QTY = 50;
  const MAX_LINES = 20;
  let items = read();            // [{ id, qty }]
  let catalogPromise = null;

  function read() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw
        .filter(x => x && typeof x.id === "string")
        .map(x => ({ id: x.id, qty: clamp(x.qty) }))
        .slice(0, MAX_LINES);
    } catch (e) { return []; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* private mode: cart lives for this page only */ }
    changed();
  }
  function clamp(v) { return Math.min(MAX_QTY, Math.max(1, parseInt(v, 10) || 1)); }
  function changed() {
    renderBadge();
    document.dispatchEvent(new CustomEvent("scf:cart", { detail: { items: items.slice() } }));
  }

  /* Shared, memoized catalog fetch (index and cart pages both use it) */
  function loadCatalog() {
    return Promise.resolve(window.SCF_CATALOG);
  }

  function add(id, qty = 1) {
    const line = items.find(i => i.id === id);
    if (line) line.qty = clamp(line.qty + qty);
    else if (items.length >= MAX_LINES) return false;
    else items.push({ id, qty: clamp(qty) });
    save();
    return true;
  }
  function setQty(id, qty) {
    const line = items.find(i => i.id === id);
    if (!line) return;
    line.qty = clamp(qty);
    save();
  }
  function remove(id) { items = items.filter(i => i.id !== id); save(); }
  function clear() { items = []; save(); }
  function count() { return items.reduce((n, i) => n + i.qty, 0); }

  /* Drop anything no longer on the menu */
  function prune(catalog) {
    const ids = new Set(catalog.items.map(i => i.id));
    const before = items.length;
    items = items.filter(i => ids.has(i.id));
    if (items.length !== before) save();
  }

  function renderBadge() {
    document.querySelectorAll("[data-cart-count]").forEach(el => {
      const n = count();
      el.textContent = n > 99 ? "99+" : String(n);
      el.hidden = n === 0;
    });
    document.querySelectorAll(".cart-link").forEach(a => {
      const n = count();
      a.setAttribute("aria-label", n ? `Cart, ${n} item${n === 1 ? "" : "s"}` : "Cart, empty");
    });
  }

  // Keep tabs in sync
  window.addEventListener("storage", e => { if (e.key === KEY) { items = read(); changed(); } });
  document.addEventListener("DOMContentLoaded", renderBadge);

  return {
    add, setQty, remove, clear, count, prune, loadCatalog, renderBadge,
    get items() { return items.slice(); },
    MAX_QTY,
  };
})();

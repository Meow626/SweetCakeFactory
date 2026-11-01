/* Catalog: loads catalog.json, renders cards with pictures/prices, filters, and
   adds the chosen cake + quantity to the cart (js/cart.js). */
const Catalog = (() => {
  let data = { items: [], minLeadDays: 2 };
  let filter = "All";

  async function load() {
    try {
      data = await Cart.loadCatalog();
    } catch (e) {
      document.getElementById("catalog-grid").innerHTML =
        '<p class="alert error">Sorry, the menu could not be loaded. Please refresh the page.</p>';
      return;
    }
    Cart.prune(data);
    const strip = document.getElementById("lead-days-strip");
    if (strip) strip.textContent = data.minLeadDays || 2;
    renderFilters();
    renderGrid();
    document.dispatchEvent(new CustomEvent("scf:catalog", { detail: data }));
  }

  function renderFilters() {
    const wrap = document.getElementById("catalog-filters");
    const cats = ["All", ...new Set(data.items.map(i => i.category))];
    wrap.innerHTML = cats.map(c =>
      `<button type="button" class="chip" aria-pressed="${c === filter}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
    wrap.addEventListener("click", e => {
      const b = e.target.closest(".chip");
      if (!b) return;
      filter = b.dataset.cat;
      wrap.querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      renderGrid();
    });
  }

  function renderGrid() {
    const grid = document.getElementById("catalog-grid");
    const items = data.items.filter(i => filter === "All" || i.category === filter);
    grid.innerHTML = items.map(i => `
      <article class="card" data-id="${esc(i.id)}">
        <div class="card-img">
          <img src="${esc(i.image)}" alt="${esc(i.name)}" loading="lazy" width="400" height="300">
          ${i.bestseller ? '<span class="badge">Bestseller</span>' : ""}
        </div>
        <div class="card-body">
          <h3>${esc(i.name)}</h3>
          <div class="card-size">${esc(i.size)}</div>
          <p class="card-desc">${esc(i.description)}</p>
          <div class="card-foot">
            <span class="price">${peso(i.price)}</span>
            <div class="qty-pick" role="group" aria-label="Quantity for ${esc(i.name)}">
              <button type="button" data-act="minus" aria-label="Decrease quantity">&minus;</button>
              <input type="number" min="1" max="50" value="1" aria-label="Quantity">
              <button type="button" data-act="plus" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <button type="button" class="btn small" data-act="add">Add to Cart</button>
        </div>
      </article>`).join("");
  }

  const clamp = v => Math.min(Cart.MAX_QTY, Math.max(1, parseInt(v, 10) || 1));

  document.addEventListener("click", e => {
    const card = e.target.closest("#catalog-grid .card");
    if (!card) return;
    const input = card.querySelector("input[type=number]");
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "minus") input.value = clamp(input.value - 1);
    if (act === "plus") input.value = clamp(+input.value + 1);
    if (act === "add") {
      const btn = e.target.closest("[data-act]");
      const qty = clamp(input.value);
      const item = data.items.find(i => i.id === card.dataset.id);
      if (!item) return;
      if (!Cart.add(item.id, qty)) { toast("Your cart is full. Please send this order first."); return; }
      input.value = 1;
      card.classList.add("selected");
      btn.textContent = "Added \u2713";
      btn.disabled = true;
      setTimeout(() => { btn.textContent = "Add to Cart"; btn.disabled = false; card.classList.remove("selected"); }, 1400);
      toast(`${qty} \u00d7 ${item.name} added to cart`, { href: "cart.html", label: "View cart" });
    }
  });
  // Typing a quantity: keep it a whole number from 1 to 50
  document.addEventListener("change", e => {
    if (e.target.matches("#catalog-grid .qty-pick input")) e.target.value = clamp(e.target.value);
  });

  return { load, get data() { return data; } };
})();

document.addEventListener("DOMContentLoaded", () => Catalog.load());

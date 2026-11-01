/* Cart page: list of cakes with quantity controls + checkout form (sends ONE order with all cakes). */
(() => {
  const form = document.getElementById("order-form");
  if (!form) return;
  const layout = document.getElementById("cart-layout");
  const emptyBox = document.getElementById("cart-empty");
  const loading = document.getElementById("cart-loading");
  const list = document.getElementById("cart-list");
  const gate = document.getElementById("order-gate");
  const alertBox = document.getElementById("order-alert");
  const successBox = document.getElementById("order-success");
  const totalEl = document.getElementById("order-total");
  const countEl = document.getElementById("sum-count");
  const submitBtn = form.querySelector("button[type=submit]");
  const E = form.elements;
  let catalog = null;
  let sent = false;

  const payEl = document.getElementById("sum-pay");
  const gcashBox = document.getElementById("gcash-box");
  function syncPayment() {
    const gc = E.payment.value === "gcash";
    gcashBox.hidden = !gc;
    payEl.textContent = gc ? "GCash" : "Cash";
  }
  form.addEventListener("change", e => { if (e.target.name === "payment") syncPayment(); });
  syncPayment();

  /* After an order was sent, the thank-you box replaces the cart. Start fresh when the customer comes back to order again. */
  function resetAfterOrder() {
    sent = false;
    successBox.hidden = true;
    E.date.value = ""; E.instructions.value = ""; counter.textContent = "0 / 1000";
    form.querySelectorAll(".field").forEach(f => f.classList.remove("valid", "invalid"));
    form.querySelectorAll(".field-error").forEach(x => (x.textContent = ""));
    alertBox.hidden = true;
    render();
  }

  const ymd = d => { const p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  const byId = id => catalog.items.find(i => i.id === id);

  function lines() {
    return Cart.items.map(l => ({ ...l, item: byId(l.id) })).filter(l => l.item);
  }

  function render() {
    if (!catalog || sent) return;
    loading.hidden = true;
    const ls = lines();
    const has = ls.length > 0;
    emptyBox.hidden = has;
    layout.hidden = !has;
    if (!has) return;

    list.innerHTML = ls.map(({ id, qty, item }) => `
      <article class="cart-row" data-id="${esc(id)}">
        <div class="cart-prod">
          <img src="${esc(item.image)}" alt="${esc(item.name)}" width="96" height="72">
          <div>
            <h3>${esc(item.name)}</h3>
            <div class="card-size">${esc(item.size)} &middot; ${peso(item.price)} each</div>
            <button type="button" class="link-btn" data-act="remove">Remove</button>
          </div>
        </div>
        <div class="qty-pick" role="group" aria-label="Quantity for ${esc(item.name)}">
          <button type="button" data-act="minus" aria-label="Decrease quantity">&minus;</button>
          <input type="number" min="1" max="${Cart.MAX_QTY}" value="${qty}" aria-label="Quantity">
          <button type="button" data-act="plus" aria-label="Increase quantity">+</button>
        </div>
        <div class="cart-line-total" data-line-total>${peso(item.price * qty)}</div>
      </article>`).join("");
    updateTotals();
  }

  function updateTotals() {
    const ls = lines();
    const total = ls.reduce((s, l) => s + l.item.price * l.qty, 0);
    totalEl.textContent = ls.length ? peso(total) : "-";
    countEl.textContent = ls.reduce((n, l) => n + l.qty, 0);
  }

  /* Update one row in place (keeps focus while typing a quantity) */
  function refreshRow(row) {
    const l = lines().find(x => x.id === row.dataset.id);
    if (!l) return;
    row.querySelector("input").value = l.qty;
    row.querySelector("[data-line-total]").textContent = peso(l.item.price * l.qty);
    updateTotals();
  }

  list.addEventListener("click", e => {
    const row = e.target.closest(".cart-row");
    const btn = e.target.closest("[data-act]");
    if (!row || !btn) return;
    const id = row.dataset.id;
    const cur = Cart.items.find(i => i.id === id);
    if (!cur) return;
    if (btn.dataset.act === "remove") { Cart.remove(id); toast("Removed from cart."); render(); return; }
    if (btn.dataset.act === "minus") { if (cur.qty > 1) Cart.setQty(id, cur.qty - 1); else { Cart.remove(id); render(); return; } }
    if (btn.dataset.act === "plus") Cart.setQty(id, cur.qty + 1);
    refreshRow(row);
  });
  list.addEventListener("change", e => {
    const row = e.target.closest(".cart-row");
    if (!row || e.target.type !== "number") return;
    Cart.setQty(row.dataset.id, e.target.value);
    refreshRow(row);
  });

  const clearBtn = document.getElementById("cart-clear");
  const clearCancel = document.getElementById("cart-clear-cancel");
  let armTimer = null;
  function disarm() { clearTimeout(armTimer); clearBtn.dataset.armed = ""; clearBtn.textContent = "Empty cart"; clearCancel.hidden = true; }
  clearBtn.addEventListener("click", () => {
    if (!Cart.count()) return;
    if (clearBtn.dataset.armed !== "1") {          // first click: ask to confirm
      clearBtn.dataset.armed = "1";
      clearBtn.textContent = "Yes, remove all";
      clearCancel.hidden = false;
      armTimer = setTimeout(disarm, 5000);
      return;
    }
    disarm();                                       // second click: do it
    Cart.clear();
    toast("Your cart is empty.");
    render();
  });
  clearCancel.addEventListener("click", disarm);

  document.addEventListener("scf:cart", () => {
    if (!sent) render();
    else if (Cart.count() > 0) resetAfterOrder();     // a new cake was added after an order: show the cart again
  });
  document.addEventListener("scf:cartview", () => { if (sent) resetAfterOrder(); });   // opened the cart page again
  window.addEventListener("pageshow", e => { if (e.persisted && sent) resetAfterOrder(); });

  /* Login gate + autofill */
  function applyAuthState() {
    const u = SCF.user;
    const needLogin = SCF.requireLogin && !u;
    gate.hidden = !needLogin;
    form.hidden = needLogin;
    if (u) {
      if (!E.name.value) E.name.value = u.name;
      if (!E.email.value) E.email.value = u.email;
      if (!E.phone.value) E.phone.value = u.phone;
    }
  }
  document.addEventListener("scf:ready", applyAuthState);
  document.addEventListener("scf:authchange", () => { ["name", "email", "phone"].forEach(n => (E[n].value = "")); applyAuthState(); });

  const validateAll = Validate.live(form, {
    name: () => Validate.rules.name(E.name.value),
    phone: () => Validate.rules.phone(E.phone.value),
    email: () => Validate.rules.email(E.email.value),
    date: () => Validate.rules.date(E.date.value, E.date.min),
    instructions: () => (E.instructions.value.length > 1000 ? "Please keep instructions under 1000 characters." : ""),
  });
  const counter = document.getElementById("notes-count");
  E.instructions.addEventListener("input", () => { counter.textContent = E.instructions.value.length + " / 1000"; });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    alertBox.hidden = true;
    const ls = lines();
    if (!ls.length) { alertBox.textContent = "Your cart is empty. Please add a cake first."; alertBox.hidden = false; return; }
    if (!validateAll()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";
    const res = await SCF.order({
      name: E.name.value, email: E.email.value, phone: E.phone.value,
      items: ls.map(l => ({ cakeId: l.id, quantity: l.qty })),
      date: E.date.value, instructions: E.instructions.value, payment: E.payment.value,
      website: E.website.value, // honeypot
    });
    submitBtn.disabled = false;
    submitBtn.textContent = "Send Order Request";

    if (!res.ok) {
      if (res.fields) Object.entries(res.fields).forEach(([n, m]) => E[n] && Validate.setError(E[n], m));
      alertBox.textContent = res.error || "Something went wrong. Please try again.";
      alertBox.hidden = false;
      if (res.error && /log in/i.test(res.error)) applyAuthState();
      return;
    }

    sent = true;
    Cart.clear();
    layout.hidden = true;
    emptyBox.hidden = true;
    document.getElementById("success-code").textContent = res.orderCode;
    document.getElementById("success-note").textContent = res.duplicate
      ? "We already received this exact request, so we did not create a second one. Your reference number is shown above."
      : res.demo
      ? "Preview mode: no real email was sent."
      : res.emailPending
      ? "Your confirmation email is being sent to " + E.email.value + ". Please keep your reference number."
      : res.confirmationEmailSent
      ? "A confirmation email is on its way to " + E.email.value + ". We'll contact you to confirm availability, the final price, and payment."
      : "Your request was saved, but we couldn't send the confirmation email. Don't worry, we'll contact you soon. Please keep your reference number.";
    const payBox = document.getElementById("success-pay");
    if (E.payment.value === "gcash") {
      const site = window.SCF_SITE || {};
      payBox.textContent = "Payment: GCash. After we confirm your final price, send it to " + (site.gcashName || "our GCash account") + (site.gcashNumber ? " (" + site.gcashNumber + ")" : "") + " and reply with a screenshot and your reference number.";
    } else {
      payBox.textContent = "Payment: Cash when you pick up or receive your cake.";
    }
    payBox.hidden = false;
    successBox.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* Boot */
  Cart.loadCatalog().then(data => {
    catalog = data;
    Cart.prune(catalog);
    const min = new Date(); min.setDate(min.getDate() + (catalog.minLeadDays || 2));
    E.date.min = ymd(min);
    document.getElementById("lead-days").textContent = catalog.minLeadDays || 2;
    render();
  }).catch(() => {
    loading.innerHTML = '<p class="alert error">Sorry, your cart could not be loaded. Please refresh the page.</p>';
  });
})();

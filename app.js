/* Shared on every page: fills site info, mobile menu, login-aware navigation. */
document.addEventListener("DOMContentLoaded", async () => {
  const site = window.SCF_SITE || {};

  // Opened by double-clicking the file? Designing works, but login/orders/email need the server (XAMPP).
  if (false && location.protocol === "file:") {
    const bar = document.createElement("div");
    bar.className = "design-bar";
    bar.textContent = "Design preview: you opened this file directly. Login, orders and email only work through XAMPP (http://localhost/sweet-cake-factory/).";
    document.body.prepend(bar);
  }

  // Fill [data-site="phone"] etc. from js/config.js
  document.querySelectorAll("[data-site]").forEach(el => {
    const key = el.dataset.site;
    if (!site[key]) return;
    if (el.tagName === "A") {
      el.textContent = site[key];
      if (key === "email") el.href = "mailto:" + site[key] + "?subject=" + encodeURIComponent("Inquiry for " + (site.businessName || "Sweet Cake Factory"));
      else if (key === "phone") el.href = site.phoneHref || "tel:" + site[key];
      else if (key === "facebook" || key === "instagram") el.href = site[key];
    } else {
      el.textContent = site[key];
    }
  });
  document.querySelectorAll("[data-year]").forEach(el => (el.textContent = new Date().getFullYear()));

  // Mobile menu
  const toggle = document.querySelector(".menu-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    const closeMenu = () => { links.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); };
    links.addEventListener("click", e => { if (e.target.closest("a")) closeMenu(); });
    document.addEventListener("click", e => { if (!e.target.closest(".nav")) closeMenu(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });
  }

  // Session state
  await SCF.init();
  renderAuthNav();
  document.dispatchEvent(new CustomEvent("scf:ready"));
});

function renderAuthNav() {
  const slot = document.getElementById("auth-nav");
  if (!slot) return;
  const u = SCF.user;
  if (u) {
    slot.innerHTML = `<span class="nav-user">Hi, ${esc(u.name.split(" ")[0])}</span>
      <button class="btn outline small" id="logout-btn" type="button">Log out</button>`;
    document.getElementById("logout-btn").addEventListener("click", async () => {
      const r = await SCF.logout();
      if (r.ok) {
        toast("You have been logged out.");
        renderAuthNav();
        document.dispatchEvent(new CustomEvent("scf:authchange"));
        if (document.body.dataset.page === "auth-only") location.href = "index.html";
      }
    });
  } else {
    slot.innerHTML = `<a class="btn outline small" href="login.html">Log in</a>
      <a class="btn small" href="register.html">Sign up</a>`;
  }
}

/* Tiny fetch wrapper for the PHP backend. Holds the CSRF token. Contains no secrets. */
const SCF = (() => {
  let csrf = "";
  let user = null;
  let requireLogin = true;

  let demo = true;   // no server: accounts live in this browser, emails go out through backend.js

  async function request(path, payload) {
    const demoFn = window.SCF_DEMO_HANDLER;
    if (demo && demoFn) return demoFn(path, payload);
    const opts = payload === undefined
      ? { method: "GET", credentials: "same-origin" }
      : {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
          body: JSON.stringify(payload),
        };
    let res, data;
    try {
      res = await fetch("api/" + path, opts);
      data = await res.json();
    } catch (e) {
      // No PHP backend (static preview / file:// / server off): fall back to preview mode if available.
      if (demoFn && path === "me.php") { demo = true; return demoFn(path, payload); }
      return { ok: false, error: "Could not reach the server. Please check your connection and try again." };
    }
    if (data && data.csrf) csrf = data.csrf;
    return data;
  }

  async function init() {
    const data = await request("me.php");
    if (data && data.ok) {
      user = data.user;
      requireLogin = data.requireLogin !== false;
    }
    return { user, requireLogin, ok: !!(data && data.ok), error: data && data.error };
  }

  return {
    init,
    get user() { return user; },
    get requireLogin() { return requireLogin; },
    get demo() { return demo; },
    setUser(u) { user = u; },
    register: (p) => request("register.php", p),
    login: async (p) => { const r = await request("login.php", p); if (r.ok) user = r.user; return r; },
    logout: async () => { const r = await request("logout.php", {}); if (r.ok) user = null; return r; },
    order: (p) => request("order.php", p),
    contact: (p) => request("contact.php", p),
  };
})();

/* Shared helpers */
function peso(n) {
  return "PHP " + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function toast(msg, action) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = msg;
  if (action && action.href) {
    const a = document.createElement("a");
    a.href = action.href; a.textContent = action.label || "View";
    t.append(" ", a);
  }
  t.classList.toggle("has-action", !!action);
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), action ? 4500 : 3200);
}
/* Show server-side field errors under the matching inputs */
function showFieldErrors(form, fields) {
  form.querySelectorAll(".field").forEach(f => { f.classList.remove("invalid"); const e = f.querySelector(".field-error"); if (e) e.textContent = ""; });
  Object.entries(fields || {}).forEach(([name, msg]) => {
    const input = form.querySelector(`[name="${name}"]`);
    if (!input) return;
    const field = input.closest(".field");
    if (field) {
      field.classList.add("invalid");
      let e = field.querySelector(".field-error");
      if (!e) { e = document.createElement("div"); e.className = "field-error"; field.appendChild(e); }
      e.textContent = msg;
    }
  });
}

/* Login and registration forms.
   Flow: Sign up -> (account created) -> Log in page -> Home / landing page. */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("auth-form");
  if (!form) return;
  const mode = form.dataset.mode; // "login" | "register"
  const alertBox = document.getElementById("auth-alert");
  const okBox = document.getElementById("auth-success");
  const btn = form.querySelector("button[type=submit]");
  const label = btn.textContent;
  const E = form.elements;
  // Where to go after login (e.g. back to the cart). Only plain local page names are allowed.
  const rawNext = new URLSearchParams(location.search).get("next") || "";
  const next = /^[a-z][a-z-]*\.html$/.test(rawNext) ? rawNext : "";
  const nextQ = next ? "&next=" + encodeURIComponent(next) : "";
  document.querySelectorAll(".altlink a").forEach(a => {
    if (next) a.href = a.getAttribute("href").split("?")[0] + "?next=" + encodeURIComponent(next);
  });

  // Already logged in? Go straight to the home page.
  document.addEventListener("scf:ready", () => { if (SCF.user) location.replace(next || "index.html"); });

  // Message shown on the login page after a successful sign-up
  if (mode === "login" && okBox && new URLSearchParams(location.search).get("registered") === "1") {
    okBox.textContent = "Account created! Please log in to continue.";
    okBox.hidden = false;
  }

  // Show / hide password buttons
  form.querySelectorAll("[data-toggle-pw]").forEach(b => {
    b.addEventListener("click", () => {
      const input = form.elements[b.dataset.togglePw];
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      b.textContent = show ? "Hide" : "Show";
      b.setAttribute("aria-pressed", String(show));
    });
  });

  // Validation rules per page
  const checks = mode === "register" ? {
    name: () => Validate.rules.name(E.name.value),
    email: () => Validate.rules.email(E.email.value),
    phone: () => Validate.rules.phone(E.phone.value),
    password: () => Validate.rules.password(E.password.value),
    confirm: () => Validate.rules.confirm(E.confirm.value, E.password.value),
  } : {
    email: () => Validate.rules.email(E.email.value),
    password: () => Validate.rules.loginPassword(E.password.value),
  };
  const validateAll = Validate.live(form, checks);

  if (mode === "register") {
    const bar = document.getElementById("pw-meter");
    const txt = document.getElementById("pw-text");
    const words = ["Too short", "Weak", "Okay", "Good", "Strong"];
    E.password.addEventListener("input", () => {
      const v = E.password.value;
      const s = !v ? -1 : (Validate.rules.password(v) ? 0 : Math.max(1, Validate.strength(v)));
      bar.dataset.level = s < 0 ? "" : String(s);
      txt.textContent = s < 0 ? "" : words[s];
      if (E.confirm.value) E.confirm.dispatchEvent(new Event("input"));
    });
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    alertBox.hidden = true;
    if (!validateAll()) return;

    btn.disabled = true; btn.textContent = "Please wait...";
    const payload = { email: E.email.value.trim(), password: E.password.value };
    if (mode === "register") { payload.name = E.name.value.trim(); payload.phone = E.phone.value.trim(); }
    const res = mode === "register" ? await SCF.register(payload) : await SCF.login(payload);
    btn.disabled = false; btn.textContent = label;

    if (res.ok) {
      location.href = mode === "register" ? "login.html?registered=1" + nextQ : (next || "index.html");
      return;
    }
    if (res.fields) Object.entries(res.fields).forEach(([n, m]) => E[n] && Validate.setError(E[n], m));
    alertBox.textContent = res.error || "Something went wrong. Please try again.";
    alertBox.hidden = false;
  });
});

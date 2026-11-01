/* Form validation rules. The PHP backend enforces the SAME rules (never trust the browser alone). */
const Validate = (() => {
  const rules = {
    name(v) {
      v = v.trim();
      if (!v) return "Please enter your full name.";
      if (v.length < 2) return "Name is too short.";
      if (v.length > 80) return "Name is too long (80 characters max).";
      if (!/^[\p{L}][\p{L}\s.'\-]*$/u.test(v)) return "Name can only contain letters, spaces, . ' and -";
      return "";
    },
    email(v) {
      v = v.trim();
      if (!v) return "Please enter your email address.";
      if (v.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Please enter a valid email, like name@example.com.";
      return "";
    },
    phone(v) {
      v = v.trim();
      if (!v) return "Please enter your contact number.";
      const d = v.replace(/[\s\-()]/g, "");
      if (!/^(\+63|63|0)9\d{9}$/.test(d)) return "Enter a valid PH mobile number, like 0917 123 4567.";
      return "";
    },
    password(v) {
      if (!v) return "Please create a password.";
      if (v.length < 5) return "Password must be at least 5 characters.";
      if (v.length > 200) return "Password is too long.";
      return "";
    },
    loginPassword(v) { return v ? "" : "Please enter your password."; },
    confirm(v, pw) {
      if (!v) return "Please confirm your password.";
      if (v !== pw) return "Passwords do not match.";
      return "";
    },
    cake(v) { return v ? "" : "Please choose a cake."; },
    quantity(v) {
      if (String(v).trim() === "") return "Please enter a quantity.";
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 50) return "Quantity must be a whole number from 1 to 50.";
      return "";
    },
    date(v, min) {
      if (!v) return "Please choose a requested date.";
      if (min && v < min) return "Please choose " + prettyDate(min) + " or later.";
      const max = new Date(); max.setFullYear(max.getFullYear() + 1);
      if (new Date(v) > max) return "Please choose a date within the next year.";
      return "";
    },
    message(v, min = 10) {
      v = v.trim();
      if (!v) return "Please write a message.";
      if (v.length < min) return "Please write at least " + min + " characters.";
      return "";
    },
  };

  function prettyDate(ymd) {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  }

  function setError(input, msg) {
    const field = input.closest(".field");
    if (!field) return;
    let e = field.querySelector(".field-error");
    if (!e) { e = document.createElement("div"); e.className = "field-error"; e.setAttribute("role", "alert"); field.appendChild(e); }
    e.textContent = msg;
    field.classList.toggle("invalid", !!msg);
    field.classList.toggle("valid", !msg && input.value !== "");
    input.setAttribute("aria-invalid", msg ? "true" : "false");
  }

  /* checks: { fieldName: () => errorMessage }. Validates on blur, then live while typing. */
  function live(form, checks) {
    Object.keys(checks).forEach(name => {
      const input = form.elements[name];
      if (!input) return;
      let touched = false;
      const run = () => setError(input, checks[name]());
      input.addEventListener("blur", () => { touched = true; run(); });
      input.addEventListener("input", () => { if (touched) run(); });
      input.addEventListener("change", () => { touched = true; run(); });
    });
    /* validateAll(): shows every error, focuses the first bad field, returns true if all OK */
    return function validateAll() {
      let first = null;
      Object.keys(checks).forEach(name => {
        const input = form.elements[name];
        if (!input) return;
        const msg = checks[name]();
        setError(input, msg);
        if (msg && !first) first = input;
      });
      if (first) first.focus();
      return !first;
    };
  }

  /* Password strength: 0-4 */
  function strength(pw) {
    let s = 0;
    if (pw.length >= 8) s++;
    if (pw.length >= 12) s++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
    if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
    return Math.min(s, 4);
  }

  return { rules, setError, live, strength };
})();

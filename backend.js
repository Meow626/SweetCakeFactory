/* Built-in backend (no server needed).
   - Accounts + login: kept in this browser's localStorage.
   - Emails: sent through FormSubmit (formsubmit.co), a free form-to-email service that works from a plain web page.
       * Every order / contact message is emailed to BUSINESS_EMAIL.
       * The customer automatically gets a confirmation email (FormSubmit "autoresponse").
   FIRST TIME ONLY: FormSubmit emails an "Activate" link to BUSINESS_EMAIL after the very first submit.
   Open it in Outlook and click it once; after that every order is delivered normally. */
window.SCF_DEMO_HANDLER = (() => {
  const BUSINESS_EMAIL = "sweetcakefactory@rojinal.com";
  const ENDPOINT = "https://formsubmit.co/ajax/" + BUSINESS_EMAIL;

  const KEY_USERS = "scf_demo_users", KEY_SESSION = "scf_demo_session", KEY_ORDERS = "scf_demo_orders", KEY_MSGS = "scf_demo_messages";
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const fail = (error, fields) => ({ ok: false, error, ...(fields ? { fields } : {}) });
  const pubUser = u => u && { id: u.id, name: u.name, email: u.email, phone: u.phone };
  const current = () => { const id = read(KEY_SESSION, null); return read(KEY_USERS, []).find(u => u.id === id) || null; };
  const peso = n => "PHP " + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  async function hash(s) {
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("scf-demo:" + s));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    } catch (e) { return "plain:" + s; }   // crypto.subtle needs https/localhost
  }

  /* Send one email through FormSubmit. Returns { ok, error }. */
  async function sendEmail(fields) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ _template: "table", _captcha: "false", ...fields }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && String(data.success) !== "false") return { ok: true };
      return { ok: false, error: data.message || "The email service refused the request." };
    } catch (e) {
      return { ok: false, error: "Could not reach the email service. Check your internet connection." };
    }
  }

  return async function (path, p) {
    p = p || {};
    switch (path) {
      case "me.php":
        return { ok: true, csrf: "demo", user: pubUser(current()), requireLogin: true, demo: true };

      case "register.php": {
        const name = String(p.name || "").trim(), email = String(p.email || "").trim().toLowerCase();
        const users = read(KEY_USERS, []);
        if (users.some(u => u.email === email)) return fail("An account with that email already exists. Try logging in instead.", { email: "Email already registered." });
        users.push({ id: Date.now(), name, email, phone: String(p.phone || "").trim(), pw: await hash(String(p.password || "")) });
        write(KEY_USERS, users);
        return { ok: true, registered: true, demo: true };
      }

      case "login.php": {
        const email = String(p.email || "").trim().toLowerCase();
        const u = read(KEY_USERS, []).find(x => x.email === email);
        if (!u || u.pw !== await hash(String(p.password || ""))) return fail("Incorrect email or password.");
        write(KEY_SESSION, u.id);
        return { ok: true, csrf: "demo", user: pubUser(u), demo: true };
      }

      case "logout.php":
        try { localStorage.removeItem(KEY_SESSION); } catch (e) {}
        return { ok: true };

      case "order.php": {
        if (!current()) return fail("Please log in or create an account to send an order request.");
        if (p.website) return { ok: true, orderCode: "SCF-000000" };   // honeypot: bots only

        const cat = (window.SCF_CATALOG && window.SCF_CATALOG.items) || [];
        let total = 0;
        const lines = (p.items || []).map(it => {
          const cake = cat.find(c => c.id === it.cakeId);
          if (!cake) return null;
          const qty = Math.max(1, Math.min(50, parseInt(it.quantity, 10) || 1));
          total += cake.price * qty;
          return qty + " x " + cake.name + " (" + (cake.size || "") + ") @ " + peso(cake.price) + " = " + peso(cake.price * qty);
        }).filter(Boolean);
        if (!lines.length) return fail("Your cart is empty. Please add a cake first.");

        const code = "SCF-" + Math.random().toString(36).slice(2, 8).toUpperCase();
        const payment = p.payment === "cash" ? "Cash on pickup/delivery" : "GCash";
        const sent = await sendEmail({
          _subject: "New cake order " + code + " from " + p.name,
          _replyto: p.email,
          email: p.email,
          "Reference": code,
          "Customer name": p.name,
          "Contact number": p.phone,
          "Cakes ordered": lines.join("\n"),
          "Estimated total": peso(total),
          "Requested date": p.date,
          "Payment": payment,
          "Special instructions": p.instructions || "(none)",
          _autoresponse:
            "Hi " + p.name + ", thank you for ordering from Sweet Cake Factory! We received your request " + code + ":\n\n" +
            lines.join("\n") + "\nEstimated total: " + peso(total) + "\nRequested date: " + p.date + "\nPayment: " + payment + "\n\n" +
            "This is a request, not yet a confirmed order. We will contact you shortly to confirm availability, the final price and payment details.",
        });
        if (!sent.ok) return fail("We couldn't send your order email: " + sent.error + " Please try again.");

        const orders = read(KEY_ORDERS, []);
        orders.push({ code, ...p, created: new Date().toISOString() });
        write(KEY_ORDERS, orders);
        return { ok: true, orderCode: code, confirmationEmailSent: true };
      }

      case "contact.php": {
        if (p.website) return { ok: true };
        const sent = await sendEmail({
          _subject: "Website message from " + p.name,
          _replyto: p.email,
          email: p.email,
          "Name": p.name,
          "Message": p.message,
          _autoresponse: "Hi " + p.name + ", thanks for contacting Sweet Cake Factory. We got your message and will reply soon.",
        });
        if (!sent.ok) return fail("We couldn't send your message: " + sent.error + " Please try again.");
        const msgs = read(KEY_MSGS, []);
        msgs.push({ ...p, created: new Date().toISOString() });
        write(KEY_MSGS, msgs);
        return { ok: true };
      }
    }
    return fail("Unknown request.");
  };
})();

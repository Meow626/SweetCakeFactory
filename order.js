/* Contact Us form (the order form now lives on the cart page: js/cart-page.js). */
(() => {
  const form = document.getElementById("contact-form");
  if (!form) return;
  const alertBox = document.getElementById("contact-alert");
  const btn = form.querySelector("button[type=submit]");

  document.addEventListener("scf:ready", () => {
    if (SCF.user) {
      if (!form.elements.name.value) form.elements.name.value = SCF.user.name;
      if (!form.elements.email.value) form.elements.email.value = SCF.user.email;
    }
  });

  const CE = form.elements;
  const validateAll = Validate.live(form, {
    name: () => Validate.rules.name(CE.name.value),
    email: () => Validate.rules.email(CE.email.value),
    message: () => Validate.rules.message(CE.message.value, 10),
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    alertBox.hidden = true;
    if (!validateAll()) return;
    btn.disabled = true; btn.textContent = "Sending...";
    const res = await SCF.contact({
      name: form.elements.name.value,
      email: form.elements.email.value,
      message: form.elements.message.value,
      website: form.elements.website.value,
    });
    btn.disabled = false; btn.textContent = "Send Message";
    if (res.ok) {
      form.elements.message.value = "";
      form.querySelectorAll(".field").forEach(f => f.classList.remove("valid", "invalid"));
      alertBox.className = "alert success";
      alertBox.textContent = "Thank you! Your message was sent. We'll reply soon.";
      alertBox.hidden = false;
    } else {
      if (res.fields) Object.entries(res.fields).forEach(([n, m]) => CE[n] && Validate.setError(CE[n], m));
      alertBox.className = "alert error";
      alertBox.textContent = res.error || "Something went wrong. Please try again.";
      alertBox.hidden = false;
    }
  });
})();

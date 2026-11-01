SWEET CAKE FACTORY - all files in ONE folder (no sub-folders)

Open index.html. Upload every file in this folder to your hosting's public_html (any static host works, no PHP needed).

Pages:    index.html, cart.html, login.html, register.html
Style:    styles.css
Scripts:  config.js (phone/address/social), catalog-data.js (cakes + prices), backend.js (accounts + email), the rest are helpers
Pictures: *.jpg and logo.svg

EMAIL: orders and Contact Us messages are emailed to sweetcakefactory@rojinal.com through FormSubmit, and the customer gets
a confirmation. The FIRST submit sends an "Activate Form" email to that mailbox: open it in Outlook and click the link once.

To change the email address, edit BUSINESS_EMAIL at the top of backend.js.
To change cakes/prices, edit catalog-data.js.

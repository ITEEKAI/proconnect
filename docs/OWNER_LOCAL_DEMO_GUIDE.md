# Owner guide — view the OffGrid056 and HPLBIZ prototypes locally

These are local demonstration editions. They do not deploy anything, contact real professionals, create Zoom meetings or take live payments. Use demonstration data only.

## First-time setup

Ask the developer to complete `npm install` once on a computer with Node.js 22.5 or newer. After that, the owner does not need to edit source code or type configuration commands.

## Open OffGrid056

1. Open the repository folder and then the `scripts` folder.
2. Double-click `Start-OffGrid056.cmd`.
3. Keep the command window open. The browser should open after about eight seconds.
4. If it does not open, visit `http://127.0.0.1:5173`.

Local demonstration logins are shown on the login page:

- Customer: `client@proconnect.test` / `password123`
- Professional: `resilience.demo@offgrid056.test` / `password123`
- Administrator: `admin@proconnect.test` / `admin1234`

## Open HPLBIZ

1. Double-click `Start-HPLBIZ.cmd` in the same `scripts` folder.
2. Keep its second command window open.
3. Visit `http://127.0.0.1:5174` if the browser does not open automatically.

HPLBIZ uses different local credentials:

- Customer: `client@hplbiz.test` / `hpl-client-demo`
- Professional: `strategy.demo@hplbiz.test` / `hpl-pro-demo`
- Administrator: `admin@hplbiz.test` / `hpl-admin-demo`

Both editions can run together. OffGrid056 uses ports 5173/4000 and `.local-data/offgrid056`; HPLBIZ uses ports 5174/4100 and `.local-data/hplbiz`. Their users and transactions do not mix.

## Suggested owner test

1. Check the prototype warning, business name, colours, categories and demo-profile labels.
2. Open a profile and confirm the displayed rate is NZD.
3. Sign in as the customer and create one online consultation request and one on-site request. No external calendar, video meeting or payment is created.
4. Sign out, sign in as the professional, view the requests, accept one and inspect My rates.
5. Sign in as the administrator, inspect the dashboard and professional-verification controls.
6. Repeat the identity/category/directory checks in HPLBIZ and confirm its OffGrid056 credentials do not work there.

To stop an edition, return to its command window and press `Ctrl+C`. Closing the window also stops the local application. Local demonstration data remains in that edition’s `.local-data` folder for the next session.

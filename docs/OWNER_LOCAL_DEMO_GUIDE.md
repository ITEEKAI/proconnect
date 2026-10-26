# Owner guide — open and test both local prototypes

These are local demonstration editions. They do not deploy anything, contact real professionals, create Zoom meetings or take live payments. Use demonstration data only.

## Before the first demonstration

Ask the developer to complete the one-time software setup on the demonstration computer. Once that is done, the owner does not need to edit a source file or enter a terminal command.

## Open OffGrid056

1. Open the ProConnect repository folder, then open the `scripts` folder.
2. Double-click `Start-OffGrid056.cmd`.
3. Keep the command window open. The web browser should open automatically after about eight seconds.
4. If the browser does not open, type `http://127.0.0.1:5173` into its address bar.

The OffGrid056 login page displays these local demonstration accounts:

- Customer: `client@proconnect.test` / `password123`
- Professional: `resilience.demo@offgrid056.test` / `password123`
- Administrator: `admin@proconnect.test` / `admin1234`

## Open HPLBIZ

1. In the same `scripts` folder, double-click `Start-HPLBIZ.cmd`.
2. Keep the second command window open.
3. The browser should open automatically. If it does not, type `http://127.0.0.1:5174` into its address bar.

HPLBIZ uses different local demonstration accounts:

- Customer: `client@hplbiz.test` / `hpl-client-demo`
- Professional: `strategy.demo@hplbiz.test` / `hpl-pro-demo`
- Administrator: `admin@hplbiz.test` / `hpl-admin-demo`

Both editions can run at the same time. Their ports, databases, accounts and transactions are separate.

## Suggested owner demonstration

1. On each homepage, check the prototype warning, business name, colours, seven categories and demo-profile labels. Narrow the browser window to confirm the page does not scroll sideways.
2. Open a professional profile and confirm the displayed rate is in NZD.
3. Sign in as the customer. Create one online consultation request and one on-site request. No real calendar event, Zoom meeting or payment is created.
4. Sign out and sign in as the professional. View the requests, accept one, and open **My rates**.
5. Sign in as the administrator. Open the dashboard and inspect professional verification and directory-listing controls.
6. Open HPLBIZ and confirm its business categories and profiles are different. Confirm an OffGrid056 login does not work in HPLBIZ.

## Stop the prototypes

Return to each command window and press `Ctrl+C`. Closing the command window also stops that local edition. Demonstration data remains in that edition's separate `.local-data` folder for the next session.

The two launchers and their edition/port isolation were re-tested successfully on Windows on 27 October 2026.

# ProConnect business-edition cloning

ProConnect runs one configured business edition and one database per process. That reuses the marketplace engine without mixing authentication, billing, customer records or professional records across businesses.

## Launch an existing edition

Set `BUSINESS_EDITION` to a registered edition ID and give that process its own `DATA_DIR`, API port, web port and public URL. The included Windows launchers demonstrate this for `offgrid056` and `hplbiz`; they do not edit source code and their databases are kept in separate folders.

## Add a future 056 edition

1. Create one edition module beside `server/src/business/editions/offgrid056.ts` and implement the `MarketplaceEdition` interface.
2. Register the new ID and module once in `server/src/business/marketplace.ts`.
3. Configure identity, logo text, brand colours, locale, ISO 4217 currency, categories, plans, commission basis points, booking pathways, integration modes, demo accounts and search copy in that module.
4. Add clearly labelled edition-specific seed profiles. Never imply that fictional records are real verified providers.
5. Give the edition a unique `DATA_DIR` and unique test credentials. Never point two editions at the same database.
6. Add an isolated child-process test equivalent to `hplbiz-edition.test.ts`; it must verify identity, categories, sample data and credential separation.
7. Run the automated tests, typecheck, production build, dependency audit and browser acceptance suite.
8. Obtain owner approval before adding a domain, production database, external credentials, live payments or a public deployment.

## Configuration coverage

- Identity, marketplace/platform/operator names, tagline and logo text.
- Primary, dark-primary, accent and surface colours.
- Country, locale, currency, symbol and regions.
- Public categories and edition-specific demonstration profiles.
- Membership plans, minor-unit fees and commission basis points.
- Consultation and on-site pathways and their coordinators.
- TidyCal, Zoom, OS handoff and payment modes.
- Prototype notice, demo credentials and search examples.

The current proof still requires one small registry edit for a brand-new edition. A future improvement should discover edition modules from a validated manifest so adding a business is configuration-only. Shared page copy should also continue moving into the edition configuration instead of accumulating business-name conditionals.

## Data and money rules

Money is stored in integer minor units. For NZD, `$145.00` is stored as `14500`. Every booking snapshots rate, call-out fee and currency. Configuration changes do not convert existing records: create a separate database or write and verify an explicit migration.

## Deliberate MVP limits

- One business edition per process and database.
- No cross-edition administration, identity or billing.
- No live TidyCal, Zoom or OffGrid056 OS credentials.
- No automatic transfer of private customer records.
- No live payments or provider payouts.

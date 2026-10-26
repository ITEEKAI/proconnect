# ProConnect business-edition cloning

ProConnect uses one deployment per business edition. This keeps the MVP maintainable: it reuses the marketplace engine without introducing tenant-aware authentication, billing, data isolation or routing.

## Clone an edition

1. Create a feature branch from the latest approved ProConnect baseline.
2. Copy `server/src/business/marketplace.ts` and change the single exported `marketplace` object.
3. Set the business identity, logo text, brand colours, New Zealand or international locale, ISO 4217 currency, categories, plans, commission basis points, booking pathways and integration status.
4. Replace OffGrid056 prototype seed profiles with clearly labelled edition-specific test records. Never seed a fictional provider in a way that implies they are a real verified professional.
5. Update edition-specific copy only where the shared configuration does not cover it.
6. Add tests equivalent to `server/src/test/marketplace.test.ts`: public configuration, category boundary, currency, demo labelling, booking type and integration reference handling.
7. Run `npm test`, `npm run typecheck`, `npm run build` and `npm audit`.
8. Obtain owner approval before configuring a public domain, live payment keys or a production deployment.

## Supported configuration

- Identity: business, marketplace, platform and operator names; tagline and logo text.
- Branding: primary, dark-primary, accent and surface colours.
- Locale: country, locale, currency, symbol and region list.
- Catalogue: public professional categories.
- Commercial model: membership plans, fees in integer minor units and commission basis points.
- Booking: consultation and on-site pathways, coordinator and planned providers.
- Integrations: explicit mock/planned/test-only modes.
- Prototype controls: visible notice and demo-profile labelling.

## Data and money rules

Money is stored as integer minor units. For NZD, `$145.00` is stored as `14500`; it is not a relabelled GBP value. Every booking snapshots its professional rate, call-out fee and currency. A future edition must seed and create plans, profiles, invoices and bookings in its configured ISO currency and must add tests for fractional values, totals and rate snapshots.

Changing the configuration does not convert existing database records. Clone into a new database or write and verify an explicit migration.

## Deliberate MVP limits

- One business edition per deployment.
- No cross-edition user or billing administration.
- No live TidyCal, Zoom or OffGrid056 OS credentials.
- No automatic transfer of private customer records.
- No live payments or provider payouts.

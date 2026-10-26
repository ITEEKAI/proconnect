# HPLBIZ cloning proof

Date: 27 October 2026  
Branch: `feature/056-mvp-integration`

## Result

HPLBIZ runs as an independent marketplace edition from the same ProConnect codebase. It was launched alongside OffGrid056 with its own configuration, ports, database folder and credentials. No OffGrid056 configuration was overwritten and neither edition was deployed.

| Boundary | OffGrid056 | HPLBIZ |
| --- | --- | --- |
| Edition ID | `offgrid056` | `hplbiz` |
| Web/API ports | 5173 / 4000 | 5174 / 4100 |
| Acceptance database | `.local-data/acceptance-offgrid` | `.local-data/acceptance-hplbiz` |
| Brand | Green/earth | Navy/gold |
| Catalogue | Seven resilience fields | Seven business-advisory fields |
| Sample profiles | OffGrid056 demo specialists | HPLBIZ demo advisers |
| Customer credential | `client@proconnect.test` | `client@hplbiz.test` |

The automated edition-isolation test boots HPLBIZ in a separate child process, confirms its seven categories and seven demo advisers, accepts the HPLBIZ client credential and rejects the OffGrid056 client credential. The browser test repeated the identity, category, directory and credential checks against a live HPLBIZ process.

## Configuration changes made for the proof

- Extracted a typed `MarketplaceEdition` contract.
- Moved OffGrid056 into its own edition module without changing its selected default.
- Added a distinct HPLBIZ module containing identity, colours, categories, plans, booking copy, search copy and test credentials.
- Added `BUSINESS_EDITION` selection with fail-fast validation.
- Made seed data edition-aware and kept each process on a separate `DATA_DIR`.
- Made login demonstration buttons edition-aware, while suppressing demo credentials from the production configuration response.
- Added `WEB_PORT` and API-proxy configuration so two editions can run together.

## Further cloning simplification

Future editions should require only a validated configuration module and a sample-data fixture. Remaining source-level friction is the one-line edition registry and some shared marketing copy. A validated edition manifest plus configuration-driven content blocks would remove most repeated code changes. True multi-tenancy is not recommended for this MVP; separate processes and databases are the safer boundary.

Evidence: `16-hplbiz-home.png`, `17-hplbiz-categories.png` and `18-hplbiz-directory.png` in `docs/screenshots/phase1b`.

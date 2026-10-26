import { hplbizEdition } from './editions/hplbiz.ts';
import { offgrid056Edition } from './editions/offgrid056.ts';

const editions = { offgrid056: offgrid056Edition, hplbiz: hplbizEdition } as const;
export type MarketplaceEditionId = keyof typeof editions;

function selectedEdition(): MarketplaceEditionId {
  const requested = (process.env.BUSINESS_EDITION ?? 'offgrid056').toLowerCase();
  if (requested in editions) return requested as MarketplaceEditionId;
  throw new Error(`Unknown BUSINESS_EDITION "${requested}". Choose one of: ${Object.keys(editions).join(', ')}.`);
}

/** One process and database serve exactly one configured business edition. */
export const marketplace = editions[selectedEdition()];
export const marketplaceCategorySlugs = marketplace.categories.map((category) => category.slug);
export const availableMarketplaceEditions = Object.keys(editions) as MarketplaceEditionId[];

export function publicMarketplaceConfig() {
  if (process.env.NODE_ENV !== 'production') return marketplace;
  const { demoAccounts: _demoAccounts, ...publicConfig } = marketplace;
  return publicConfig;
}

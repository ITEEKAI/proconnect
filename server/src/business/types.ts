export type ServiceType = 'consultation' | 'onsite';

export interface MarketplaceCategoryConfig { slug: string; name: string; description: string; icon: string }
export interface MarketplacePlanConfig {
  slug: string; name: string; description: string; monthlyFeeCents: number; commissionBps: number;
  maxListings: number; features: string[]; sortOrder: number;
}
export interface MarketplaceEdition {
  edition: string;
  identity: { businessName: string; marketplaceName: string; platformName: string; operatorName: string; tagline: string; logoText: string };
  branding: { primary: string; primaryDark: string; accent: string; surface: string };
  locale: { countryCode: string; countryName: string; locale: string; currency: string; currencySymbol: string; regions: readonly string[] };
  categories: readonly MarketplaceCategoryConfig[];
  membershipPlans: readonly MarketplacePlanConfig[];
  booking: {
    serviceTypes: readonly ServiceType[];
    consultation: { enabled: boolean; provider: string; status: 'planned' | 'sandbox' | 'live'; durationMinutes: readonly number[]; videoProvider: string };
    onsite: { enabled: boolean; coordinator: string };
  };
  integrations: {
    offgrid056Os: { mode: 'mock' | 'sandbox' | 'live'; privateRecordTransfer: boolean };
    tidycal: { mode: 'planned' | 'sandbox' | 'live'; verified: boolean };
    zoom: { mode: 'planned' | 'sandbox' | 'live'; verified: boolean };
    payments: { mode: 'test-only' | 'live'; liveEnabled: boolean };
  };
  prototype: { enabled: boolean; notice: string };
  demoAccounts: {
    admin: { email: string; password: string; name: string };
    client: { email: string; password: string; name: string };
    professional: { email: string; password: string; label: string };
  };
  marketing: { searchExamples: readonly string[]; searchPlaceholder: string };
}

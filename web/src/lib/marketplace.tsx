import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';

export interface MarketplaceConfig {
  edition: string;
  identity: {
    businessName: string;
    marketplaceName: string;
    platformName: string;
    operatorName: string;
    tagline: string;
    logoText: string;
  };
  branding: { primary: string; primaryDark: string; accent: string; surface: string };
  locale: {
    countryCode: string;
    countryName: string;
    locale: string;
    currency: string;
    currencySymbol: string;
    regions: readonly string[];
  };
  booking: {
    serviceTypes: readonly ('consultation' | 'onsite')[];
    consultation: { enabled: boolean; provider: string; status: string; durationMinutes: readonly number[]; videoProvider: string };
    onsite: { enabled: boolean; coordinator: string };
  };
  integrations: {
    offgrid056Os: { mode: string; privateRecordTransfer: boolean };
    tidycal: { mode: string; verified: boolean };
    zoom: { mode: string; verified: boolean };
    payments: { mode: string; liveEnabled: boolean };
  };
  prototype: { enabled: boolean; notice: string };
  demoAccounts?: {
    admin: { email: string; password: string; name: string };
    client: { email: string; password: string; name: string };
    professional: { email: string; password: string; label: string };
  };
  marketing: { searchExamples: readonly string[]; searchPlaceholder: string };
}

const fallback: MarketplaceConfig = {
  edition: 'offgrid056',
  identity: {
    businessName: 'OffGrid056', marketplaceName: 'OffGrid056 Specialist Marketplace',
    platformName: 'ProConnect', operatorName: '056',
    tagline: 'Practical expertise for a more resilient home, business and community.', logoText: 'OffGrid056',
  },
  branding: { primary: '#2f6b45', primaryDark: '#1f4d32', accent: '#d29b3a', surface: '#f4f1e8' },
  locale: { countryCode: 'NZ', countryName: 'New Zealand', locale: 'en-NZ', currency: 'NZD', currencySymbol: '$', regions: [] },
  booking: {
    serviceTypes: ['consultation', 'onsite'],
    consultation: { enabled: true, provider: 'tidycal', status: 'planned', durationMinutes: [30, 60, 90], videoProvider: 'zoom' },
    onsite: { enabled: true, coordinator: 'SimplyServices' },
  },
  integrations: {
    offgrid056Os: { mode: 'mock', privateRecordTransfer: false },
    tidycal: { mode: 'planned', verified: false }, zoom: { mode: 'planned', verified: false },
    payments: { mode: 'test-only', liveEnabled: false },
  },
  prototype: { enabled: true, notice: 'Prototype environment. Demo profiles and transactions are test data.' },
  marketing: { searchExamples: ['Rainwater', 'Battery backup', 'Resilience plan'], searchPlaceholder: 'e.g. rainwater, solar, preparedness' },
};

const MarketplaceContext = createContext<MarketplaceConfig>(fallback);

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    api<{ marketplace: MarketplaceConfig }>('/marketplace/config')
      .then((response) => setValue(response.marketplace))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-brand-600', value.branding.primary);
    root.style.setProperty('--color-brand-700', value.branding.primaryDark);
    root.style.setProperty('--color-accent-500', value.branding.accent);
  }, [value]);

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

export function useMarketplace(): MarketplaceConfig {
  return useContext(MarketplaceContext);
}

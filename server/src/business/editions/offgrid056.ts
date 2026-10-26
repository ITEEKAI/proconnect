import type { MarketplaceEdition } from '../types.ts';

export const offgrid056Edition: MarketplaceEdition = {
  edition: 'offgrid056',
  identity: { businessName: 'OffGrid056', marketplaceName: 'OffGrid056 Specialist Marketplace', platformName: 'ProConnect', operatorName: '056', tagline: 'Practical expertise for a more resilient home, business and community.', logoText: 'OffGrid056' },
  branding: { primary: '#2f6b45', primaryDark: '#1f4d32', accent: '#d29b3a', surface: '#f4f1e8' },
  locale: {
    countryCode: 'NZ', countryName: 'New Zealand', locale: 'en-NZ', currency: 'NZD', currencySymbol: '$',
    regions: ['Northland', 'Auckland', 'Waikato', 'Bay of Plenty', 'Gisborne', 'Hawke’s Bay', 'Taranaki', 'Manawatū-Whanganui', 'Wellington', 'Tasman', 'Nelson', 'Marlborough', 'West Coast', 'Canterbury', 'Otago', 'Southland'],
  },
  categories: [
    { slug: 'water-storage-rainwater-plumbing', name: 'Water Storage, Rainwater & Plumbing', description: 'Water storage, rain harvesting, filtration and qualified plumbing support.', icon: 'droplet' },
    { slug: 'solar-battery-critical-power', name: 'Solar, Battery & Critical Power', description: 'Solar, batteries, backup generation and critical-power planning.', icon: 'bolt' },
    { slug: 'food-growing-greenhouses-gardens', name: 'Food Growing, Greenhouses & Gardens', description: 'Productive gardens, protected growing and household food systems.', icon: 'home' },
    { slug: 'shelter-emergency-building', name: 'Shelter, Emergency Accommodation & Building', description: 'Resilient shelter, emergency accommodation and building services.', icon: 'hammer' },
    { slug: 'air-quality-ventilation-safety', name: 'Air Quality, Ventilation & Safety', description: 'Indoor air quality, ventilation assessment and safety planning.', icon: 'shield' },
    { slug: 'resilience-emergency-preparedness', name: 'Resilience Planning & Emergency Preparedness', description: 'Household and business continuity, readiness plans and practical exercises.', icon: 'target' },
    { slug: 'community-preparedness-training', name: 'Community Preparedness & Training', description: 'Neighbourhood coordination, workshops and community response capability.', icon: 'users' },
  ],
  membershipPlans: [
    { slug: 'starter', name: 'Starter', description: 'A focused profile for independent specialists.', monthlyFeeCents: 4900, commissionBps: 1200, maxListings: 1, features: ['Specialist directory profile', 'Service requests', 'Rate management', 'Messaging'], sortOrder: 1 },
    { slug: 'professional', name: 'Professional', description: 'For established specialists handling regular referrals.', monthlyFeeCents: 9900, commissionBps: 800, maxListings: 2, features: ['Everything in Starter', 'Unlimited requests', 'Credential review', 'Reviews'], sortOrder: 2 },
    { slug: 'premier', name: 'Premier', description: 'For practices coordinating wider resilience projects.', monthlyFeeCents: 19900, commissionBps: 500, maxListings: 5, features: ['Everything in Professional', 'Featured placement', 'Project referrals'], sortOrder: 3 },
  ],
  booking: { serviceTypes: ['consultation', 'onsite'], consultation: { enabled: true, provider: 'tidycal', status: 'planned', durationMinutes: [30, 60, 90], videoProvider: 'zoom' }, onsite: { enabled: true, coordinator: 'SimplyServices' } },
  integrations: { offgrid056Os: { mode: 'mock', privateRecordTransfer: false }, tidycal: { mode: 'planned', verified: false }, zoom: { mode: 'planned', verified: false }, payments: { mode: 'test-only', liveEnabled: false } },
  prototype: { enabled: true, notice: 'OffGrid056 prototype. Demo profiles and transactions are test data, not live providers or charges.' },
  demoAccounts: {
    admin: { email: 'admin@proconnect.test', password: 'admin1234', name: 'Alex Morgan' },
    client: { email: 'client@proconnect.test', password: 'password123', name: 'Jordan Avery' },
    professional: { email: 'resilience.demo@offgrid056.test', password: 'password123', label: 'Resilience Planning Demo' },
  },
  marketing: { searchExamples: ['Rainwater', 'Battery backup', 'Resilience plan'], searchPlaceholder: 'e.g. rainwater, solar, preparedness' },
};

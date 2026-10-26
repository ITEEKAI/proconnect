import type { MarketplaceEdition } from '../types.ts';

export const hplbizEdition: MarketplaceEdition = {
  edition: 'hplbiz',
  identity: { businessName: 'HPLBIZ', marketplaceName: 'HPLBIZ Adviser Marketplace', platformName: 'ProConnect', operatorName: '056', tagline: 'Practical advisers for stronger New Zealand businesses.', logoText: 'HPLBIZ' },
  branding: { primary: '#173b57', primaryDark: '#0d293e', accent: '#d9a441', surface: '#f3f6f8' },
  locale: {
    countryCode: 'NZ', countryName: 'New Zealand', locale: 'en-NZ', currency: 'NZD', currencySymbol: '$',
    regions: ['Northland', 'Auckland', 'Waikato', 'Bay of Plenty', 'Gisborne', 'Hawke’s Bay', 'Taranaki', 'Manawatū-Whanganui', 'Wellington', 'Tasman', 'Nelson', 'Marlborough', 'West Coast', 'Canterbury', 'Otago', 'Southland'],
  },
  categories: [
    { slug: 'business-strategy-planning', name: 'Business Strategy & Planning', description: 'Strategy, business plans, governance and growth roadmaps.', icon: 'target' },
    { slug: 'finance-funding-readiness', name: 'Finance & Funding Readiness', description: 'Cash flow, management reporting, funding preparation and financial controls.', icon: 'chart' },
    { slug: 'sales-marketing-growth', name: 'Sales & Marketing Growth', description: 'Positioning, lead generation, sales systems and customer growth.', icon: 'users' },
    { slug: 'operations-process-improvement', name: 'Operations & Process Improvement', description: 'Workflow design, capacity, quality and operating-system improvement.', icon: 'layers' },
    { slug: 'people-leadership', name: 'People & Leadership', description: 'Leadership, team systems, performance and capability development.', icon: 'briefcase' },
    { slug: 'technology-ai-enablement', name: 'Technology & AI Enablement', description: 'Practical systems, automation, AI adoption and digital capability.', icon: 'bolt' },
    { slug: 'compliance-risk', name: 'Compliance & Risk', description: 'Business risk, policies, continuity and compliance readiness.', icon: 'shield' },
  ],
  membershipPlans: [
    { slug: 'starter', name: 'Adviser Starter', description: 'For independent advisers establishing a marketplace presence.', monthlyFeeCents: 5900, commissionBps: 1000, maxListings: 1, features: ['Adviser profile', 'Consultation requests', 'Rate management', 'Messaging'], sortOrder: 1 },
    { slug: 'professional', name: 'Adviser Professional', description: 'For established advisers managing regular client engagements.', monthlyFeeCents: 11900, commissionBps: 700, maxListings: 2, features: ['Everything in Starter', 'Unlimited requests', 'Credential review', 'Reviews'], sortOrder: 2 },
    { slug: 'premier', name: 'Advisory Practice', description: 'For teams coordinating multi-discipline business projects.', monthlyFeeCents: 22900, commissionBps: 450, maxListings: 5, features: ['Everything in Professional', 'Featured placement', 'Project referrals'], sortOrder: 3 },
  ],
  booking: { serviceTypes: ['consultation', 'onsite'], consultation: { enabled: true, provider: 'tidycal', status: 'planned', durationMinutes: [30, 60, 90], videoProvider: 'zoom' }, onsite: { enabled: true, coordinator: 'HPLBIZ' } },
  integrations: { offgrid056Os: { mode: 'mock', privateRecordTransfer: false }, tidycal: { mode: 'planned', verified: false }, zoom: { mode: 'planned', verified: false }, payments: { mode: 'test-only', liveEnabled: false } },
  prototype: { enabled: true, notice: 'HPLBIZ cloning proof. Demo advisers and transactions are test data; no live services or payments.' },
  demoAccounts: {
    admin: { email: 'admin@hplbiz.test', password: 'hpl-admin-demo', name: 'HPLBIZ Demo Admin' },
    client: { email: 'client@hplbiz.test', password: 'hpl-client-demo', name: 'HPLBIZ Demo Client' },
    professional: { email: 'strategy.demo@hplbiz.test', password: 'hpl-pro-demo', label: 'HPL Strategy Adviser Demo' },
  },
  marketing: { searchExamples: ['Growth strategy', 'Cash flow', 'AI automation'], searchPlaceholder: 'e.g. strategy, sales, cash flow, AI' },
};

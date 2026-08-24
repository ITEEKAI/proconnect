import { get, getDb, run, transaction } from './database.ts';
import { hashPassword } from '../auth/password.ts';
import { seedDefaultAvailability } from '../domain/availability.ts';
import { addMonths, bookingReference, slugify } from '../lib/format.ts';

interface CategorySeed {
  slug: string;
  name: string;
  description: string;
  icon: string;
}

const CATEGORIES: CategorySeed[] = [
  {
    slug: 'lawyers',
    name: 'Lawyers',
    description: 'Family, property, employment, immigration and commercial law.',
    icon: 'scale',
  },
  {
    slug: 'accountants',
    name: 'Accountants',
    description: 'Tax returns, bookkeeping, payroll and company accounts.',
    icon: 'calculator',
  },
  {
    slug: 'real-estate-agents',
    name: 'Real Estate Agents',
    description: 'Valuations, sales, lettings and property management.',
    icon: 'home',
  },
  {
    slug: 'electricians',
    name: 'Electricians',
    description: 'Rewiring, fault finding, EV chargers and safety certificates.',
    icon: 'bolt',
  },
  {
    slug: 'plumbers',
    name: 'Plumbers & Heating',
    description: 'Emergency leaks, boilers, bathrooms and central heating.',
    icon: 'droplet',
  },
  {
    slug: 'builders',
    name: 'Builders & Renovators',
    description: 'Extensions, loft conversions, kitchens and full refurbishments.',
    icon: 'hammer',
  },
  {
    slug: 'business-coaches',
    name: 'Business & Career Coaches',
    description: 'Leadership, career change, executive and performance coaching.',
    icon: 'target',
  },
  {
    slug: 'financial-advisers',
    name: 'Financial Advisers',
    description: 'Mortgages, pensions, investments and protection planning.',
    icon: 'chart',
  },
  {
    slug: 'architects',
    name: 'Architects & Designers',
    description: 'Planning drawings, building regulations and interior design.',
    icon: 'ruler',
  },
  {
    slug: 'it-consultants',
    name: 'IT & Cyber Consultants',
    description: 'Cloud migration, security audits and IT support retainers.',
    icon: 'shield',
  },
];

interface PlanSeed {
  slug: string;
  name: string;
  description: string;
  monthlyFeeCents: number;
  commissionBps: number;
  maxListings: number;
  features: string[];
  sortOrder: number;
}

const PLANS: PlanSeed[] = [
  {
    slug: 'starter',
    name: 'Starter',
    description: 'Get listed and start taking enquiries.',
    monthlyFeeCents: 2900,
    commissionBps: 1200,
    maxListings: 1,
    features: ['Directory listing', 'Up to 10 enquiries a month', 'Hourly rate control', 'Email support'],
    sortOrder: 1,
  },
  {
    slug: 'professional',
    name: 'Professional',
    description: 'For established practices who want steady lead flow.',
    monthlyFeeCents: 7900,
    commissionBps: 800,
    maxListings: 2,
    features: [
      'Everything in Starter',
      'Unlimited enquiries',
      'Higher search placement',
      'Verified badge',
      'Client review requests',
    ],
    sortOrder: 2,
  },
  {
    slug: 'premier',
    name: 'Premier',
    description: 'Featured placement and the lowest commission.',
    monthlyFeeCents: 19900,
    commissionBps: 500,
    maxListings: 5,
    features: [
      'Everything in Professional',
      'Featured on category pages',
      'Priority enquiry routing',
      'Dedicated account manager',
    ],
    sortOrder: 3,
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    description: 'Multi-branch firms with negotiated terms.',
    monthlyFeeCents: 49900,
    commissionBps: 300,
    maxListings: 25,
    features: [
      'Everything in Premier',
      'Multiple offices and team profiles',
      'Custom contract and invoicing',
      'API access',
    ],
    sortOrder: 4,
  },
];

interface ProSeed {
  email: string;
  fullName: string;
  displayName?: string;
  businessName?: string;
  category: string;
  plan: string;
  headline: string;
  bio: string;
  city: string;
  region: string;
  country: string;
  years: number;
  hourly: number;
  callout?: number;
  minimumHours?: number;
  freeConsultation?: boolean;
  specialties: string[];
  languages?: string[];
  credentials?: Array<{ label: string; issuer: string; year: number | null }>;
  serviceAreas?: string[];
  verification?: 'pending' | 'verified' | 'rejected';
  published?: boolean;
  feeOverride?: number;
  subscription?: 'trialing' | 'active' | 'past_due' | 'cancelled';
  responseHours?: number;
}

const PROFESSIONALS: ProSeed[] = [
  {
    email: 'amelia.hartley@example.com',
    fullName: 'Amelia Hartley',
    businessName: 'Hartley Family Law',
    category: 'lawyers',
    plan: 'premier',
    headline: 'Family and divorce solicitor with 18 years in the High Court',
    bio: 'I help people through separation, child arrangements and financial settlements with as little conflict as possible. Most of my clients come to me after a first consultation elsewhere left them more confused than when they started — my job is to explain your options in plain English and give you a realistic plan.',
    city: 'Manchester',
    region: 'Greater Manchester',
    country: 'United Kingdom',
    years: 18,
    hourly: 285,
    minimumHours: 1,
    freeConsultation: true,
    specialties: ['Divorce', 'Child arrangements', 'Financial settlements', 'Prenuptial agreements'],
    credentials: [
      { label: 'Solicitor of England & Wales', issuer: 'SRA', year: 2007 },
      { label: 'Resolution Accredited Specialist', issuer: 'Resolution', year: 2013 },
    ],
    serviceAreas: ['Manchester', 'Salford', 'Stockport', 'Remote'],
    responseHours: 2,
  },
  {
    email: 'daniel.okafor@example.com',
    fullName: 'Daniel Okafor',
    businessName: 'Okafor Commercial',
    category: 'lawyers',
    plan: 'professional',
    headline: 'Commercial contracts and startup counsel',
    bio: 'Former in-house counsel at two SaaS scale-ups. I draft and negotiate the agreements small companies actually need: customer terms, SaaS contracts, shareholder agreements and employment packs. Fixed-fee packages available alongside hourly work.',
    city: 'London',
    region: 'Greater London',
    country: 'United Kingdom',
    years: 11,
    hourly: 240,
    specialties: ['Commercial contracts', 'SaaS agreements', 'Shareholder agreements', 'GDPR'],
    credentials: [{ label: 'Solicitor of England & Wales', issuer: 'SRA', year: 2014 }],
    serviceAreas: ['London', 'Remote'],
    responseHours: 4,
  },
  {
    email: 'priya.raman@example.com',
    fullName: 'Priya Raman',
    businessName: 'Raman & Co Chartered Accountants',
    category: 'accountants',
    plan: 'premier',
    headline: 'Chartered accountant for owner-managed businesses',
    bio: 'I look after around 60 owner-managed companies, from first-year contractors to £4m turnover agencies. Year-end accounts, corporation tax, VAT and the quarterly conversations that stop nasty surprises in January.',
    city: 'Birmingham',
    region: 'West Midlands',
    country: 'United Kingdom',
    years: 14,
    hourly: 145,
    freeConsultation: true,
    specialties: ['Company accounts', 'Corporation tax', 'VAT', 'Self assessment', 'Payroll'],
    credentials: [
      { label: 'ACA Chartered Accountant', issuer: 'ICAEW', year: 2011 },
      { label: 'Xero Certified Advisor', issuer: 'Xero', year: 2018 },
    ],
    serviceAreas: ['Birmingham', 'Solihull', 'Remote'],
    responseHours: 3,
  },
  {
    email: 'tom.beckett@example.com',
    fullName: 'Tom Beckett',
    category: 'accountants',
    plan: 'starter',
    headline: 'Tax returns and bookkeeping for sole traders and landlords',
    bio: 'Straightforward, affordable accounting for people who would rather be doing their actual job. I handle self assessment, rental income, CIS returns and Making Tax Digital filings.',
    city: 'Leeds',
    region: 'West Yorkshire',
    country: 'United Kingdom',
    years: 6,
    hourly: 75,
    specialties: ['Self assessment', 'Landlord accounts', 'CIS returns', 'Bookkeeping'],
    credentials: [{ label: 'AAT Licensed Accountant', issuer: 'AAT', year: 2019 }],
    serviceAreas: ['Leeds', 'Bradford', 'Remote'],
    responseHours: 12,
  },
  {
    email: 'sofia.marchetti@example.com',
    fullName: 'Sofia Marchetti',
    businessName: 'Marchetti Residential',
    category: 'real-estate-agents',
    plan: 'professional',
    headline: 'Independent estate agent — valuations, sales and lettings',
    bio: 'Twelve years selling homes in the same three postcodes, which means I can tell you what a street actually achieves rather than what a portal estimate says. I also act as a buying agent for people relocating.',
    city: 'Bristol',
    region: 'Somerset',
    country: 'United Kingdom',
    years: 12,
    hourly: 120,
    freeConsultation: true,
    specialties: ['Valuations', 'Residential sales', 'Lettings', 'Buying agent'],
    credentials: [{ label: 'MNAEA', issuer: 'Propertymark', year: 2016 }],
    serviceAreas: ['Bristol', 'Bath', 'Clifton'],
    responseHours: 2,
  },
  {
    email: 'james.whitfield@example.com',
    fullName: 'James Whitfield',
    businessName: 'Whitfield Electrical',
    category: 'electricians',
    plan: 'professional',
    headline: 'NICEIC approved electrician — rewires, EICRs and EV chargers',
    bio: 'Domestic and light commercial electrical work across the city. Fully insured, NICEIC approved, and everything is certified and notified to building control where required. Emergency call-outs taken until 9pm.',
    city: 'Manchester',
    region: 'Greater Manchester',
    country: 'United Kingdom',
    years: 16,
    hourly: 68,
    callout: 45,
    minimumHours: 1,
    specialties: ['Full rewires', 'EICR certificates', 'EV charger installation', 'Fuse boards', 'Fault finding'],
    credentials: [
      { label: 'NICEIC Approved Contractor', issuer: 'NICEIC', year: 2012 },
      { label: '18th Edition Wiring Regulations', issuer: 'City & Guilds', year: 2022 },
    ],
    serviceAreas: ['Manchester', 'Trafford', 'Bolton', 'Stockport'],
    responseHours: 1,
  },
  {
    email: 'kwame.mensah@example.com',
    fullName: 'Kwame Mensah',
    businessName: 'Mensah Plumbing & Heating',
    category: 'plumbers',
    plan: 'professional',
    headline: 'Gas Safe plumber — boilers, bathrooms and emergency leaks',
    bio: 'Gas Safe registered for 15 years. Boiler servicing and replacement, full bathroom installs, and 24-hour emergency cover for burst pipes and leaks. I quote before I start and I clear up after myself.',
    city: 'London',
    region: 'Greater London',
    country: 'United Kingdom',
    years: 15,
    hourly: 85,
    callout: 60,
    specialties: ['Boiler installation', 'Boiler servicing', 'Bathroom fitting', 'Emergency leaks', 'Underfloor heating'],
    credentials: [{ label: 'Gas Safe Registered', issuer: 'Gas Safe Register', year: 2010 }],
    serviceAreas: ['Camden', 'Islington', 'Hackney', 'Westminster'],
    responseHours: 1,
  },
  {
    email: 'grace.sullivan@example.com',
    fullName: 'Grace Sullivan',
    businessName: 'Sullivan Build',
    category: 'builders',
    plan: 'premier',
    headline: 'Extensions and loft conversions, managed end to end',
    bio: 'We take on around eight projects a year so every job gets proper attention. Single and double-storey extensions, loft conversions and full house refurbishments, including drawings, building control and the trades.',
    city: 'Edinburgh',
    region: 'Midlothian',
    country: 'United Kingdom',
    years: 21,
    hourly: 95,
    minimumHours: 2,
    specialties: ['Extensions', 'Loft conversions', 'Structural work', 'Full refurbishment'],
    credentials: [{ label: 'FMB Master Builder', issuer: 'Federation of Master Builders', year: 2009 }],
    serviceAreas: ['Edinburgh', 'Leith', 'Musselburgh'],
    responseHours: 6,
  },
  {
    email: 'marcus.lee@example.com',
    fullName: 'Marcus Lee',
    category: 'business-coaches',
    plan: 'professional',
    headline: 'Executive coach for first-time founders and new directors',
    bio: 'I coach people who have just been handed more responsibility than they have done before. Sessions are 90 minutes, fortnightly, and we work on the specific decisions in front of you rather than a generic curriculum.',
    city: 'Remote',
    region: '',
    country: 'United Kingdom',
    years: 9,
    hourly: 190,
    freeConsultation: true,
    specialties: ['Executive coaching', 'Founder coaching', 'Leadership transitions', 'Difficult conversations'],
    languages: ['English', 'Mandarin'],
    credentials: [{ label: 'ICF Professional Certified Coach', issuer: 'ICF', year: 2018 }],
    serviceAreas: ['Remote', 'London'],
    responseHours: 8,
  },
  {
    email: 'hannah.novak@example.com',
    fullName: 'Hannah Novak',
    category: 'business-coaches',
    plan: 'starter',
    headline: 'Career change coach — from stuck to a plan in six sessions',
    bio: 'Ex-recruiter turned career coach. I work with people in their thirties and forties who know their current role is not it, but have no idea what is. Practical, structured, and honest about the trade-offs.',
    city: 'Glasgow',
    region: 'Lanarkshire',
    country: 'United Kingdom',
    years: 5,
    hourly: 90,
    freeConsultation: true,
    specialties: ['Career change', 'Interview preparation', 'CV review', 'Salary negotiation'],
    serviceAreas: ['Glasgow', 'Remote'],
    responseHours: 24,
  },
  {
    email: 'oliver.grant@example.com',
    fullName: 'Oliver Grant',
    businessName: 'Grant Wealth Planning',
    category: 'financial-advisers',
    plan: 'premier',
    headline: 'Independent financial adviser — pensions, mortgages and protection',
    bio: 'Whole-of-market independent advice. Most of my work is pension consolidation and retirement planning for people within ten years of stopping work, plus mortgages for second-time buyers.',
    city: 'London',
    region: 'Greater London',
    country: 'United Kingdom',
    years: 17,
    hourly: 210,
    freeConsultation: true,
    specialties: ['Pension consolidation', 'Retirement planning', 'Mortgages', 'Life and income protection'],
    credentials: [{ label: 'Chartered Financial Planner', issuer: 'CII', year: 2015 }],
    serviceAreas: ['London', 'Remote'],
    responseHours: 4,
  },
  {
    email: 'aisha.rahman@example.com',
    fullName: 'Aisha Rahman',
    businessName: 'Rahman Studio',
    category: 'architects',
    plan: 'professional',
    headline: 'RIBA architect for householder extensions and planning applications',
    bio: 'I produce the drawings and handle the planning application, then stay involved through building regulations and tender. Particularly experienced with conservation areas and tricky planning histories.',
    city: 'Bristol',
    region: 'Somerset',
    country: 'United Kingdom',
    years: 13,
    hourly: 130,
    specialties: ['Planning applications', 'Householder extensions', 'Conservation areas', 'Building regulations'],
    credentials: [{ label: 'RIBA Chartered Architect', issuer: 'RIBA', year: 2014 }],
    serviceAreas: ['Bristol', 'Bath', 'Somerset'],
    responseHours: 12,
  },
  {
    email: 'lucas.silva@example.com',
    fullName: 'Lucas Silva',
    businessName: 'Northgate Cyber',
    category: 'it-consultants',
    plan: 'enterprise',
    headline: 'Cyber security consultant — Cyber Essentials Plus and cloud audits',
    bio: 'I get small and mid-size companies through Cyber Essentials and Cyber Essentials Plus, then keep them there. Also Microsoft 365 hardening, penetration test remediation and incident response retainers.',
    city: 'Leeds',
    region: 'West Yorkshire',
    country: 'United Kingdom',
    years: 12,
    hourly: 175,
    specialties: ['Cyber Essentials Plus', 'Microsoft 365 hardening', 'Security audits', 'Incident response'],
    languages: ['English', 'Portuguese'],
    credentials: [
      { label: 'CISSP', issuer: 'ISC2', year: 2017 },
      { label: 'Cyber Essentials Assessor', issuer: 'IASME', year: 2021 },
    ],
    serviceAreas: ['Leeds', 'Manchester', 'Remote'],
    feeOverride: 39900,
    responseHours: 6,
  },
  {
    email: 'nina.kowalski@example.com',
    fullName: 'Nina Kowalski',
    businessName: 'Kowalski Interiors',
    category: 'architects',
    plan: 'starter',
    headline: 'Interior designer for kitchens, bathrooms and whole-home schemes',
    bio: 'Design-led but practical. I work to your actual budget, produce a scheme you can hand to a builder, and can project manage the fit-out if you would rather not.',
    city: 'Manchester',
    region: 'Greater Manchester',
    country: 'United Kingdom',
    years: 8,
    hourly: 85,
    specialties: ['Kitchen design', 'Bathroom design', 'Colour schemes', 'Space planning'],
    serviceAreas: ['Manchester', 'Cheshire'],
    responseHours: 24,
  },
  {
    email: 'peter.donnelly@example.com',
    fullName: 'Peter Donnelly',
    businessName: 'Donnelly Roofing',
    category: 'builders',
    plan: 'starter',
    headline: 'Roofer — flat roofs, tiling and emergency repairs',
    bio: 'Third-generation roofer. Pitched and flat roofs, chimney work, guttering and storm damage repairs. Free inspections with photographs so you can see what I am seeing.',
    city: 'Liverpool',
    region: 'Merseyside',
    country: 'United Kingdom',
    years: 24,
    hourly: 60,
    callout: 40,
    specialties: ['Flat roofs', 'Roof tiling', 'Chimney repairs', 'Guttering', 'Storm damage'],
    verification: 'pending',
    published: false,
    subscription: 'trialing',
    serviceAreas: ['Liverpool', 'Wirral'],
    responseHours: 4,
  },
  {
    email: 'rachel.adeyemi@example.com',
    fullName: 'Rachel Adeyemi',
    category: 'real-estate-agents',
    plan: 'starter',
    headline: 'Lettings specialist and property manager',
    bio: 'I manage around 40 rental properties for private landlords: tenant find, referencing, inspections, compliance and rent collection. Awaiting my final Propertymark paperwork.',
    city: 'Nottingham',
    region: 'Nottinghamshire',
    country: 'United Kingdom',
    years: 7,
    hourly: 65,
    specialties: ['Tenant find', 'Property management', 'Compliance', 'Rent reviews'],
    verification: 'pending',
    published: false,
    subscription: 'trialing',
    serviceAreas: ['Nottingham', 'Derby'],
    responseHours: 12,
  },
];

interface ClientSeed {
  email: string;
  fullName: string;
  phone?: string;
}

const CLIENTS: ClientSeed[] = [
  { email: 'client@proconnect.test', fullName: 'Jordan Avery', phone: '+44 7700 900123' },
  { email: 'megan.foster@example.com', fullName: 'Megan Foster' },
  { email: 'ravi.patel@example.com', fullName: 'Ravi Patel' },
  { email: 'chloe.dubois@example.com', fullName: 'Chloe Dubois' },
];

interface BookingSeed {
  clientEmail: string;
  proEmail: string;
  subject: string;
  details: string;
  daysFromNow: number;
  hours: number;
  status: 'requested' | 'accepted' | 'completed' | 'declined';
  payment?: 'unpaid' | 'paid' | 'waived';
  review?: { rating: number; comment: string };
}

const BOOKINGS: BookingSeed[] = [
  {
    clientEmail: 'client@proconnect.test',
    proEmail: 'james.whitfield@example.com',
    subject: 'EV charger installation on the driveway',
    details: 'Two-bed terrace, consumer unit is about six years old. Need a 7kW charger fitted on the side wall.',
    daysFromNow: 4,
    hours: 4,
    status: 'requested',
  },
  {
    clientEmail: 'client@proconnect.test',
    proEmail: 'priya.raman@example.com',
    subject: 'First year company accounts and corporation tax',
    details: 'Limited company incorporated last March, roughly 90 invoices to reconcile in Xero.',
    daysFromNow: 9,
    hours: 6,
    status: 'accepted',
  },
  {
    clientEmail: 'client@proconnect.test',
    proEmail: 'kwame.mensah@example.com',
    subject: 'Kitchen tap replacement',
    details: 'Mixer tap dripping; isolation valves are under the sink.',
    daysFromNow: -3,
    hours: 2,
    status: 'completed',
    payment: 'unpaid',
  },
  {
    clientEmail: 'megan.foster@example.com',
    proEmail: 'amelia.hartley@example.com',
    subject: 'Initial advice on child arrangements',
    details: 'Separated in January, need to understand options before mediation.',
    daysFromNow: -14,
    hours: 2,
    status: 'completed',
    review: {
      rating: 5,
      comment:
        'Amelia was calm, clear and did not oversell what she could do. I left the first meeting knowing exactly what happens next, which nobody else had managed.',
    },
  },
  {
    clientEmail: 'ravi.patel@example.com',
    proEmail: 'kwame.mensah@example.com',
    subject: 'Boiler replacement quote and install',
    details: 'Old combi boiler keeps losing pressure. Happy to replace rather than keep repairing.',
    daysFromNow: -30,
    hours: 8,
    status: 'completed',
    review: {
      rating: 5,
      comment: 'Turned up when he said, price matched the quote, and the airing cupboard was tidier than he found it.',
    },
  },
  {
    clientEmail: 'chloe.dubois@example.com',
    proEmail: 'marcus.lee@example.com',
    subject: 'Coaching ahead of a step up to director',
    details: 'Promoted in six weeks, want to work through team structure and how I handle two former peers.',
    daysFromNow: -7,
    hours: 3,
    status: 'completed',
    review: {
      rating: 4,
      comment: 'Genuinely useful sessions. Would have liked a bit more written follow-up between calls.',
    },
  },
  {
    clientEmail: 'megan.foster@example.com',
    proEmail: 'sofia.marchetti@example.com',
    subject: 'Valuation before putting the flat on the market',
    details: 'Two-bed flat in Clifton, looking to list in spring.',
    daysFromNow: -21,
    hours: 2,
    status: 'completed',
    review: {
      rating: 5,
      comment: 'Knew the street, knew the buyers, and gave me a number that turned out to be spot on.',
    },
  },
  {
    clientEmail: 'ravi.patel@example.com',
    proEmail: 'lucas.silva@example.com',
    subject: 'Cyber Essentials Plus readiness review',
    details: '35 staff, Microsoft 365, mixed Windows and Mac estate.',
    daysFromNow: 12,
    hours: 10,
    status: 'accepted',
  },
  {
    clientEmail: 'chloe.dubois@example.com',
    proEmail: 'aisha.rahman@example.com',
    subject: 'Rear extension planning drawings',
    details: 'Victorian terrace in a conservation area, single storey rear extension.',
    daysFromNow: 6,
    hours: 12,
    status: 'requested',
  },
];

const ADMIN = {
  email: 'admin@proconnect.test',
  fullName: 'Alex Morgan',
  password: 'admin1234',
};

const DEMO_PASSWORD = 'password123';

function isoDateTime(daysFromNow: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

/** Seeds reference and demo data. Safe to call on every boot: it exits early if data exists. */
export function ensureSeedData(force = false): boolean {
  getDb();
  const existing = get<{ n: number }>('SELECT COUNT(*) AS n FROM users');
  if (!force && (existing?.n ?? 0) > 0) return false;

  transaction(() => {
    for (const [index, cat] of CATEGORIES.entries()) {
      run(
        `INSERT INTO categories (slug, name, description, icon, sort_order)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (slug) DO NOTHING`,
        cat.slug,
        cat.name,
        cat.description,
        cat.icon,
        index + 1,
      );
    }

    for (const plan of PLANS) {
      run(
        `INSERT INTO plans (slug, name, description, monthly_fee_cents, commission_bps, max_listings, features, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (slug) DO NOTHING`,
        plan.slug,
        plan.name,
        plan.description,
        plan.monthlyFeeCents,
        plan.commissionBps,
        plan.maxListings,
        JSON.stringify(plan.features),
        plan.sortOrder,
      );
    }

    run(
      `INSERT INTO users (email, password_hash, role, full_name)
       VALUES (?, ?, 'admin', ?)
       ON CONFLICT (email) DO NOTHING`,
      ADMIN.email,
      hashPassword(ADMIN.password),
      ADMIN.fullName,
    );

    const clientIds = new Map<string, number>();
    for (const client of CLIENTS) {
      const { lastInsertRowid } = run(
        `INSERT INTO users (email, password_hash, role, full_name, phone)
         VALUES (?, ?, 'client', ?, ?)`,
        client.email,
        hashPassword(DEMO_PASSWORD),
        client.fullName,
        client.phone ?? null,
      );
      clientIds.set(client.email, lastInsertRowid);
    }

    const proUserIds = new Map<string, number>();
    const proIds = new Map<string, number>();
    for (const pro of PROFESSIONALS) {
      const category = get<{ id: number }>('SELECT id FROM categories WHERE slug = ?', pro.category);
      const plan = get<{ id: number; monthly_fee_cents: number; name: string }>(
        'SELECT id, monthly_fee_cents, name FROM plans WHERE slug = ?',
        pro.plan,
      );
      if (!category || !plan) continue;

      const { lastInsertRowid: userId } = run(
        `INSERT INTO users (email, password_hash, role, full_name)
         VALUES (?, ?, 'professional', ?)`,
        pro.email,
        hashPassword(DEMO_PASSWORD),
        pro.fullName,
      );

      const displayName = pro.displayName ?? pro.fullName;
      const fee = pro.feeOverride ?? plan.monthly_fee_cents;
      const verification = pro.verification ?? 'verified';
      const published = pro.published ?? verification === 'verified';

      const { lastInsertRowid: proId } = run(
        `INSERT INTO professionals
           (user_id, category_id, plan_id, slug, display_name, headline, bio, business_name,
            city, region, country, years_experience, hourly_rate_cents, minimum_hours,
            callout_fee_cents, free_consultation, monthly_fee_cents, fee_is_overridden,
            subscription_status, next_invoice_date, specialties, languages, credentials,
            service_areas, verification_status, is_published, response_time_hours)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        userId,
        category.id,
        plan.id,
        slugify(`${displayName}-${pro.city}`),
        displayName,
        pro.headline,
        pro.bio,
        pro.businessName ?? null,
        pro.city,
        pro.region,
        pro.country,
        pro.years,
        Math.round(pro.hourly * 100),
        pro.minimumHours ?? 1,
        Math.round((pro.callout ?? 0) * 100),
        pro.freeConsultation ? 1 : 0,
        fee,
        pro.feeOverride ? 1 : 0,
        pro.subscription ?? 'active',
        addMonths(new Date(), 1),
        JSON.stringify(pro.specialties),
        JSON.stringify(pro.languages ?? ['English']),
        JSON.stringify(pro.credentials ?? []),
        JSON.stringify(pro.serviceAreas ?? [pro.city]),
        verification,
        published ? 1 : 0,
        pro.responseHours ?? 24,
      );
      proIds.set(pro.email, proId);
      proUserIds.set(pro.email, userId);

      if (pro.email === 'james.whitfield@example.com') {
        seedDefaultAvailability(proId, [{ weekday: 5, startMinute: 8 * 60, endMinute: 13 * 60 }]);
      } else {
        seedDefaultAvailability(proId);
      }

      run(
        `INSERT INTO rate_changes (professional_id, field, old_value, new_value, changed_by_role, reason)
         VALUES (?, 'hourly_rate_cents', NULL, ?, 'professional', 'Rate set when the profile was created')`,
        proId,
        Math.round(pro.hourly * 100),
      );
      run(
        `INSERT INTO rate_changes (professional_id, field, old_value, new_value, changed_by_role, reason)
         VALUES (?, 'monthly_fee_cents', NULL, ?, 'admin', ?)`,
        proId,
        fee,
        pro.feeOverride ? 'Negotiated enterprise rate' : `${plan.name} plan fee applied`,
      );

      if (published) {
        run(
          `INSERT INTO subscription_invoices (professional_id, period_start, period_end, amount_cents, status)
           VALUES (?, ?, ?, ?, 'paid')`,
          proId,
          addMonths(new Date(), -1),
          addMonths(new Date(), 0),
          fee,
        );
      }
      if (pro.email === 'james.whitfield@example.com') {
        run(
          `INSERT INTO subscription_invoices (professional_id, period_start, period_end, amount_cents, status)
           VALUES (?, ?, ?, ?, 'due')`,
          proId,
          addMonths(new Date(), 0),
          addMonths(new Date(), 1),
          fee,
        );
      }
    }

    for (const booking of BOOKINGS) {
      const clientId = clientIds.get(booking.clientEmail);
      const proId = proIds.get(booking.proEmail);
      if (!clientId || !proId) continue;

      const pro = get<{ hourly_rate_cents: number; callout_fee_cents: number; currency: string }>(
        'SELECT hourly_rate_cents, callout_fee_cents, currency FROM professionals WHERE id = ?',
        proId,
      );
      if (!pro) continue;

      const total =
        booking.status === 'completed'
          ? Math.round(pro.hourly_rate_cents * booking.hours) + pro.callout_fee_cents
          : null;

      const paymentStatus =
        booking.payment ?? (booking.status === 'completed' ? 'paid' : 'unpaid');

      const { lastInsertRowid: bookingId } = run(
        `INSERT INTO bookings
           (reference, client_id, professional_id, status, subject, details, scheduled_for,
            estimated_hours, hourly_rate_cents, callout_fee_cents, currency, logged_hours, total_cents,
            payment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        bookingReference(),
        clientId,
        proId,
        booking.status,
        booking.subject,
        booking.details,
        isoDateTime(booking.daysFromNow),
        booking.hours,
        pro.hourly_rate_cents,
        pro.callout_fee_cents,
        pro.currency,
        booking.status === 'completed' ? booking.hours : null,
        total,
        paymentStatus,
      );

      if (booking.review) {
        run(
          'INSERT INTO reviews (booking_id, professional_id, client_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
          bookingId,
          proId,
          clientId,
          booking.review.rating,
          booking.review.comment,
        );
      }
    }

    // Extra reviews so the directory does not look empty.
    const extraReviews: Array<[string, string, number, string]> = [
      ['james.whitfield@example.com', 'megan.foster@example.com', 5, 'Found a fault two other electricians had missed, and the EICR came back the same week.'],
      ['james.whitfield@example.com', 'chloe.dubois@example.com', 4, 'Good work on the consumer unit. Ran slightly over the estimate but he flagged it before doing the extra.'],
      ['priya.raman@example.com', 'ravi.patel@example.com', 5, 'Saved us more in allowances than her fee, and actually explains things instead of just filing them.'],
      ['kwame.mensah@example.com', 'chloe.dubois@example.com', 5, 'Came out at 11pm for a burst pipe. Cannot fault him.'],
      ['amelia.hartley@example.com', 'client@proconnect.test', 5, 'Excellent throughout a difficult financial settlement.'],
      ['oliver.grant@example.com', 'megan.foster@example.com', 4, 'Consolidated three old pensions and explained the trade-offs honestly.'],
      ['grace.sullivan@example.com', 'ravi.patel@example.com', 5, 'Loft conversion finished a week early and on budget. Rare.'],
      ['sofia.marchetti@example.com', 'client@proconnect.test', 4, 'Straight-talking and quick to respond.'],
      ['marcus.lee@example.com', 'megan.foster@example.com', 5, 'Reframed a problem I had been stuck on for months in a single session.'],
      ['lucas.silva@example.com', 'chloe.dubois@example.com', 5, 'Got us through Cyber Essentials Plus first time.'],
      ['aisha.rahman@example.com', 'client@proconnect.test', 5, 'Planning approved in a conservation area with no objections.'],
      ['tom.beckett@example.com', 'ravi.patel@example.com', 4, 'Quick, cheap and accurate for a landlord self assessment.'],
      ['nina.kowalski@example.com', 'megan.foster@example.com', 4, 'Lovely kitchen scheme that worked within a real budget.'],
    ];
    for (const [proEmail, clientEmail, rating, comment] of extraReviews) {
      const proId = proIds.get(proEmail);
      const clientId = clientIds.get(clientEmail);
      if (!proId || !clientId) continue;
      run(
        'INSERT INTO reviews (professional_id, client_id, rating, comment) VALUES (?, ?, ?, ?)',
        proId,
        clientId,
        rating,
        comment,
      );
    }

    // Materialise rating aggregates.
    run(
      `UPDATE professionals SET
         rating_avg = COALESCE((SELECT ROUND(AVG(rating), 2) FROM reviews r WHERE r.professional_id = professionals.id), 0),
         rating_count = (SELECT COUNT(*) FROM reviews r WHERE r.professional_id = professionals.id)`,
    );

    const adminUser = get<{ id: number }>('SELECT id FROM users WHERE email = ?', ADMIN.email);
    const jordanId = clientIds.get('client@proconnect.test');
    const jamesUserId = proUserIds.get('james.whitfield@example.com');
    const priyaUserId = proUserIds.get('priya.raman@example.com');
    const kwameUserId = proUserIds.get('kwame.mensah@example.com');

    const priyaBooking = get<{ id: number }>(
      `SELECT b.id FROM bookings b
       JOIN professionals p ON p.id = b.professional_id
       WHERE p.user_id = ? AND b.status = 'accepted' LIMIT 1`,
      priyaUserId ?? 0,
    );
    const jamesBooking = get<{ id: number }>(
      `SELECT b.id FROM bookings b
       JOIN professionals p ON p.id = b.professional_id
       WHERE p.user_id = ? AND b.status = 'requested' LIMIT 1`,
      jamesUserId ?? 0,
    );
    const tapBooking = get<{ id: number }>(
      `SELECT b.id FROM bookings b
       JOIN professionals p ON p.id = b.professional_id
       WHERE p.user_id = ? AND b.status = 'completed' AND b.payment_status = 'unpaid' LIMIT 1`,
      kwameUserId ?? 0,
    );

    if (priyaBooking && jordanId && priyaUserId) {
      run(
        'INSERT INTO booking_messages (booking_id, sender_id, body) VALUES (?, ?, ?)',
        priyaBooking.id,
        jordanId,
        'Hi Priya — the Xero invite is with you. Let me know if you need the Companies House auth code as well.',
      );
      run(
        'INSERT INTO booking_messages (booking_id, sender_id, body) VALUES (?, ?, ?)',
        priyaBooking.id,
        priyaUserId,
        'Got it, I am in. I will send a first-pass of the numbers by Friday.',
      );
    }

    if (adminUser) {
      run(
        `INSERT INTO notifications (user_id, type, title, body, href)
         VALUES (?, 'professional.apply', 'Two professionals awaiting verification',
                 'Peter Donnelly and Rachel Adeyemi are in the review queue.', '/admin/professionals')`,
        adminUser.id,
      );
    }
    if (jamesUserId && jamesBooking) {
      run(
        `INSERT INTO notifications (user_id, type, title, body, href)
         VALUES (?, 'booking.requested', 'New booking from Jordan Avery',
                 'EV charger installation on the driveway · 4 hours', ?)`,
        jamesUserId,
        `/dashboard/bookings/${jamesBooking.id}`,
      );
    }
    if (jordanId && priyaBooking) {
      run(
        `INSERT INTO notifications (user_id, type, title, body, href)
         VALUES (?, 'booking.status', 'Your accounts booking is confirmed',
                 'Priya Raman accepted first year company accounts and corporation tax.', ?)`,
        jordanId,
        `/account/bookings/${priyaBooking.id}`,
      );
    }
    if (jordanId && tapBooking) {
      run(
        `INSERT INTO notifications (user_id, type, title, body, href)
         VALUES (?, 'booking.completed', 'Pay PC kitchen tap job',
                 'Kwame Mensah marked the kitchen tap replacement complete.', ?)`,
        jordanId,
        `/account/bookings/${tapBooking.id}`,
      );
    }

    run(
      `INSERT INTO audit_events (actor_email, action, entity_type, entity_id, summary)
       VALUES ('system', 'platform.seed', 'platform', NULL, 'Demo catalogue, plans and professionals created')`,
    );
  });

  return true;
}

const isDirectRun =
  process.argv[1] !== undefined && import.meta.url.endsWith(process.argv[1].split('/').pop() ?? '\u0000');

if (isDirectRun) {
  const seeded = ensureSeedData(process.argv.includes('--force'));
  console.log(seeded ? '[seed] demo data created' : '[seed] database already contains data, nothing to do');
}

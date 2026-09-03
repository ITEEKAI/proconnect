export type Role = 'admin' | 'professional' | 'client';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled';
export type BookingStatus = 'requested' | 'accepted' | 'declined' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'waived';

export interface SessionUser {
  id: number;
  email: string;
  fullName: string;
  role: Role;
}

export interface Credential {
  label: string;
  issuer: string;
  year: number | null;
}

export interface Professional {
  id: number;
  slug: string;
  displayName: string;
  headline: string;
  bio: string;
  businessName: string | null;
  location: { city: string; region: string; country: string };
  yearsExperience: number;
  pricing: {
    hourlyRateCents: number;
    currency: string;
    minimumHours: number;
    calloutFeeCents: number;
    freeConsultation: boolean;
  };
  specialties: string[];
  languages: string[];
  credentials: Credential[];
  serviceAreas: string[];
  avatarUrl: string | null;
  website: string | null;
  category: { id: number; name: string; slug: string };
  verificationStatus: VerificationStatus;
  isPublished: boolean;
  responseTimeHours: number;
  rating: { average: number; count: number };
  createdAt: string;
}

export interface ProfessionalPrivate extends Professional {
  userId: number;
  contact: { email: string; fullName: string; phone: string | null; accountStatus: string };
  billing: {
    planId: number;
    planName: string;
    planSlug: string;
    planMonthlyFeeCents: number;
    monthlyFeeCents: number;
    feeIsOverridden: boolean;
    commissionBps: number;
    subscriptionStatus: SubscriptionStatus;
    nextInvoiceDate: string | null;
  };
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  professionalCount: number;
  fromRateCents: number | null;
}

export interface AdminCategory {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  professionals: number;
}

export interface Plan {
  id: number;
  slug: string;
  name: string;
  description: string;
  monthlyFeeCents: number;
  currency: string;
  commissionBps: number;
  features: string[];
}

export interface AdminPlan extends Plan {
  maxListings: number;
  isActive: boolean;
  sortOrder: number;
  subscribers: number;
}

export interface Review {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  author: string;
}

export interface Booking {
  id: number;
  reference: string;
  status: BookingStatus;
  subject: string;
  details: string;
  scheduledFor: string;
  estimatedHours: number;
  hourlyRateCents: number;
  calloutFeeCents: number;
  currency: string;
  estimatedTotalCents: number;
  loggedHours: number | null;
  totalCents: number | null;
  paymentStatus: PaymentStatus;
  professionalNote: string | null;
  withinHours: boolean;
  createdAt: string;
  client: { id: number; name: string };
  professional: { id: number; slug: string; name: string; category: string };
}

export interface RateChange {
  id: number;
  professional_id: number;
  field: 'hourly_rate_cents' | 'monthly_fee_cents' | 'callout_fee_cents' | 'plan_id';
  old_value: number | null;
  new_value: number;
  changed_by_role: 'admin' | 'professional' | 'system';
  reason: string;
  created_at: string;
  actor_name: string | null;
}

export interface AuditEvent {
  id: number;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  summary: string;
  created_at: string;
}

export interface Invoice {
  id: number;
  period_start: string;
  period_end: string;
  amount_cents: number;
  currency: string;
  status: 'paid' | 'due' | 'void';
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
}

export interface AvailabilitySlot {
  weekday: number;
  weekdayLabel: string;
  start: string;
  end: string;
}

export interface BookingMessage {
  id: number;
  bookingId: number;
  authorId: number;
  authorName: string;
  authorRole: Role;
  body: string;
  createdAt: string;
}

export interface AdminOverview {
  totals: {
    professionals: number;
    publishedProfessionals: number;
    pendingVerification: number;
    clients: number;
    bookings: number;
    completedBookings: number;
    grossBookingValueCents: number;
    monthlyRecurringRevenueCents: number;
  };
  byCategory: Array<{ name: string; slug: string; professionals: number; averageHourlyRateCents: number }>;
  byPlan: Array<{ name: string; professionals: number; monthlyRevenueCents: number }>;
  recentActivity: AuditEvent[];
}

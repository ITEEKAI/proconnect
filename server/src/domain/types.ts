export type Role = 'admin' | 'professional' | 'client';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled';
export type BookingStatus = 'requested' | 'accepted' | 'declined' | 'completed' | 'cancelled';

export interface Credential {
  label: string;
  issuer: string;
  year: number | null;
}

export interface ProfessionalRow {
  id: number;
  user_id: number;
  category_id: number;
  plan_id: number;
  slug: string;
  display_name: string;
  headline: string;
  bio: string;
  business_name: string | null;
  city: string;
  region: string;
  country: string;
  years_experience: number;
  hourly_rate_cents: number;
  currency: string;
  minimum_hours: number;
  callout_fee_cents: number;
  free_consultation: number;
  monthly_fee_cents: number;
  fee_is_overridden: number;
  subscription_status: SubscriptionStatus;
  next_invoice_date: string | null;
  specialties: string;
  languages: string;
  credentials: string;
  service_areas: string;
  avatar_url: string | null;
  website: string | null;
  verification_status: VerificationStatus;
  is_published: number;
  response_time_hours: number;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
  // Joined
  email?: string;
  full_name?: string;
  phone?: string | null;
  user_status?: 'active' | 'suspended';
  category_name?: string;
  category_slug?: string;
  plan_name?: string;
  plan_slug?: string;
  plan_monthly_fee_cents?: number;
  plan_commission_bps?: number;
}

export interface ProfessionalDto {
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

/** Fields only the owning professional or an admin may see. */
export interface ProfessionalPrivateDto extends ProfessionalDto {
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

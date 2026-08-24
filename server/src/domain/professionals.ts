import { all, get, run } from '../db/database.ts';
import { ApiError } from '../lib/errors.ts';
import { parseJsonArray, parseJsonObjects } from '../lib/format.ts';
import type {
  Credential,
  ProfessionalDto,
  ProfessionalPrivateDto,
  ProfessionalRow,
} from './types.ts';

export const PROFESSIONAL_SELECT = `
  SELECT p.*,
         u.email        AS email,
         u.full_name    AS full_name,
         u.phone        AS phone,
         u.status       AS user_status,
         c.name         AS category_name,
         c.slug         AS category_slug,
         pl.name        AS plan_name,
         pl.slug        AS plan_slug,
         pl.monthly_fee_cents AS plan_monthly_fee_cents,
         pl.commission_bps    AS plan_commission_bps
  FROM professionals p
  JOIN users u      ON u.id = p.user_id
  JOIN categories c ON c.id = p.category_id
  JOIN plans pl     ON pl.id = p.plan_id
`;

export function toPublicDto(row: ProfessionalRow): ProfessionalDto {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    headline: row.headline,
    bio: row.bio,
    businessName: row.business_name,
    location: { city: row.city, region: row.region, country: row.country },
    yearsExperience: row.years_experience,
    pricing: {
      hourlyRateCents: row.hourly_rate_cents,
      currency: row.currency,
      minimumHours: row.minimum_hours,
      calloutFeeCents: row.callout_fee_cents,
      freeConsultation: row.free_consultation === 1,
    },
    specialties: parseJsonArray(row.specialties),
    languages: parseJsonArray(row.languages),
    credentials: parseJsonObjects<Credential>(row.credentials),
    serviceAreas: parseJsonArray(row.service_areas),
    avatarUrl: row.avatar_url,
    website: row.website,
    category: {
      id: row.category_id,
      name: row.category_name ?? '',
      slug: row.category_slug ?? '',
    },
    verificationStatus: row.verification_status,
    isPublished: row.is_published === 1,
    responseTimeHours: row.response_time_hours,
    rating: { average: row.rating_avg, count: row.rating_count },
    createdAt: row.created_at,
  };
}

export function toPrivateDto(row: ProfessionalRow): ProfessionalPrivateDto {
  return {
    ...toPublicDto(row),
    userId: row.user_id,
    contact: {
      email: row.email ?? '',
      fullName: row.full_name ?? '',
      phone: row.phone ?? null,
      accountStatus: row.user_status ?? 'active',
    },
    billing: {
      planId: row.plan_id,
      planName: row.plan_name ?? '',
      planSlug: row.plan_slug ?? '',
      planMonthlyFeeCents: row.plan_monthly_fee_cents ?? 0,
      monthlyFeeCents: row.monthly_fee_cents,
      feeIsOverridden: row.fee_is_overridden === 1,
      commissionBps: row.plan_commission_bps ?? 0,
      subscriptionStatus: row.subscription_status,
      nextInvoiceDate: row.next_invoice_date,
    },
  };
}

export function findById(id: number): ProfessionalRow | undefined {
  return get<ProfessionalRow>(`${PROFESSIONAL_SELECT} WHERE p.id = ?`, id);
}

export function findBySlug(slug: string): ProfessionalRow | undefined {
  return get<ProfessionalRow>(`${PROFESSIONAL_SELECT} WHERE p.slug = ?`, slug);
}

export function findByUserId(userId: number): ProfessionalRow | undefined {
  return get<ProfessionalRow>(`${PROFESSIONAL_SELECT} WHERE p.user_id = ?`, userId);
}

export function requireById(id: number): ProfessionalRow {
  const row = findById(id);
  if (!row) throw ApiError.notFound('Professional not found.');
  return row;
}

export function requireOwnProfile(userId: number): ProfessionalRow {
  const row = findByUserId(userId);
  if (!row) throw ApiError.notFound('No professional profile is linked to this account.');
  return row;
}

export function recalculateRating(professionalId: number): void {
  const stats = get<{ avg: number | null; count: number }>(
    'SELECT AVG(rating) AS avg, COUNT(*) AS count FROM reviews WHERE professional_id = ?',
    professionalId,
  );
  run(
    'UPDATE professionals SET rating_avg = ?, rating_count = ?, updated_at = datetime(\'now\') WHERE id = ?',
    Math.round((stats?.avg ?? 0) * 100) / 100,
    stats?.count ?? 0,
    professionalId,
  );
}

export interface RateChangeInput {
  professionalId: number;
  field: 'hourly_rate_cents' | 'monthly_fee_cents' | 'callout_fee_cents' | 'plan_id';
  oldValue: number | null;
  newValue: number;
  changedBy: number | null;
  changedByRole: 'admin' | 'professional' | 'system';
  reason?: string;
}

export function recordRateChange(input: RateChangeInput): void {
  if (input.oldValue === input.newValue) return;
  run(
    `INSERT INTO rate_changes (professional_id, field, old_value, new_value, changed_by, changed_by_role, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    input.professionalId,
    input.field,
    input.oldValue,
    input.newValue,
    input.changedBy,
    input.changedByRole,
    input.reason ?? '',
  );
}

export interface RateChangeRow {
  id: number;
  professional_id: number;
  field: string;
  old_value: number | null;
  new_value: number;
  changed_by_role: string;
  reason: string;
  created_at: string;
  actor_name: string | null;
  professional_name?: string;
}

export function rateHistory(professionalId: number, limit = 25): RateChangeRow[] {
  return all<RateChangeRow>(
    `SELECT rc.*, u.full_name AS actor_name
     FROM rate_changes rc
     LEFT JOIN users u ON u.id = rc.changed_by
     WHERE rc.professional_id = ?
     ORDER BY rc.created_at DESC, rc.id DESC
     LIMIT ?`,
    professionalId,
    limit,
  );
}

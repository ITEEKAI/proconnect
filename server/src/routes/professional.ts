import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth } from '../auth/middleware.ts';
import { all, get, run } from '../db/database.ts';
import { recordAudit } from '../domain/audit.ts';
import { availabilityDto, parseSlotsInput, replaceSlots } from '../domain/availability.ts';
import { removeAvatarFiles, saveAvatar } from '../domain/avatars.ts';
import {
  rateHistory,
  recordRateChange,
  requireOwnProfile,
  toPrivateDto,
} from '../domain/professionals.ts';
import { ApiError } from '../lib/errors.ts';
import { asyncHandler, parseBody } from '../lib/http.ts';

export const professionalRouter = Router();
professionalRouter.use(requireAuth('professional'));

const credentialSchema = z.object({
  label: z.string().trim().min(1).max(120),
  issuer: z.string().trim().max(120).default(''),
  year: z.coerce.number().int().min(1900).max(2100).nullable().default(null),
});

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  headline: z.string().trim().max(160).optional(),
  bio: z.string().trim().max(4000).optional(),
  businessName: z.string().trim().max(160).nullable().optional(),
  city: z.string().trim().max(80).optional(),
  region: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(80).optional(),
  specialties: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  languages: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  credentials: z.array(credentialSchema).max(12).optional(),
  serviceAreas: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  website: z.string().trim().max(200).nullable().optional(),
  avatarUrl: z.string().trim().max(400).nullable().optional(),
  responseTimeHours: z.coerce.number().int().min(1).max(168).optional(),
  isPublished: z.boolean().optional(),
});

/**
 * A professional sets their own hourly rate. Every change is written to
 * `rate_changes` so both the pro and admins can audit pricing over time.
 */
const rateSchema = z.object({
  hourlyRate: z.coerce.number().min(0).max(100000),
  minimumHours: z.coerce.number().min(0.25).max(40).optional(),
  calloutFee: z.coerce.number().min(0).max(100000).optional(),
  freeConsultation: z.boolean().optional(),
  reason: z.string().trim().max(200).optional(),
});

professionalRouter.get(
  '/profile',
  asyncHandler((req, res) => {
    const profile = requireOwnProfile(currentUser(req).id);
    res.json({ professional: toPrivateDto(profile) });
  }),
);

professionalRouter.patch(
  '/profile',
  asyncHandler((req, res) => {
    const user = currentUser(req);
    const profile = requireOwnProfile(user.id);
    const body = parseBody(profileSchema, req.body);

    if (body.isPublished === true && profile.verification_status !== 'verified') {
      throw ApiError.badRequest(
        'Your profile has to be verified by our team before it can go live in the directory.',
      );
    }

    run(
      `UPDATE professionals SET
         display_name        = COALESCE(?, display_name),
         headline            = COALESCE(?, headline),
         bio                 = COALESCE(?, bio),
         business_name       = COALESCE(?, business_name),
         city                = COALESCE(?, city),
         region              = COALESCE(?, region),
         country             = COALESCE(?, country),
         years_experience    = COALESCE(?, years_experience),
         specialties         = COALESCE(?, specialties),
         languages           = COALESCE(?, languages),
         credentials         = COALESCE(?, credentials),
         service_areas       = COALESCE(?, service_areas),
         website             = COALESCE(?, website),
         avatar_url          = COALESCE(?, avatar_url),
         response_time_hours = COALESCE(?, response_time_hours),
         is_published        = COALESCE(?, is_published),
         updated_at          = datetime('now')
       WHERE id = ?`,
      body.displayName ?? null,
      body.headline ?? null,
      body.bio ?? null,
      body.businessName ?? null,
      body.city ?? null,
      body.region ?? null,
      body.country ?? null,
      body.yearsExperience ?? null,
      body.specialties ? JSON.stringify(body.specialties) : null,
      body.languages ? JSON.stringify(body.languages) : null,
      body.credentials ? JSON.stringify(body.credentials) : null,
      body.serviceAreas ? JSON.stringify(body.serviceAreas) : null,
      body.website ?? null,
      body.avatarUrl ?? null,
      body.responseTimeHours ?? null,
      body.isPublished === undefined ? null : body.isPublished ? 1 : 0,
      profile.id,
    );

    res.json({ professional: toPrivateDto(requireOwnProfile(user.id)) });
  }),
);

professionalRouter.get(
  '/availability',
  asyncHandler((req, res) => {
    const profile = requireOwnProfile(currentUser(req).id);
    res.json({ availability: availabilityDto(profile.id) });
  }),
);

professionalRouter.put(
  '/availability',
  asyncHandler((req, res) => {
    const profile = requireOwnProfile(currentUser(req).id);
    const body = parseBody(
      z.object({
        slots: z
          .array(
            z.object({
              weekday: z.coerce.number().int().min(0).max(6),
              start: z.string().trim().min(4).max(8),
              end: z.string().trim().min(4).max(8),
            }),
          )
          .max(7),
      }),
      req.body,
    );
    try {
      replaceSlots(profile.id, parseSlotsInput(body.slots));
    } catch (error) {
      throw ApiError.badRequest(error instanceof Error ? error.message : 'Invalid availability.');
    }
    res.json({ availability: availabilityDto(profile.id) });
  }),
);

professionalRouter.post(
  '/avatar',
  asyncHandler((req, res) => {
    const profile = requireOwnProfile(currentUser(req).id);
    const body = parseBody(
      z.object({
        mimeType: z.string().trim().min(1).max(80),
        imageBase64: z.string().min(8, 'Choose an image to upload.').max(2_500_000),
      }),
      req.body,
    );
    const avatarUrl = saveAvatar(profile.id, body.mimeType, body.imageBase64);
    run("UPDATE professionals SET avatar_url = ?, updated_at = datetime('now') WHERE id = ?", avatarUrl, profile.id);
    res.json({ professional: toPrivateDto(requireOwnProfile(currentUser(req).id)), avatarUrl });
  }),
);

professionalRouter.delete(
  '/avatar',
  asyncHandler((req, res) => {
    const profile = requireOwnProfile(currentUser(req).id);
    removeAvatarFiles(profile.id);
    run("UPDATE professionals SET avatar_url = NULL, updated_at = datetime('now') WHERE id = ?", profile.id);
    res.json({ professional: toPrivateDto(requireOwnProfile(currentUser(req).id)), avatarUrl: null });
  }),
);

professionalRouter.put(
  '/rates',
  asyncHandler((req, res) => {
    const user = currentUser(req);
    const profile = requireOwnProfile(user.id);
    const body = parseBody(rateSchema, req.body);

    const nextHourly = Math.round(body.hourlyRate * 100);
    const nextCallout =
      body.calloutFee === undefined ? profile.callout_fee_cents : Math.round(body.calloutFee * 100);

    run(
      `UPDATE professionals SET
         hourly_rate_cents = ?,
         callout_fee_cents = ?,
         minimum_hours     = COALESCE(?, minimum_hours),
         free_consultation = COALESCE(?, free_consultation),
         updated_at        = datetime('now')
       WHERE id = ?`,
      nextHourly,
      nextCallout,
      body.minimumHours ?? null,
      body.freeConsultation === undefined ? null : body.freeConsultation ? 1 : 0,
      profile.id,
    );

    recordRateChange({
      professionalId: profile.id,
      field: 'hourly_rate_cents',
      oldValue: profile.hourly_rate_cents,
      newValue: nextHourly,
      changedBy: user.id,
      changedByRole: 'professional',
      reason: body.reason ?? 'Updated by the professional',
    });
    recordRateChange({
      professionalId: profile.id,
      field: 'callout_fee_cents',
      oldValue: profile.callout_fee_cents,
      newValue: nextCallout,
      changedBy: user.id,
      changedByRole: 'professional',
      reason: body.reason ?? 'Updated by the professional',
    });

    res.json({
      professional: toPrivateDto(requireOwnProfile(user.id)),
      rateHistory: rateHistory(profile.id),
    });
  }),
);

professionalRouter.get(
  '/rates/history',
  asyncHandler((req, res) => {
    const profile = requireOwnProfile(currentUser(req).id);
    res.json({ rateHistory: rateHistory(profile.id, 50) });
  }),
);

professionalRouter.get(
  '/billing',
  asyncHandler((req, res) => {
    const profile = requireOwnProfile(currentUser(req).id);
    const invoices = all(
      `SELECT id, period_start, period_end, amount_cents, currency, status
       FROM subscription_invoices WHERE professional_id = ?
       ORDER BY period_start DESC LIMIT 24`,
      profile.id,
    );
    const plans = all(
      `SELECT id, slug, name, description, monthly_fee_cents, currency, commission_bps, features
       FROM plans WHERE is_active = 1 ORDER BY sort_order, monthly_fee_cents`,
    );
    res.json({
      billing: toPrivateDto(profile).billing,
      invoices,
      plans: (plans as Array<Record<string, unknown>>).map((p) => ({
        ...p,
        features: JSON.parse((p.features as string) || '[]') as string[],
      })),
    });
  }),
);

professionalRouter.get(
  '/dashboard',
  asyncHandler((req, res) => {
    const profile = requireOwnProfile(currentUser(req).id);

    const counts = get<{
      requested: number;
      accepted: number;
      completed: number;
      earned_cents: number | null;
    }>(
      `SELECT
         SUM(CASE WHEN status = 'requested' THEN 1 ELSE 0 END) AS requested,
         SUM(CASE WHEN status = 'accepted'  THEN 1 ELSE 0 END) AS accepted,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN status = 'completed' THEN total_cents ELSE 0 END) AS earned_cents
       FROM bookings WHERE professional_id = ?`,
      profile.id,
    );

    const upcoming = all(
      `SELECT b.id, b.reference, b.subject, b.status, b.scheduled_for, b.estimated_hours,
              b.hourly_rate_cents, b.currency, u.full_name AS client_name
       FROM bookings b JOIN users u ON u.id = b.client_id
       WHERE b.professional_id = ? AND b.status IN ('requested', 'accepted')
       ORDER BY b.scheduled_for ASC LIMIT 8`,
      profile.id,
    );

    res.json({
      professional: toPrivateDto(profile),
      metrics: {
        pendingRequests: counts?.requested ?? 0,
        acceptedJobs: counts?.accepted ?? 0,
        completedJobs: counts?.completed ?? 0,
        lifetimeEarningsCents: counts?.earned_cents ?? 0,
      },
      upcoming,
      rateHistory: rateHistory(profile.id, 6),
    });
  }),
);

professionalRouter.post(
  '/plan',
  asyncHandler((req, res) => {
    const user = currentUser(req);
    const profile = requireOwnProfile(user.id);
    const body = parseBody(z.object({ planId: z.coerce.number().int().positive() }), req.body);

    const plan = get<{ id: number; name: string; monthly_fee_cents: number }>(
      'SELECT id, name, monthly_fee_cents FROM plans WHERE id = ? AND is_active = 1',
      body.planId,
    );
    if (!plan) throw ApiError.notFound('That membership plan is not available.');

    run(
      `UPDATE professionals
       SET plan_id = ?, monthly_fee_cents = ?, fee_is_overridden = 0, updated_at = datetime('now')
       WHERE id = ?`,
      plan.id,
      plan.monthly_fee_cents,
      profile.id,
    );

    recordRateChange({
      professionalId: profile.id,
      field: 'monthly_fee_cents',
      oldValue: profile.monthly_fee_cents,
      newValue: plan.monthly_fee_cents,
      changedBy: user.id,
      changedByRole: 'professional',
      reason: `Switched to the ${plan.name} plan`,
    });
    recordAudit(user, 'plan.switch', 'professional', profile.id, `Switched to ${plan.name}`);

    res.json({ professional: toPrivateDto(requireOwnProfile(user.id)) });
  }),
);

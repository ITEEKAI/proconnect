import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth } from '../auth/middleware.ts';
import { hashPassword } from '../auth/password.ts';
import { all, get, run, transaction } from '../db/database.ts';
import { listAudit, recordAudit } from '../domain/audit.ts';
import { seedDefaultAvailability } from '../domain/availability.ts';
import { notify } from '../domain/notifications.ts';
import {
  PROFESSIONAL_SELECT,
  rateHistory,
  recordRateChange,
  requireById,
  toPrivateDto,
} from '../domain/professionals.ts';
import type { ProfessionalRow } from '../domain/types.ts';
import { ApiError } from '../lib/errors.ts';
import { addMonths, today, uniqueSlug } from '../lib/format.ts';
import { asyncHandler, parseBody, parseQuery } from '../lib/http.ts';

export const adminRouter = Router();
adminRouter.use(requireAuth('admin'));

const money = (dollars: number): number => Math.round(dollars * 100);

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

adminRouter.get(
  '/overview',
  asyncHandler((_req, res) => {
    const totals = get<{
      professionals: number;
      published: number;
      pending: number;
      clients: number;
      bookings: number;
      completed: number;
      gross_cents: number | null;
      mrr_cents: number | null;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM professionals) AS professionals,
        (SELECT COUNT(*) FROM professionals WHERE is_published = 1) AS published,
        (SELECT COUNT(*) FROM professionals WHERE verification_status = 'pending') AS pending,
        (SELECT COUNT(*) FROM users WHERE role = 'client') AS clients,
        (SELECT COUNT(*) FROM bookings) AS bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'completed') AS completed,
        (SELECT SUM(total_cents) FROM bookings WHERE status = 'completed') AS gross_cents,
        (SELECT SUM(monthly_fee_cents) FROM professionals
          WHERE subscription_status IN ('active', 'past_due')) AS mrr_cents`,
    );

    const byCategory = all<{ name: string; slug: string; count: number; avg_rate: number | null }>(
      `SELECT c.name, c.slug, COUNT(p.id) AS count, AVG(p.hourly_rate_cents) AS avg_rate
       FROM categories c
       LEFT JOIN professionals p ON p.category_id = c.id
       GROUP BY c.id ORDER BY count DESC, c.name`,
    );

    const byPlan = all<{ name: string; count: number; revenue_cents: number | null }>(
      `SELECT pl.name, COUNT(p.id) AS count, SUM(p.monthly_fee_cents) AS revenue_cents
       FROM plans pl LEFT JOIN professionals p ON p.plan_id = pl.id
       GROUP BY pl.id ORDER BY pl.sort_order`,
    );

    res.json({
      totals: {
        professionals: totals?.professionals ?? 0,
        publishedProfessionals: totals?.published ?? 0,
        pendingVerification: totals?.pending ?? 0,
        clients: totals?.clients ?? 0,
        bookings: totals?.bookings ?? 0,
        completedBookings: totals?.completed ?? 0,
        grossBookingValueCents: totals?.gross_cents ?? 0,
        monthlyRecurringRevenueCents: totals?.mrr_cents ?? 0,
      },
      byCategory: byCategory.map((r) => ({
        name: r.name,
        slug: r.slug,
        professionals: r.count,
        averageHourlyRateCents: Math.round(r.avg_rate ?? 0),
      })),
      byPlan: byPlan.map((r) => ({
        name: r.name,
        professionals: r.count,
        monthlyRevenueCents: r.revenue_cents ?? 0,
      })),
      recentActivity: listAudit(8),
    });
  }),
);

// ---------------------------------------------------------------------------
// Professionals
// ---------------------------------------------------------------------------

adminRouter.get(
  '/professionals',
  asyncHandler((req, res) => {
    const q = parseQuery(
      z.object({
        search: z.string().trim().max(120).optional(),
        category: z.string().trim().max(60).optional(),
        verification: z.enum(['pending', 'verified', 'rejected']).optional(),
        subscription: z.enum(['trialing', 'active', 'past_due', 'cancelled']).optional(),
        published: z.enum(['true', 'false']).optional(),
      }),
      req.query,
    );

    const where: string[] = ['1 = 1'];
    const params: unknown[] = [];
    if (q.search) {
      where.push('(p.display_name LIKE ? OR u.email LIKE ? OR p.business_name LIKE ?)');
      const like = `%${q.search}%`;
      params.push(like, like, like);
    }
    if (q.category) {
      where.push('c.slug = ?');
      params.push(q.category);
    }
    if (q.verification) {
      where.push('p.verification_status = ?');
      params.push(q.verification);
    }
    if (q.subscription) {
      where.push('p.subscription_status = ?');
      params.push(q.subscription);
    }
    if (q.published) {
      where.push('p.is_published = ?');
      params.push(q.published === 'true' ? 1 : 0);
    }

    const rows = all<ProfessionalRow>(
      `${PROFESSIONAL_SELECT} WHERE ${where.join(' AND ')} ORDER BY p.created_at DESC, p.id DESC LIMIT 300`,
      ...params,
    );
    res.json({ professionals: rows.map(toPrivateDto) });
  }),
);

adminRouter.get(
  '/professionals/:id',
  asyncHandler((req, res) => {
    const row = requireById(Number(req.params.id));
    const bookings = all(
      `SELECT b.id, b.reference, b.status, b.subject, b.scheduled_for, b.estimated_hours,
              b.hourly_rate_cents, b.total_cents, u.full_name AS client_name
       FROM bookings b JOIN users u ON u.id = b.client_id
       WHERE b.professional_id = ? ORDER BY b.created_at DESC LIMIT 20`,
      row.id,
    );
    const invoices = all(
      `SELECT id, period_start, period_end, amount_cents, currency, status
       FROM subscription_invoices WHERE professional_id = ? ORDER BY period_start DESC LIMIT 12`,
      row.id,
    );
    res.json({
      professional: toPrivateDto(row),
      rateHistory: rateHistory(row.id, 50),
      bookings,
      invoices,
    });
  }),
);

const onboardSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
  fullName: z.string().trim().min(2, 'Enter the expert’s full name.').max(120),
  phone: z.string().trim().max(40).optional(),
  categoryId: z.coerce.number().int().positive('Choose a field of expertise.'),
  planId: z.coerce.number().int().positive('Choose a membership plan.'),
  displayName: z.string().trim().max(120).optional(),
  businessName: z.string().trim().max(160).optional(),
  headline: z.string().trim().max(160).default(''),
  bio: z.string().trim().max(4000).default(''),
  city: z.string().trim().max(80).default(''),
  region: z.string().trim().max(80).default(''),
  country: z.string().trim().max(80).default(''),
  yearsExperience: z.coerce.number().int().min(0).max(80).default(0),
  hourlyRate: z.coerce.number().min(0).max(100000).default(0),
  monthlyFee: z.coerce.number().min(0).max(100000).optional(),
  specialties: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  languages: z.array(z.string().trim().min(1).max(40)).max(12).default(['English']),
  verificationStatus: z.enum(['pending', 'verified', 'rejected']).default('verified'),
  isPublished: z.boolean().default(true),
});

/** Admin-driven onboarding: creates the login and the professional profile together. */
adminRouter.post(
  '/professionals',
  asyncHandler((req, res) => {
    const admin = currentUser(req);
    const body = parseBody(onboardSchema, req.body);

    if (get<{ id: number }>('SELECT id FROM users WHERE email = ?', body.email)) {
      throw ApiError.conflict('An account already exists for that email address.');
    }
    const category = get<{ id: number; name: string }>(
      'SELECT id, name FROM categories WHERE id = ?',
      body.categoryId,
    );
    if (!category) throw ApiError.badRequest('That field of expertise does not exist.');

    const plan = get<{ id: number; name: string; monthly_fee_cents: number }>(
      'SELECT id, name, monthly_fee_cents FROM plans WHERE id = ?',
      body.planId,
    );
    if (!plan) throw ApiError.badRequest('That membership plan does not exist.');

    const displayName = body.displayName?.trim() || body.fullName;
    const feeCents = body.monthlyFee === undefined ? plan.monthly_fee_cents : money(body.monthlyFee);
    const overridden = feeCents !== plan.monthly_fee_cents;

    if (body.isPublished && body.verificationStatus !== 'verified') {
      throw ApiError.badRequest('Only verified professionals can be published to the directory.');
    }

    const professionalId = transaction(() => {
      const { lastInsertRowid: userId } = run(
        `INSERT INTO users (email, password_hash, role, full_name, phone)
         VALUES (?, ?, 'professional', ?, ?)`,
        body.email,
        hashPassword(body.password),
        body.fullName,
        body.phone ?? null,
      );

      const slug = uniqueSlug(
        `${displayName} ${body.city}`.trim(),
        (candidate) => !!get<{ id: number }>('SELECT id FROM professionals WHERE slug = ?', candidate),
      );

      const { lastInsertRowid: proId } = run(
        `INSERT INTO professionals
           (user_id, category_id, plan_id, slug, display_name, headline, bio, business_name,
            city, region, country, years_experience, hourly_rate_cents, monthly_fee_cents,
            fee_is_overridden, subscription_status, next_invoice_date, specialties, languages,
            verification_status, is_published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
        userId,
        category.id,
        plan.id,
        slug,
        displayName,
        body.headline,
        body.bio,
        body.businessName ?? null,
        body.city,
        body.region,
        body.country,
        body.yearsExperience,
        money(body.hourlyRate),
        feeCents,
        overridden ? 1 : 0,
        addMonths(new Date(), 1),
        JSON.stringify(body.specialties),
        JSON.stringify(body.languages),
        body.verificationStatus,
        body.isPublished ? 1 : 0,
      );

      recordRateChange({
        professionalId: proId,
        field: 'hourly_rate_cents',
        oldValue: null,
        newValue: money(body.hourlyRate),
        changedBy: admin.id,
        changedByRole: 'admin',
        reason: 'Initial rate set during onboarding',
      });
      recordRateChange({
        professionalId: proId,
        field: 'monthly_fee_cents',
        oldValue: null,
        newValue: feeCents,
        changedBy: admin.id,
        changedByRole: 'admin',
        reason: overridden
          ? `Custom fee agreed at onboarding (${plan.name} list price differs)`
          : `${plan.name} plan fee applied at onboarding`,
      });
      seedDefaultAvailability(proId);
      return proId;
    });

    recordAudit(
      admin,
      'professional.onboard',
      'professional',
      professionalId,
      `Onboarded ${displayName} (${category.name}) on the ${plan.name} plan`,
    );

    res.status(201).json({ professional: toPrivateDto(requireById(professionalId)) });
  }),
);

adminRouter.patch(
  '/professionals/:id',
  asyncHandler((req, res) => {
    const admin = currentUser(req);
    const existing = requireById(Number(req.params.id));
    const body = parseBody(
      z.object({
        displayName: z.string().trim().min(2).max(120).optional(),
        headline: z.string().trim().max(160).optional(),
        bio: z.string().trim().max(4000).optional(),
        businessName: z.string().trim().max(160).nullable().optional(),
        categoryId: z.coerce.number().int().positive().optional(),
        city: z.string().trim().max(80).optional(),
        region: z.string().trim().max(80).optional(),
        country: z.string().trim().max(80).optional(),
        yearsExperience: z.coerce.number().int().min(0).max(80).optional(),
        specialties: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
        verificationStatus: z.enum(['pending', 'verified', 'rejected']).optional(),
        isPublished: z.boolean().optional(),
        subscriptionStatus: z.enum(['trialing', 'active', 'past_due', 'cancelled']).optional(),
        hourlyRate: z.coerce.number().min(0).max(100000).optional(),
      }),
      req.body,
    );

    const verification = body.verificationStatus ?? existing.verification_status;
    if (body.isPublished === true && verification !== 'verified') {
      throw ApiError.badRequest('Verify this professional before publishing them to the directory.');
    }
    // Un-verifying always removes the listing from the public directory.
    const published =
      verification === 'verified' ? (body.isPublished ?? existing.is_published === 1) : false;

    run(
      `UPDATE professionals SET
         display_name        = COALESCE(?, display_name),
         headline            = COALESCE(?, headline),
         bio                 = COALESCE(?, bio),
         business_name       = COALESCE(?, business_name),
         category_id         = COALESCE(?, category_id),
         city                = COALESCE(?, city),
         region              = COALESCE(?, region),
         country             = COALESCE(?, country),
         years_experience    = COALESCE(?, years_experience),
         specialties         = COALESCE(?, specialties),
         verification_status = ?,
         is_published        = ?,
         subscription_status = COALESCE(?, subscription_status),
         hourly_rate_cents   = COALESCE(?, hourly_rate_cents),
         updated_at          = datetime('now')
       WHERE id = ?`,
      body.displayName ?? null,
      body.headline ?? null,
      body.bio ?? null,
      body.businessName ?? null,
      body.categoryId ?? null,
      body.city ?? null,
      body.region ?? null,
      body.country ?? null,
      body.yearsExperience ?? null,
      body.specialties ? JSON.stringify(body.specialties) : null,
      verification,
      published ? 1 : 0,
      body.subscriptionStatus ?? null,
      body.hourlyRate === undefined ? null : money(body.hourlyRate),
      existing.id,
    );

    if (body.hourlyRate !== undefined) {
      recordRateChange({
        professionalId: existing.id,
        field: 'hourly_rate_cents',
        oldValue: existing.hourly_rate_cents,
        newValue: money(body.hourlyRate),
        changedBy: admin.id,
        changedByRole: 'admin',
        reason: 'Adjusted by an administrator',
      });
    }
    if (body.verificationStatus && body.verificationStatus !== existing.verification_status) {
      recordAudit(
        admin,
        `professional.${body.verificationStatus}`,
        'professional',
        existing.id,
        `${existing.display_name} marked ${body.verificationStatus}`,
      );
      if (body.verificationStatus === 'verified') {
        notify(
          existing.user_id,
          'professional.verified',
          'Your profile has been verified',
          'You can now list in the directory and take bookings.',
          '/dashboard/profile',
        );
      } else if (body.verificationStatus === 'rejected') {
        notify(
          existing.user_id,
          'professional.rejected',
          'Your application was not approved',
          'An administrator reviewed your profile and could not verify it. Sign in to update your details.',
          '/dashboard/profile',
        );
      }
    }

    res.json({ professional: toPrivateDto(requireById(existing.id)) });
  }),
);

/**
 * Change what a professional pays each month. Either move them onto a different
 * plan (fee follows the plan) or set a bespoke negotiated amount.
 */
adminRouter.put(
  '/professionals/:id/fee',
  asyncHandler((req, res) => {
    const admin = currentUser(req);
    const existing = requireById(Number(req.params.id));
    const body = parseBody(
      z.object({
        planId: z.coerce.number().int().positive().optional(),
        monthlyFee: z.coerce.number().min(0).max(100000).optional(),
        useplanPrice: z.boolean().optional(),
        subscriptionStatus: z.enum(['trialing', 'active', 'past_due', 'cancelled']).optional(),
        reason: z.string().trim().max(200).optional(),
      }),
      req.body,
    );

    const planId = body.planId ?? existing.plan_id;
    const plan = get<{ id: number; name: string; monthly_fee_cents: number }>(
      'SELECT id, name, monthly_fee_cents FROM plans WHERE id = ?',
      planId,
    );
    if (!plan) throw ApiError.badRequest('That membership plan does not exist.');

    const useplanPrice = body.useplanPrice === true || body.monthlyFee === undefined;
    const nextFee = useplanPrice ? plan.monthly_fee_cents : money(body.monthlyFee as number);
    const overridden = nextFee !== plan.monthly_fee_cents;

    run(
      `UPDATE professionals
       SET plan_id = ?, monthly_fee_cents = ?, fee_is_overridden = ?,
           subscription_status = COALESCE(?, subscription_status), updated_at = datetime('now')
       WHERE id = ?`,
      plan.id,
      nextFee,
      overridden ? 1 : 0,
      body.subscriptionStatus ?? null,
      existing.id,
    );

    if (plan.id !== existing.plan_id) {
      recordRateChange({
        professionalId: existing.id,
        field: 'plan_id',
        oldValue: existing.plan_id,
        newValue: plan.id,
        changedBy: admin.id,
        changedByRole: 'admin',
        reason: body.reason ?? `Moved to the ${plan.name} plan`,
      });
    }
    recordRateChange({
      professionalId: existing.id,
      field: 'monthly_fee_cents',
      oldValue: existing.monthly_fee_cents,
      newValue: nextFee,
      changedBy: admin.id,
      changedByRole: 'admin',
      reason:
        body.reason ??
        (overridden ? 'Custom monthly fee set by an administrator' : `${plan.name} list price applied`),
    });
    recordAudit(
      admin,
      'professional.fee_change',
      'professional',
      existing.id,
      `${existing.display_name}: monthly fee ${(existing.monthly_fee_cents / 100).toFixed(2)} → ${(nextFee / 100).toFixed(2)}`,
    );
    notify(
      existing.user_id,
      'professional.fee',
      'Your monthly membership fee changed',
      `An administrator set your fee to £${(nextFee / 100).toFixed(2)} per month.`,
      '/dashboard/billing',
    );

    res.json({
      professional: toPrivateDto(requireById(existing.id)),
      rateHistory: rateHistory(existing.id, 50),
    });
  }),
);

adminRouter.post(
  '/professionals/:id/account-status',
  asyncHandler((req, res) => {
    const admin = currentUser(req);
    const existing = requireById(Number(req.params.id));
    const body = parseBody(z.object({ status: z.enum(['active', 'suspended']) }), req.body);

    run("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?", body.status, existing.user_id);
    if (body.status === 'suspended') {
      run("UPDATE professionals SET is_published = 0, updated_at = datetime('now') WHERE id = ?", existing.id);
    }
    recordAudit(
      admin,
      `account.${body.status}`,
      'professional',
      existing.id,
      `${existing.display_name}'s account was ${body.status}`,
    );
    res.json({ professional: toPrivateDto(requireById(existing.id)) });
  }),
);

/** Raise this month's membership invoice for a professional. */
adminRouter.post(
  '/professionals/:id/invoices',
  asyncHandler((req, res) => {
    const admin = currentUser(req);
    const existing = requireById(Number(req.params.id));
    const periodStart = today();
    const periodEnd = addMonths(new Date(), 1);

    run(
      `INSERT INTO subscription_invoices (professional_id, period_start, period_end, amount_cents, currency, status)
       VALUES (?, ?, ?, ?, ?, 'due')`,
      existing.id,
      periodStart,
      periodEnd,
      existing.monthly_fee_cents,
      existing.currency,
    );
    run(
      "UPDATE professionals SET next_invoice_date = ?, updated_at = datetime('now') WHERE id = ?",
      periodEnd,
      existing.id,
    );
    recordAudit(
      admin,
      'invoice.create',
      'professional',
      existing.id,
      `Raised a ${(existing.monthly_fee_cents / 100).toFixed(2)} membership invoice for ${existing.display_name}`,
    );
    notify(
      existing.user_id,
      'invoice.raised',
      'New membership invoice',
      `A £${(existing.monthly_fee_cents / 100).toFixed(2)} invoice is due.`,
      '/dashboard/billing',
    );

    const invoices = all(
      `SELECT id, period_start, period_end, amount_cents, currency, status
       FROM subscription_invoices WHERE professional_id = ? ORDER BY period_start DESC LIMIT 12`,
      existing.id,
    );
    res.status(201).json({ invoices });
  }),
);

adminRouter.patch(
  '/invoices/:id',
  asyncHandler((req, res) => {
    const admin = currentUser(req);
    const invoice = get<{
      id: number;
      professional_id: number;
      amount_cents: number;
      currency: string;
      status: string;
      user_id: number;
      display_name: string;
    }>(
      `SELECT i.*, p.user_id, p.display_name
       FROM subscription_invoices i
       JOIN professionals p ON p.id = i.professional_id
       WHERE i.id = ?`,
      Number(req.params.id),
    );
    if (!invoice) throw ApiError.notFound('Invoice not found.');
    const body = parseBody(z.object({ status: z.enum(['paid', 'void', 'due']) }), req.body);
    run("UPDATE subscription_invoices SET status = ? WHERE id = ?", body.status, invoice.id);
    recordAudit(
      admin,
      `invoice.${body.status}`,
      'invoice',
      invoice.id,
      `Marked ${invoice.display_name}'s invoice as ${body.status}`,
    );
    if (body.status === 'paid') {
      notify(
        invoice.user_id,
        'invoice.paid',
        'Membership invoice marked paid',
        `Your £${(invoice.amount_cents / 100).toFixed(2)} invoice was recorded as paid.`,
        '/dashboard/billing',
      );
    }
    const invoices = all(
      `SELECT id, period_start, period_end, amount_cents, currency, status
       FROM subscription_invoices WHERE professional_id = ? ORDER BY period_start DESC LIMIT 12`,
      invoice.professional_id,
    );
    res.json({ invoices });
  }),
);

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

adminRouter.get(
  '/plans',
  asyncHandler((_req, res) => {
    const rows = all<{
      id: number;
      slug: string;
      name: string;
      description: string;
      monthly_fee_cents: number;
      currency: string;
      commission_bps: number;
      max_listings: number;
      features: string;
      is_active: number;
      sort_order: number;
      subscribers: number;
    }>(
      `SELECT pl.*, (SELECT COUNT(*) FROM professionals p WHERE p.plan_id = pl.id) AS subscribers
       FROM plans pl ORDER BY pl.sort_order, pl.monthly_fee_cents`,
    );
    res.json({
      plans: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description,
        monthlyFeeCents: r.monthly_fee_cents,
        currency: r.currency,
        commissionBps: r.commission_bps,
        maxListings: r.max_listings,
        features: JSON.parse(r.features || '[]') as string[],
        isActive: r.is_active === 1,
        sortOrder: r.sort_order,
        subscribers: r.subscribers,
      })),
    });
  }),
);

const planSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(400).default(''),
  monthlyFee: z.coerce.number().min(0).max(100000),
  commissionPercent: z.coerce.number().min(0).max(100).default(0),
  maxListings: z.coerce.number().int().min(1).max(100).default(1),
  features: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

adminRouter.post(
  '/plans',
  asyncHandler((req, res) => {
    const admin = currentUser(req);
    const body = parseBody(planSchema, req.body);
    const slug = uniqueSlug(
      body.name,
      (candidate) => !!get<{ id: number }>('SELECT id FROM plans WHERE slug = ?', candidate),
    );
    const { lastInsertRowid } = run(
      `INSERT INTO plans (slug, name, description, monthly_fee_cents, commission_bps, max_listings, features, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      slug,
      body.name,
      body.description,
      money(body.monthlyFee),
      Math.round(body.commissionPercent * 100),
      body.maxListings,
      JSON.stringify(body.features),
      body.isActive ? 1 : 0,
      body.sortOrder,
    );
    recordAudit(admin, 'plan.create', 'plan', lastInsertRowid, `Created the ${body.name} plan`);
    res.status(201).json({ id: lastInsertRowid });
  }),
);

/**
 * Editing a plan's price re-prices every professional on it, except those whose
 * fee an admin has deliberately overridden.
 */
adminRouter.patch(
  '/plans/:id',
  asyncHandler((req, res) => {
    const admin = currentUser(req);
    const id = Number(req.params.id);
    const existing = get<{ id: number; name: string; monthly_fee_cents: number }>(
      'SELECT id, name, monthly_fee_cents FROM plans WHERE id = ?',
      id,
    );
    if (!existing) throw ApiError.notFound('Plan not found.');

    const body = parseBody(planSchema.partial(), req.body);
    const nextFee = body.monthlyFee === undefined ? existing.monthly_fee_cents : money(body.monthlyFee);

    run(
      `UPDATE plans SET
         name = COALESCE(?, name),
         description = COALESCE(?, description),
         monthly_fee_cents = ?,
         commission_bps = COALESCE(?, commission_bps),
         max_listings = COALESCE(?, max_listings),
         features = COALESCE(?, features),
         is_active = COALESCE(?, is_active),
         sort_order = COALESCE(?, sort_order),
         updated_at = datetime('now')
       WHERE id = ?`,
      body.name ?? null,
      body.description ?? null,
      nextFee,
      body.commissionPercent === undefined ? null : Math.round(body.commissionPercent * 100),
      body.maxListings ?? null,
      body.features ? JSON.stringify(body.features) : null,
      body.isActive === undefined ? null : body.isActive ? 1 : 0,
      body.sortOrder ?? null,
      id,
    );

    let repriced = 0;
    if (nextFee !== existing.monthly_fee_cents) {
      const affected = all<{ id: number; monthly_fee_cents: number }>(
        'SELECT id, monthly_fee_cents FROM professionals WHERE plan_id = ? AND fee_is_overridden = 0',
        id,
      );
      for (const pro of affected) {
        run(
          "UPDATE professionals SET monthly_fee_cents = ?, updated_at = datetime('now') WHERE id = ?",
          nextFee,
          pro.id,
        );
        recordRateChange({
          professionalId: pro.id,
          field: 'monthly_fee_cents',
          oldValue: pro.monthly_fee_cents,
          newValue: nextFee,
          changedBy: admin.id,
          changedByRole: 'admin',
          reason: `${body.name ?? existing.name} plan price changed`,
        });
      }
      repriced = affected.length;
      recordAudit(
        admin,
        'plan.reprice',
        'plan',
        id,
        `${existing.name} monthly fee ${(existing.monthly_fee_cents / 100).toFixed(2)} → ${(nextFee / 100).toFixed(2)} (${repriced} member${repriced === 1 ? '' : 's'} re-priced)`,
      );
    } else {
      recordAudit(admin, 'plan.update', 'plan', id, `Updated the ${existing.name} plan`);
    }

    res.json({ ok: true, repriced });
  }),
);

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

adminRouter.get(
  '/categories',
  asyncHandler((_req, res) => {
    const rows = all<{
      id: number;
      slug: string;
      name: string;
      description: string;
      icon: string;
      sort_order: number;
      is_active: number;
      professionals: number;
    }>(
      `SELECT c.*, (SELECT COUNT(*) FROM professionals p WHERE p.category_id = c.id) AS professionals
       FROM categories c ORDER BY c.sort_order, c.name`,
    );
    res.json({
      categories: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description,
        icon: r.icon,
        sortOrder: r.sort_order,
        isActive: r.is_active === 1,
        professionals: r.professionals,
      })),
    });
  }),
);

const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(400).default(''),
  icon: z.string().trim().max(40).default('briefcase'),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

adminRouter.post(
  '/categories',
  asyncHandler((req, res) => {
    const admin = currentUser(req);
    const body = parseBody(categorySchema, req.body);
    const slug = uniqueSlug(
      body.name,
      (candidate) => !!get<{ id: number }>('SELECT id FROM categories WHERE slug = ?', candidate),
    );
    const { lastInsertRowid } = run(
      'INSERT INTO categories (slug, name, description, icon, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      slug,
      body.name,
      body.description,
      body.icon,
      body.sortOrder,
      body.isActive ? 1 : 0,
    );
    recordAudit(admin, 'category.create', 'category', lastInsertRowid, `Added the ${body.name} category`);
    res.status(201).json({ id: lastInsertRowid, slug });
  }),
);

adminRouter.patch(
  '/categories/:id',
  asyncHandler((req, res) => {
    const admin = currentUser(req);
    const id = Number(req.params.id);
    const existing = get<{ id: number; name: string }>('SELECT id, name FROM categories WHERE id = ?', id);
    if (!existing) throw ApiError.notFound('Category not found.');

    const body = parseBody(categorySchema.partial(), req.body);
    run(
      `UPDATE categories SET
         name = COALESCE(?, name),
         description = COALESCE(?, description),
         icon = COALESCE(?, icon),
         sort_order = COALESCE(?, sort_order),
         is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      body.name ?? null,
      body.description ?? null,
      body.icon ?? null,
      body.sortOrder ?? null,
      body.isActive === undefined ? null : body.isActive ? 1 : 0,
      id,
    );
    recordAudit(admin, 'category.update', 'category', id, `Updated the ${existing.name} category`);
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Bookings & audit
// ---------------------------------------------------------------------------

adminRouter.get(
  '/bookings',
  asyncHandler((_req, res) => {
    const rows = all(
      `SELECT b.id, b.reference, b.status, b.subject, b.scheduled_for, b.estimated_hours,
              b.hourly_rate_cents, b.total_cents, b.currency, b.created_at, b.payment_status,
              cu.full_name AS client_name, p.display_name AS professional_name, c.name AS category_name
       FROM bookings b
       JOIN users cu ON cu.id = b.client_id
       JOIN professionals p ON p.id = b.professional_id
       JOIN categories c ON c.id = p.category_id
       ORDER BY b.created_at DESC LIMIT 200`,
    );
    res.json({ bookings: rows });
  }),
);

adminRouter.get(
  '/audit',
  asyncHandler((_req, res) => {
    res.json({ events: listAudit(150) });
  }),
);

import { Router } from 'express';
import { z } from 'zod';
import { hashPassword } from '../auth/password.ts';
import { all, get, run, transaction } from '../db/database.ts';
import { recordAudit } from '../domain/audit.ts';
import { availabilityDto, seedDefaultAvailability } from '../domain/availability.ts';
import { notifyAdmins } from '../domain/notifications.ts';
import { ApiError } from '../lib/errors.ts';
import { addMonths, uniqueSlug } from '../lib/format.ts';
import { asyncHandler, parseBody, parseQuery } from '../lib/http.ts';
import { PROFESSIONAL_SELECT, recordRateChange, toPublicDto } from '../domain/professionals.ts';
import type { ProfessionalRow } from '../domain/types.ts';

export const directoryRouter = Router();

const SORTS = {
  recommended: 'p.rating_avg DESC, p.rating_count DESC, p.id ASC',
  rating: 'p.rating_avg DESC, p.rating_count DESC',
  price_low: 'p.hourly_rate_cents ASC',
  price_high: 'p.hourly_rate_cents DESC',
  experience: 'p.years_experience DESC',
  newest: 'p.created_at DESC',
} as const;

const searchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(60).optional(),
  location: z.string().trim().max(80).optional(),
  minRate: z.coerce.number().min(0).optional(),
  maxRate: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  freeConsultation: z.enum(['true', 'false']).optional(),
  verifiedOnly: z.enum(['true', 'false']).optional(),
  sort: z.enum(['recommended', 'rating', 'price_low', 'price_high', 'experience', 'newest']).default('recommended'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

directoryRouter.get(
  '/categories',
  asyncHandler((_req, res) => {
    const rows = all<{
      id: number;
      slug: string;
      name: string;
      description: string;
      icon: string;
      professional_count: number;
      min_rate: number | null;
    }>(
      `SELECT c.id, c.slug, c.name, c.description, c.icon,
              COUNT(p.id) AS professional_count,
              MIN(CASE WHEN p.is_published = 1 THEN p.hourly_rate_cents END) AS min_rate
       FROM categories c
       LEFT JOIN professionals p
         ON p.category_id = c.id AND p.is_published = 1 AND p.verification_status = 'verified'
       WHERE c.is_active = 1
       GROUP BY c.id
       ORDER BY c.sort_order, c.name`,
    );
    res.json({
      categories: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description,
        icon: r.icon,
        professionalCount: r.professional_count,
        fromRateCents: r.min_rate,
      })),
    });
  }),
);

directoryRouter.get(
  '/professionals',
  asyncHandler((req, res) => {
    const q = parseQuery(searchSchema, req.query);

    const where: string[] = ["p.is_published = 1", "u.status = 'active'"];
    const params: unknown[] = [];

    if (q.verifiedOnly !== 'false') {
      where.push("p.verification_status = 'verified'");
    }
    if (q.category) {
      where.push('c.slug = ?');
      params.push(q.category);
    }
    if (q.q) {
      where.push(
        `(p.display_name LIKE ? OR p.headline LIKE ? OR p.bio LIKE ? OR p.specialties LIKE ? OR c.name LIKE ?)`,
      );
      const like = `%${q.q}%`;
      params.push(like, like, like, like, like);
    }
    if (q.location) {
      where.push('(p.city LIKE ? OR p.region LIKE ? OR p.country LIKE ? OR p.service_areas LIKE ?)');
      const like = `%${q.location}%`;
      params.push(like, like, like, like);
    }
    if (q.minRate !== undefined) {
      where.push('p.hourly_rate_cents >= ?');
      params.push(Math.round(q.minRate * 100));
    }
    if (q.maxRate !== undefined) {
      where.push('p.hourly_rate_cents <= ?');
      params.push(Math.round(q.maxRate * 100));
    }
    if (q.minRating !== undefined) {
      where.push('p.rating_avg >= ?');
      params.push(q.minRating);
    }
    if (q.freeConsultation === 'true') {
      where.push('p.free_consultation = 1');
    }

    const clause = `WHERE ${where.join(' AND ')}`;
    const total = get<{ n: number }>(
      `SELECT COUNT(*) AS n
       FROM professionals p
       JOIN users u ON u.id = p.user_id
       JOIN categories c ON c.id = p.category_id
       ${clause}`,
      ...params,
    );

    const offset = (q.page - 1) * q.pageSize;
    const rows = all<ProfessionalRow>(
      `${PROFESSIONAL_SELECT} ${clause} ORDER BY ${SORTS[q.sort]} LIMIT ? OFFSET ?`,
      ...params,
      q.pageSize,
      offset,
    );

    res.json({
      results: rows.map(toPublicDto),
      page: q.page,
      pageSize: q.pageSize,
      total: total?.n ?? 0,
      totalPages: Math.max(1, Math.ceil((total?.n ?? 0) / q.pageSize)),
    });
  }),
);

directoryRouter.get(
  '/professionals/:slug',
  asyncHandler((req, res) => {
    const row = get<ProfessionalRow>(
      `${PROFESSIONAL_SELECT} WHERE p.slug = ? AND p.is_published = 1`,
      req.params.slug,
    );
    if (!row) throw ApiError.notFound('That professional profile is not available.');

    const reviews = all<{
      id: number;
      rating: number;
      comment: string;
      created_at: string;
      author: string;
    }>(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.full_name AS author
       FROM reviews r
       JOIN users u ON u.id = r.client_id
       WHERE r.professional_id = ?
       ORDER BY r.created_at DESC
       LIMIT 20`,
      row.id,
    );

    res.json({
      professional: toPublicDto(row),
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.created_at,
        author: r.author,
      })),
      availability: availabilityDto(row.id),
    });
  }),
);

directoryRouter.get(
  '/stats',
  asyncHandler((_req, res) => {
    const stats = get<{ professionals: number; categories: number; bookings: number; avg_rating: number | null }>(
      `SELECT
         (SELECT COUNT(*) FROM professionals WHERE is_published = 1 AND verification_status = 'verified') AS professionals,
         (SELECT COUNT(*) FROM categories WHERE is_active = 1) AS categories,
         (SELECT COUNT(*) FROM bookings) AS bookings,
         (SELECT AVG(rating) FROM reviews) AS avg_rating`,
    );
    res.json({
      professionals: stats?.professionals ?? 0,
      categories: stats?.categories ?? 0,
      bookings: stats?.bookings ?? 0,
      averageRating: Math.round((stats?.avg_rating ?? 0) * 10) / 10,
    });
  }),
);

const applicationSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
  fullName: z.string().trim().min(2, 'Enter your full name.').max(120),
  phone: z.string().trim().max(40).optional(),
  categoryId: z.coerce.number().int().positive('Choose your field of expertise.'),
  planId: z.coerce.number().int().positive('Choose a membership plan.'),
  businessName: z.string().trim().max(160).optional(),
  headline: z.string().trim().min(10, 'Describe what you do in a sentence.').max(160),
  bio: z.string().trim().max(4000).default(''),
  city: z.string().trim().min(2, 'Where are you based?').max(80),
  region: z.string().trim().max(80).default(''),
  country: z.string().trim().max(80).default(''),
  yearsExperience: z.coerce.number().int().min(0).max(80).default(0),
  hourlyRate: z.coerce.number().min(0).max(100000),
  specialties: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
});

/**
 * Self-service application. The profile lands in the admin queue as `pending`
 * and unpublished; an admin verifies it before it appears in the directory.
 */
directoryRouter.post(
  '/applications',
  asyncHandler((req, res) => {
    const body = parseBody(applicationSchema, req.body);

    if (get<{ id: number }>('SELECT id FROM users WHERE email = ?', body.email)) {
      throw ApiError.conflict('An account already exists for that email address.');
    }
    const category = get<{ id: number; name: string }>(
      'SELECT id, name FROM categories WHERE id = ? AND is_active = 1',
      body.categoryId,
    );
    if (!category) throw ApiError.badRequest('That field of expertise is not available.');
    const plan = get<{ id: number; name: string; monthly_fee_cents: number }>(
      'SELECT id, name, monthly_fee_cents FROM plans WHERE id = ? AND is_active = 1',
      body.planId,
    );
    if (!plan) throw ApiError.badRequest('That membership plan is not available.');

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
        `${body.fullName} ${body.city}`,
        (candidate) => !!get<{ id: number }>('SELECT id FROM professionals WHERE slug = ?', candidate),
      );
      const { lastInsertRowid: proId } = run(
        `INSERT INTO professionals
           (user_id, category_id, plan_id, slug, display_name, headline, bio, business_name,
            city, region, country, years_experience, hourly_rate_cents, monthly_fee_cents,
            subscription_status, next_invoice_date, specialties, verification_status, is_published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'trialing', ?, ?, 'pending', 0)`,
        userId,
        category.id,
        plan.id,
        slug,
        body.fullName,
        body.headline,
        body.bio,
        body.businessName ?? null,
        body.city,
        body.region,
        body.country,
        body.yearsExperience,
        Math.round(body.hourlyRate * 100),
        plan.monthly_fee_cents,
        addMonths(new Date(), 1),
        JSON.stringify(body.specialties),
      );

      recordRateChange({
        professionalId: proId,
        field: 'hourly_rate_cents',
        oldValue: null,
        newValue: Math.round(body.hourlyRate * 100),
        changedBy: userId,
        changedByRole: 'professional',
        reason: 'Rate set when applying to join',
      });
      recordRateChange({
        professionalId: proId,
        field: 'monthly_fee_cents',
        oldValue: null,
        newValue: plan.monthly_fee_cents,
        changedBy: null,
        changedByRole: 'system',
        reason: `${plan.name} plan selected at sign-up`,
      });
      seedDefaultAvailability(proId);
      return proId;
    });

    recordAudit(
      null,
      'professional.apply',
      'professional',
      professionalId,
      `${body.fullName} applied to join as a ${category.name.replace(/s$/, '')} on the ${plan.name} plan`,
    );
    notifyAdmins(
      'professional.apply',
      `New application: ${body.fullName}`,
      `${category.name} · ${plan.name} plan`,
      '/admin/professionals',
    );

    res.status(201).json({
      status: 'pending_review',
      message:
        'Thanks — your profile is with our team for verification. You can sign in now to finish it while you wait.',
    });
  }),
);

directoryRouter.get(
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
      features: string;
    }>('SELECT * FROM plans WHERE is_active = 1 ORDER BY sort_order, monthly_fee_cents');
    res.json({
      plans: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description,
        monthlyFeeCents: r.monthly_fee_cents,
        currency: r.currency,
        commissionBps: r.commission_bps,
        features: JSON.parse(r.features || '[]') as string[],
      })),
    });
  }),
);

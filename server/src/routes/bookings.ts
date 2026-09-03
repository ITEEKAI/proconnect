import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth } from '../auth/middleware.ts';
import { all, get, run } from '../db/database.ts';
import { professionalFitsAvailability } from '../domain/availability.ts';
import { notify } from '../domain/notifications.ts';
import { findById, recalculateRating, requireOwnProfile } from '../domain/professionals.ts';
import { ApiError } from '../lib/errors.ts';
import { bookingReference } from '../lib/format.ts';
import { asyncHandler, parseBody } from '../lib/http.ts';
import { startCheckout } from '../payments/checkout.ts';

export const bookingsRouter = Router();
bookingsRouter.use(requireAuth());

const BOOKING_SELECT = `
  SELECT b.*,
         cu.full_name AS client_name,
         cu.email     AS client_email,
         p.user_id    AS professional_user_id,
         p.slug       AS professional_slug,
         p.display_name AS professional_name,
         c.name       AS category_name
  FROM bookings b
  JOIN users cu        ON cu.id = b.client_id
  JOIN professionals p ON p.id = b.professional_id
  JOIN categories c    ON c.id = p.category_id
`;

interface BookingRow {
  id: number;
  reference: string;
  client_id: number;
  professional_id: number;
  status: string;
  subject: string;
  details: string;
  scheduled_for: string;
  estimated_hours: number;
  hourly_rate_cents: number;
  callout_fee_cents: number;
  currency: string;
  logged_hours: number | null;
  total_cents: number | null;
  payment_status: 'unpaid' | 'paid' | 'waived';
  professional_note: string | null;
  created_at: string;
  client_name: string;
  professional_user_id: number;
  professional_slug: string;
  professional_name: string;
  category_name: string;
}

function toDto(row: BookingRow) {
  const estimatedTotal = Math.round(row.hourly_rate_cents * row.estimated_hours) + row.callout_fee_cents;
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    subject: row.subject,
    details: row.details,
    scheduledFor: row.scheduled_for,
    estimatedHours: row.estimated_hours,
    hourlyRateCents: row.hourly_rate_cents,
    calloutFeeCents: row.callout_fee_cents,
    currency: row.currency,
    estimatedTotalCents: estimatedTotal,
    loggedHours: row.logged_hours,
    totalCents: row.total_cents,
    paymentStatus: row.payment_status ?? 'unpaid',
    professionalNote: row.professional_note,
    withinHours: professionalFitsAvailability(row.professional_id, row.scheduled_for),
    createdAt: row.created_at,
    client: { id: row.client_id, name: row.client_name },
    professional: {
      id: row.professional_id,
      slug: row.professional_slug,
      name: row.professional_name,
      category: row.category_name,
    },
  };
}

bookingsRouter.post(
  '/',
  requireAuth('client'),
  asyncHandler((req, res) => {
    const user = currentUser(req);
    const body = parseBody(
      z.object({
        professionalId: z.coerce.number().int().positive(),
        subject: z.string().trim().min(4, 'Give your request a short title.').max(160),
        details: z.string().trim().max(4000).default(''),
        scheduledFor: z.string().trim().min(4, 'Choose a date and time.'),
        estimatedHours: z.coerce.number().min(0.25).max(200),
      }),
      req.body,
    );

    const pro = findById(body.professionalId);
    if (!pro || pro.is_published !== 1) throw ApiError.notFound('That professional is not accepting requests.');
    if (pro.user_id === user.id) throw ApiError.badRequest('You cannot book yourself.');
    if (body.estimatedHours < pro.minimum_hours) {
      throw ApiError.badRequest(
        `${pro.display_name} has a ${pro.minimum_hours} hour minimum for new engagements.`,
      );
    }

    const { lastInsertRowid } = run(
      `INSERT INTO bookings
         (reference, client_id, professional_id, subject, details, scheduled_for,
          estimated_hours, hourly_rate_cents, callout_fee_cents, currency)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      bookingReference(),
      user.id,
      pro.id,
      body.subject,
      body.details,
      body.scheduledFor,
      body.estimatedHours,
      pro.hourly_rate_cents,
      pro.callout_fee_cents,
      pro.currency,
    );

    const row = get<BookingRow>(`${BOOKING_SELECT} WHERE b.id = ?`, lastInsertRowid);
    notify(
      pro.user_id,
      'booking.requested',
      `New booking from ${user.full_name}`,
      `${body.subject} · ${body.estimatedHours} hours`,
      `/dashboard/bookings/${row?.id ?? ''}`,
    );
    res.status(201).json({ booking: row && toDto(row) });
  }),
);

bookingsRouter.get(
  '/',
  asyncHandler((req, res) => {
    const user = currentUser(req);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    let clause: string;
    const params: unknown[] = [];
    if (user.role === 'client') {
      clause = 'WHERE b.client_id = ?';
      params.push(user.id);
    } else if (user.role === 'professional') {
      clause = 'WHERE b.professional_id = ?';
      params.push(requireOwnProfile(user.id).id);
    } else {
      clause = 'WHERE 1 = 1';
    }
    if (status) {
      clause += ' AND b.status = ?';
      params.push(status);
    }

    const rows = all<BookingRow>(
      `${BOOKING_SELECT} ${clause} ORDER BY b.scheduled_for DESC, b.id DESC LIMIT 200`,
      ...params,
    );
    res.json({ bookings: rows.map(toDto) });
  }),
);

function loadForActor(req: Parameters<typeof currentUser>[0], id: number): BookingRow {
  const user = currentUser(req);
  const row = get<BookingRow>(`${BOOKING_SELECT} WHERE b.id = ?`, id);
  if (!row) throw ApiError.notFound('Booking not found.');
  if (user.role === 'client' && row.client_id !== user.id) throw ApiError.forbidden();
  if (user.role === 'professional' && row.professional_id !== requireOwnProfile(user.id).id) {
    throw ApiError.forbidden();
  }
  return row;
}

bookingsRouter.get(
  '/:id',
  asyncHandler((req, res) => {
    res.json({ booking: toDto(loadForActor(req, Number(req.params.id))) });
  }),
);

/** Professional-side status transitions: accept, decline, complete. */
bookingsRouter.post(
  '/:id/status',
  requireAuth('professional', 'admin'),
  asyncHandler((req, res) => {
    const row = loadForActor(req, Number(req.params.id));
    const body = parseBody(
      z.object({
        status: z.enum(['accepted', 'declined', 'completed']),
        loggedHours: z.coerce.number().min(0).max(500).optional(),
        note: z.string().trim().max(1000).optional(),
      }),
      req.body,
    );

    const allowed: Record<string, string[]> = {
      requested: ['accepted', 'declined'],
      accepted: ['completed'],
    };
    if (!allowed[row.status]?.includes(body.status)) {
      throw ApiError.badRequest(`A ${row.status} booking cannot be marked ${body.status}.`);
    }

    let totalCents: number | null = null;
    let loggedHours: number | null = null;
    if (body.status === 'completed') {
      loggedHours = body.loggedHours ?? row.estimated_hours;
      totalCents = Math.round(row.hourly_rate_cents * loggedHours) + row.callout_fee_cents;
    }

    run(
      `UPDATE bookings
       SET status = ?, logged_hours = ?, total_cents = ?,
           professional_note = COALESCE(?, professional_note), updated_at = datetime('now')
       WHERE id = ?`,
      body.status,
      loggedHours,
      totalCents,
      body.note ?? null,
      row.id,
    );

    const updated = get<BookingRow>(`${BOOKING_SELECT} WHERE b.id = ?`, row.id);
    const statusLabel = body.status.replace('_', ' ');
    notify(
      row.client_id,
      'booking.status',
      `${row.reference} is now ${statusLabel}`,
      `${row.professional_name} marked this job as ${statusLabel}.`,
      `/account/bookings/${row.id}`,
    );
    if (body.status === 'completed') {
      notify(
        row.client_id,
        'booking.completed',
        `Pay ${row.reference}`,
        'The work is complete. You can record payment from the booking page.',
        `/account/bookings/${row.id}`,
      );
    }
    res.json({ booking: updated && toDto(updated) });
  }),
);

bookingsRouter.post(
  '/:id/cancel',
  requireAuth('client'),
  asyncHandler((req, res) => {
    const row = loadForActor(req, Number(req.params.id));
    if (row.status === 'completed') throw ApiError.badRequest('Completed bookings cannot be cancelled.');
    run("UPDATE bookings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?", row.id);
    const updated = get<BookingRow>(`${BOOKING_SELECT} WHERE b.id = ?`, row.id);
    notify(
      row.professional_user_id,
      'booking.status',
      `${row.reference} was cancelled`,
      `${currentUser(req).full_name} cancelled this job.`,
      `/dashboard/bookings/${row.id}`,
    );
    res.json({ booking: updated && toDto(updated) });
  }),
);

interface MessageRow {
  id: number;
  booking_id: number;
  sender_id: number;
  body: string;
  created_at: string;
  author_name: string;
  author_role: string;
}

function toMessageDto(row: MessageRow) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    authorId: row.sender_id,
    authorName: row.author_name,
    authorRole: row.author_role,
    body: row.body,
    createdAt: row.created_at,
  };
}

bookingsRouter.get(
  '/:id/messages',
  asyncHandler((req, res) => {
    const row = loadForActor(req, Number(req.params.id));
    const messages = all<MessageRow>(
      `SELECT m.*, u.full_name AS author_name, u.role AS author_role
       FROM booking_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.booking_id = ?
       ORDER BY m.id ASC`,
      row.id,
    );
    res.json({ messages: messages.map(toMessageDto) });
  }),
);

bookingsRouter.post(
  '/:id/messages',
  asyncHandler((req, res) => {
    const user = currentUser(req);
    const row = loadForActor(req, Number(req.params.id));
    const body = parseBody(
      z.object({ body: z.string().trim().min(1, 'Message cannot be empty.').max(4000) }),
      req.body,
    );
    const { lastInsertRowid } = run(
      'INSERT INTO booking_messages (booking_id, sender_id, body) VALUES (?, ?, ?)',
      row.id,
      user.id,
      body.body,
    );
    if (user.role === 'admin') {
      notify(
        row.client_id,
        'booking.message',
        `New message on ${row.reference}`,
        body.body.slice(0, 140),
        `/account/bookings/${row.id}`,
      );
      notify(
        row.professional_user_id,
        'booking.message',
        `New message on ${row.reference}`,
        body.body.slice(0, 140),
        `/dashboard/bookings/${row.id}`,
      );
    } else {
      const otherId = user.id === row.client_id ? row.professional_user_id : row.client_id;
      notify(
        otherId,
        'booking.message',
        `New message on ${row.reference}`,
        body.body.slice(0, 140),
        user.id === row.client_id ? `/dashboard/bookings/${row.id}` : `/account/bookings/${row.id}`,
      );
    }
    const saved = get<MessageRow>(
      `SELECT m.*, u.full_name AS author_name, u.role AS author_role
       FROM booking_messages m JOIN users u ON u.id = m.sender_id
       WHERE m.id = ?`,
      lastInsertRowid,
    );
    res.status(201).json({ message: saved && toMessageDto(saved) });
  }),
);

bookingsRouter.post(
  '/:id/pay',
  requireAuth('client'),
  asyncHandler(async (req, res) => {
    const row = loadForActor(req, Number(req.params.id));
    if (row.status !== 'completed') {
      throw ApiError.badRequest('Payment is only available after the job is completed.');
    }
    if (row.payment_status === 'paid') throw ApiError.badRequest('This booking is already paid.');
    const user = currentUser(req);
    const amount = row.total_cents ?? Math.round(row.hourly_rate_cents * row.estimated_hours) + row.callout_fee_cents;
    const checkout = await startCheckout({
      kind: 'booking',
      bookingId: row.id,
      payerUserId: user.id,
      customerEmail: user.email,
      amountCents: amount,
      currency: row.currency,
      description: `${row.reference} · ${row.subject}`,
      successPath: `/account/bookings/${row.id}`,
      cancelPath: `/account/bookings/${row.id}`,
    });
    res.json(checkout);
  }),
);

bookingsRouter.post(
  '/:id/review',
  requireAuth('client'),
  asyncHandler((req, res) => {
    const row = loadForActor(req, Number(req.params.id));
    if (row.status !== 'completed') {
      throw ApiError.badRequest('You can leave a review once the work is marked complete.');
    }
    const existing = get<{ id: number }>('SELECT id FROM reviews WHERE booking_id = ?', row.id);
    if (existing) throw ApiError.conflict('You have already reviewed this booking.');

    const body = parseBody(
      z.object({
        rating: z.coerce.number().int().min(1).max(5),
        comment: z.string().trim().max(2000).default(''),
      }),
      req.body,
    );

    run(
      'INSERT INTO reviews (booking_id, professional_id, client_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
      row.id,
      row.professional_id,
      row.client_id,
      body.rating,
      body.comment,
    );
    recalculateRating(row.professional_id);
    res.status(201).json({ ok: true });
  }),
);

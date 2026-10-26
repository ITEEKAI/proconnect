import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth } from '../auth/middleware.ts';
import { marketplace } from '../business/marketplace.ts';
import { get, run } from '../db/database.ts';
import { requireOwnProfile } from '../domain/professionals.ts';
import { ApiError } from '../lib/errors.ts';
import { asyncHandler, parseBody } from '../lib/http.ts';

export const integrationsRouter = Router();

integrationsRouter.get('/status', (_req, res) => {
  res.json({
    offgrid056Os: marketplace.integrations.offgrid056Os,
    tidycal: marketplace.integrations.tidycal,
    zoom: marketplace.integrations.zoom,
    payments: marketplace.integrations.payments,
  });
});

interface HandoffRow {
  id: number;
  reference: string;
  client_id: number;
  professional_id: number;
  professional_user_id: number;
  status: string;
  service_type: string;
  customer_reference: string | null;
  assessment_reference: string | null;
  requested_service: string | null;
  professional_referral: string | null;
  handoff_status: string;
  follow_up_status: string;
}

function handoffForActor(user: ReturnType<typeof currentUser>, bookingId: number): HandoffRow {
  const row = get<HandoffRow>(
    `SELECT b.*, p.user_id AS professional_user_id
     FROM bookings b JOIN professionals p ON p.id = b.professional_id
     WHERE b.id = ?`,
    bookingId,
  );
  if (!row) throw ApiError.notFound('Booking not found.');
  if (user.role === 'client' && row.client_id !== user.id) throw ApiError.forbidden();
  if (user.role === 'professional' && row.professional_id !== requireOwnProfile(user.id).id) {
    throw ApiError.forbidden();
  }
  return row;
}

function handoffDto(row: HandoffRow) {
  return {
    mode: marketplace.integrations.offgrid056Os.mode,
    privateRecordTransfer: false,
    bookingId: row.id,
    bookingReference: row.reference,
    customerReference: row.customer_reference,
    assessmentReference: row.assessment_reference,
    requestedService: row.requested_service,
    professionalReferral: row.professional_referral,
    serviceType: row.service_type,
    bookingStatus: row.status,
    projectHandoff: row.handoff_status,
    completionFollowUp: row.follow_up_status,
  };
}

integrationsRouter.get(
  '/offgrid056/handoffs/:bookingId',
  requireAuth(),
  asyncHandler((req, res) => {
    res.json({ handoff: handoffDto(handoffForActor(currentUser(req), Number(req.params.bookingId))) });
  }),
);

integrationsRouter.patch(
  '/offgrid056/handoffs/:bookingId',
  requireAuth('admin'),
  asyncHandler((req, res) => {
    const row = handoffForActor(currentUser(req), Number(req.params.bookingId));
    const body = parseBody(
      z.object({
        projectHandoff: z.enum(['not_started', 'referred', 'accepted', 'closed']).optional(),
        completionFollowUp: z.enum(['not_started', 'due', 'complete']).optional(),
      }),
      req.body,
    );
    run(
      `UPDATE bookings SET handoff_status = COALESCE(?, handoff_status),
       follow_up_status = COALESCE(?, follow_up_status), updated_at = datetime('now') WHERE id = ?`,
      body.projectHandoff ?? null,
      body.completionFollowUp ?? null,
      row.id,
    );
    const updated = handoffForActor(currentUser(req), row.id);
    res.json({ handoff: handoffDto(updated) });
  }),
);

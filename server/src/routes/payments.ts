import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth } from '../auth/middleware.ts';
import { config } from '../config.ts';
import { asyncHandler, parseBody } from '../lib/http.ts';
import { ApiError } from '../lib/errors.ts';
import {
  completeDemoSession,
  confirmProviderRef,
  fulfillProviderRef,
  getSessionForPayer,
  sessionDto,
} from '../payments/checkout.ts';
import { paymentGateway } from '../payments/gateway.ts';

export const paymentsRouter = Router();

paymentsRouter.get(
  '/config',
  asyncHandler((_req, res) => {
    res.json({
      provider: config.paymentsProvider,
      testMode: config.paymentsProvider === 'demo' || config.stripeSecretKey.startsWith('sk_test_'),
    });
  }),
);

paymentsRouter.get(
  '/sessions/:id',
  requireAuth(),
  asyncHandler((req, res) => {
    const row = getSessionForPayer(req.params.id ?? '', currentUser(req).id);
    res.json({ session: sessionDto(row) });
  }),
);

paymentsRouter.post(
  '/sessions/:id/complete',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const updated = await completeDemoSession(req.params.id ?? '', currentUser(req).id);
    res.json({ session: sessionDto(updated) });
  }),
);

paymentsRouter.post(
  '/confirm',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const body = parseBody(z.object({ sessionId: z.string().min(4) }), req.body);
    const updated = await confirmProviderRef(body.sessionId, currentUser(req).id);
    res.json({ session: sessionDto(updated) });
  }),
);

export const stripeWebhookHandler = asyncHandler(async (req, res) => {
  const signature = req.header('stripe-signature');
  if (!signature) throw ApiError.badRequest('Missing Stripe-Signature header.');
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
  const ref = await paymentGateway().parseWebhook(raw, signature);
  if (ref) await fulfillProviderRef(ref);
  res.json({ received: true });
});

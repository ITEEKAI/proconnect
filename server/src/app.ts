import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import { attachUser } from './auth/middleware.ts';
import { ensureUploadsDir } from './domain/avatars.ts';
import { errorHandler, notFoundHandler } from './lib/http.ts';
import { adminRouter } from './routes/admin.ts';
import { authRouter } from './routes/auth.ts';
import { bookingsRouter } from './routes/bookings.ts';
import { directoryRouter } from './routes/directory.ts';
import { notificationsRouter } from './routes/notifications.ts';
import { paymentsRouter, stripeWebhookHandler } from './routes/payments.ts';
import { professionalRouter } from './routes/professional.ts';
import { attachWebApp } from './webapp.ts';
import { config } from './config.ts';

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: true, credentials: true }));

  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);

  app.use(express.json({ limit: '2.5mb' }));
  app.use(cookieParser());
  app.use(attachUser);
  app.use('/uploads', express.static(ensureUploadsDir()));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'proconnect-api',
      payments: config.paymentsProvider,
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/directory', directoryRouter);
  app.use('/api/professional', professionalRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/admin', adminRouter);

  app.use('/api', notFoundHandler);
  attachWebApp(app);
  app.use(errorHandler);
  return app;
}

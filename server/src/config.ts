import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, '..');

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const defaultAuthSecret = 'dev-only-insecure-secret-change-me';

export const config = {
  port: int('PORT', 4000),
  host: process.env.HOST ?? '127.0.0.1',
  databasePath: process.env.DATABASE_PATH ?? path.join(serverRoot, 'data', 'proconnect.db'),
  uploadsDir: process.env.UPLOADS_DIR ?? path.join(serverRoot, 'data', 'uploads'),
  webDist: process.env.WEB_DIST ?? path.resolve(serverRoot, '../web/dist'),
  /**
   * Public origin of the web app. Stripe success/cancel URLs and the demo
   * checkout page are built from this.
   */
  publicUrl: (
    process.env.PUBLIC_URL ?? (process.env.NODE_ENV === 'production' ? '' : 'http://127.0.0.1:5173')
  ).replace(/\/$/, ''),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  /**
   * Signing key for session tokens. A generated development default keeps the
   * local setup zero-config; production deployments must supply their own.
   */
  authSecret: process.env.AUTH_SECRET ?? defaultAuthSecret,
  usingDefaultAuthSecret: !process.env.AUTH_SECRET,
  tokenTtlSeconds: int('TOKEN_TTL_SECONDS', 60 * 60 * 12),
  isProduction: process.env.NODE_ENV === 'production',
  paymentsProvider: (process.env.STRIPE_SECRET_KEY ? 'stripe' : 'demo') as 'stripe' | 'demo',
} as const;

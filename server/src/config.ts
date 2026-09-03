import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, '..');
const isProduction = process.env.NODE_ENV === 'production';

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dataRoot(): string {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  if (fs.existsSync('/data')) return '/data';
  return path.join(serverRoot, 'data');
}

function publicOrigin(): string {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return isProduction ? '' : 'http://127.0.0.1:5173';
}

const defaultAuthSecret = 'dev-only-insecure-secret-change-me';
const volumeRoot = dataRoot();

export const config = {
  port: int('PORT', 4000),
  host: process.env.HOST ?? (isProduction ? '0.0.0.0' : '127.0.0.1'),
  databasePath: process.env.DATABASE_PATH ?? path.join(volumeRoot, 'proconnect.db'),
  uploadsDir: process.env.UPLOADS_DIR ?? path.join(volumeRoot, 'uploads'),
  webDist: process.env.WEB_DIST ?? path.resolve(serverRoot, '../web/dist'),
  /**
   * Public origin of the web app. Stripe success/cancel URLs and the demo
   * checkout page are built from this. On Railway, RAILWAY_PUBLIC_DOMAIN is used
   * when PUBLIC_URL is unset.
   */
  publicUrl: publicOrigin(),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  /**
   * Signing key for session tokens. A generated development default keeps the
   * local setup zero-config; production deployments must supply their own.
   */
  authSecret: process.env.AUTH_SECRET ?? defaultAuthSecret,
  usingDefaultAuthSecret: !process.env.AUTH_SECRET,
  tokenTtlSeconds: int('TOKEN_TTL_SECONDS', 60 * 60 * 12),
  isProduction,
  paymentsProvider: (process.env.STRIPE_SECRET_KEY ? 'stripe' : 'demo') as 'stripe' | 'demo',
} as const;

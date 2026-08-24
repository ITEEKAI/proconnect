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

export const config = {
  port: int('PORT', 4000),
  host: process.env.HOST ?? '127.0.0.1',
  databasePath: process.env.DATABASE_PATH ?? path.join(serverRoot, 'data', 'proconnect.db'),
  uploadsDir: process.env.UPLOADS_DIR ?? path.join(serverRoot, 'data', 'uploads'),
  /**
   * Signing key for session tokens. A generated development default keeps the
   * local setup zero-config; production deployments must supply their own.
   */
  authSecret: process.env.AUTH_SECRET ?? 'dev-only-insecure-secret-change-me',
  tokenTtlSeconds: int('TOKEN_TTL_SECONDS', 60 * 60 * 12),
  isProduction: process.env.NODE_ENV === 'production',
} as const;

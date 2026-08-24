import crypto from 'node:crypto';
import { config } from '../config.ts';

export interface TokenPayload {
  sub: number;
  role: 'admin' | 'professional' | 'client';
  email: string;
  exp: number;
}

function base64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function sign(data: string): string {
  return crypto.createHmac('sha256', config.authSecret).update(data).digest('base64url');
}

export function issueToken(payload: Omit<TokenPayload, 'exp'>, ttlSeconds = config.tokenTtlSeconds): string {
  const body: TokenPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify(body));
  return `${header}.${claims}.${sign(`${header}.${claims}`)}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, claims, signature] = parts as [string, string, string];

  const expected = sign(`${header}.${claims}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(claims, 'base64url').toString('utf8')) as TokenPayload;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

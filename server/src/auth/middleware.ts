import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { get } from '../db/database.ts';
import { ApiError } from '../lib/errors.ts';
import { verifyToken } from './tokens.ts';

export type Role = 'admin' | 'professional' | 'client';

export interface AuthUser {
  id: number;
  email: string;
  role: Role;
  full_name: string;
  status: 'active' | 'suspended';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function readToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  const cookie = (req as Request & { cookies?: Record<string, string> }).cookies?.['pc_token'];
  return cookie ?? null;
}

/** Populates `req.user` when a valid token is present; never rejects. */
export const attachUser: RequestHandler = (req, _res, next) => {
  const token = readToken(req);
  if (!token) return next();
  const payload = verifyToken(token);
  if (!payload) return next();

  const user = get<AuthUser>(
    'SELECT id, email, role, full_name, status FROM users WHERE id = ?',
    payload.sub,
  );
  if (user && user.status === 'active') req.user = user;
  next();
};

export function requireAuth(...roles: Role[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`This action requires the ${roles.join(' or ')} role.`));
    }
    next();
  };
}

export function currentUser(req: Request): AuthUser {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

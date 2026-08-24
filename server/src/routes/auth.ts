import { Router } from 'express';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../auth/password.ts';
import { issueToken } from '../auth/tokens.ts';
import { currentUser, requireAuth, type AuthUser } from '../auth/middleware.ts';
import { get, run } from '../db/database.ts';
import { ApiError } from '../lib/errors.ts';
import { asyncHandler, parseBody } from '../lib/http.ts';
import { findByUserId, toPrivateDto } from '../domain/professionals.ts';

export const authRouter = Router();

const credentials = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
});

const signupSchema = credentials.extend({
  fullName: z.string().trim().min(2, 'Tell us your name.').max(120),
  phone: z.string().trim().max(40).optional(),
});

function sessionPayload(user: AuthUser) {
  const profile = user.role === 'professional' ? findByUserId(user.id) : undefined;
  return {
    token: issueToken({ sub: user.id, role: user.role, email: user.email }),
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
    },
    professional: profile ? toPrivateDto(profile) : null,
  };
}

authRouter.post(
  '/signup',
  asyncHandler((req, res) => {
    const body = parseBody(signupSchema, req.body);
    const existing = get<{ id: number }>('SELECT id FROM users WHERE email = ?', body.email);
    if (existing) throw ApiError.conflict('An account already exists for that email address.');

    const { lastInsertRowid } = run(
      `INSERT INTO users (email, password_hash, role, full_name, phone)
       VALUES (?, ?, 'client', ?, ?)`,
      body.email,
      hashPassword(body.password),
      body.fullName,
      body.phone ?? null,
    );

    const user = get<AuthUser>(
      'SELECT id, email, role, full_name, status FROM users WHERE id = ?',
      lastInsertRowid,
    );
    if (!user) throw new ApiError(500, 'internal_error', 'Account could not be created.');
    res.status(201).json(sessionPayload(user));
  }),
);

authRouter.post(
  '/login',
  asyncHandler((req, res) => {
    const body = parseBody(credentials, req.body);
    const record = get<AuthUser & { password_hash: string }>(
      'SELECT id, email, role, full_name, status, password_hash FROM users WHERE email = ?',
      body.email,
    );
    if (!record || !verifyPassword(body.password, record.password_hash)) {
      throw ApiError.unauthorized('Email or password is incorrect.');
    }
    if (record.status !== 'active') {
      throw ApiError.forbidden('This account has been suspended. Contact support for help.');
    }
    res.json(sessionPayload(record));
  }),
);

authRouter.get(
  '/me',
  requireAuth(),
  asyncHandler((req, res) => {
    const user = currentUser(req);
    const profile = user.role === 'professional' ? findByUserId(user.id) : undefined;
    res.json({
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
      professional: profile ? toPrivateDto(profile) : null,
    });
  }),
);

authRouter.patch(
  '/me',
  requireAuth(),
  asyncHandler((req, res) => {
    const user = currentUser(req);
    const body = parseBody(
      z.object({
        fullName: z.string().trim().min(2).max(120).optional(),
        phone: z.string().trim().max(40).nullable().optional(),
      }),
      req.body,
    );
    run(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           phone = COALESCE(?, phone),
           updated_at = datetime('now')
       WHERE id = ?`,
      body.fullName ?? null,
      body.phone ?? null,
      user.id,
    );
    const updated = get<AuthUser>(
      'SELECT id, email, role, full_name, status FROM users WHERE id = ?',
      user.id,
    );
    res.json({
      user: updated && {
        id: updated.id,
        email: updated.email,
        fullName: updated.full_name,
        role: updated.role,
      },
    });
  }),
);

authRouter.post(
  '/change-password',
  requireAuth(),
  asyncHandler((req, res) => {
    const user = currentUser(req);
    const body = parseBody(
      z.object({
        currentPassword: z.string().min(1, 'Enter your current password.'),
        newPassword: z.string().min(8, 'Use at least 8 characters.'),
      }),
      req.body,
    );
    const record = get<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = ?',
      user.id,
    );
    if (!record || !verifyPassword(body.currentPassword, record.password_hash)) {
      throw ApiError.badRequest('Your current password is incorrect.');
    }
    run(
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
      hashPassword(body.newPassword),
      user.id,
    );
    res.json({ ok: true });
  }),
);

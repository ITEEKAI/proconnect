import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type TypeOf, type ZodTypeAny } from 'zod';
import { ApiError } from './errors.ts';

/** Wraps an async handler so rejected promises reach the Express error handler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function parseBody<S extends ZodTypeAny>(schema: S, body: unknown): TypeOf<S> {
  try {
    return schema.parse(body) as TypeOf<S>;
  } catch (error) {
    if (error instanceof ZodError) {
      throw ApiError.badRequest(
        'Some fields need attention.',
        error.issues.map((issue) => ({
          field: issue.path.join('.') || '_',
          message: issue.message,
        })),
      );
    }
    throw error;
  }
}

export function parseQuery<S extends ZodTypeAny>(schema: S, query: unknown): TypeOf<S> {
  return parseBody(schema, query);
}

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details ?? null },
    });
    return;
  }
  console.error('[api] unhandled error', error);
  res.status(500).json({
    error: { code: 'internal_error', message: 'Something went wrong on our end.', details: null },
  });
};

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: 'Unknown endpoint.', details: null } });
};

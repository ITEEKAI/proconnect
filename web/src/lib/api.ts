export interface ApiFieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: ApiFieldError[];

  constructor(status: number, code: string, message: string, fieldErrors: ApiFieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  fieldError(name: string): string | undefined {
    return this.fieldErrors.find((f) => f.field === name)?.message;
  }
}

const TOKEN_KEY = 'proconnect.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`/api${path}`, {
    method: options.method ?? (options.body ? 'POST' : 'GET'),
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : null,
    signal: options.signal ?? null,
  });

  const text = await response.text();
  const payload: unknown = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string; details?: unknown } })?.error;
    const details = Array.isArray(error?.details) ? (error.details as ApiFieldError[]) : [];
    throw new ApiError(
      response.status,
      error?.code ?? 'error',
      error?.message ?? 'Something went wrong.',
      details,
    );
  }
  return payload as T;
}

export function query(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

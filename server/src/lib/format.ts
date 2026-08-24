import crypto from 'node:crypto';

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function uniqueSlug(base: string, exists: (candidate: string) => boolean): string {
  const root = slugify(base) || 'pro';
  if (!exists(root)) return root;
  for (let n = 2; n < 500; n += 1) {
    const candidate = `${root}-${n}`;
    if (!exists(candidate)) return candidate;
  }
  return `${root}-${crypto.randomBytes(3).toString('hex')}`;
}

export function bookingReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (const byte of crypto.randomBytes(6)) {
    out += alphabet[byte % alphabet.length];
  }
  return `PC-${out}`;
}

export function parseJsonArray(value: unknown): string[] {
  if (typeof value !== 'string' || value.trim() === '') return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function parseJsonObjects<T>(value: unknown): T[] {
  if (typeof value !== 'string' || value.trim() === '') return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** Returns an ISO date (YYYY-MM-DD) `months` months after `from`. */
export function addMonths(from: Date, months: number): string {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + months, from.getUTCDate()));
  return d.toISOString().slice(0, 10);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowIso(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

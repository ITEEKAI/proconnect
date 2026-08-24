const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', GBP: '£', EUR: '€' };

export function money(cents: number | null | undefined, currency = 'GBP'): string {
  if (cents === null || cents === undefined) return '—';
  const symbol = CURRENCY_SYMBOLS[currency] ?? '';
  const value = cents / 100;
  const formatted = Number.isInteger(value)
    ? value.toLocaleString('en-GB')
    : value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol}${formatted}`;
}

export function dollars(cents: number | null | undefined): number {
  return (cents ?? 0) / 100;
}

export function percentFromBps(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function relativeTime(value: string): string {
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

const AVATAR_COLOURS = [
  'bg-brand-100 text-brand-800',
  'bg-emerald-100 text-emerald-800',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-800',
  'bg-violet-100 text-violet-800',
  'bg-cyan-100 text-cyan-800',
  'bg-lime-100 text-lime-800',
  'bg-orange-100 text-orange-800',
];

export function avatarColour(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLOURS[hash % AVATAR_COLOURS.length] as string;
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString('en-GB')} ${count === 1 ? singular : plural}`;
}

export function hoursLabel(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `${n} ${n === 1 ? 'hour' : 'hours'}`;
}

export function locationLabel(location: { city: string; region: string; country: string }): string {
  return [location.city, location.region].filter(Boolean).join(', ') || location.country || 'Remote';
}

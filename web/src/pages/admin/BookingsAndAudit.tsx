import { useState } from 'react';
import { api } from '../../lib/api';
import { formatDateTime, money, relativeTime } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { AuditEvent } from '../../lib/types';
import { ErrorBanner, PageLoader } from '../../components/Layout';
import { Badge, Card, EmptyState, Select, Stat } from '../../components/ui';
import { Icons } from '../../components/icons';
import { AdminShell } from './AdminShell';

interface AdminBooking {
  id: number;
  reference: string;
  status: string;
  subject: string;
  scheduled_for: string;
  estimated_hours: number;
  hourly_rate_cents: number;
  total_cents: number | null;
  currency: string;
  created_at: string;
  payment_status?: string;
  client_name: string;
  professional_name: string;
  category_name: string;
}

const STATUS_TONE: Record<string, 'warning' | 'brand' | 'success' | 'danger' | 'neutral'> = {
  requested: 'warning',
  accepted: 'brand',
  completed: 'success',
  declined: 'danger',
  cancelled: 'neutral',
};

export function AdminBookings() {
  const bookings = useAsync(() => api<{ bookings: AdminBooking[] }>('/admin/bookings'));
  const [status, setStatus] = useState('');

  const rows = (bookings.data?.bookings ?? []).filter((b) => !status || b.status === status);
  const completedValue = rows
    .filter((b) => b.status === 'completed')
    .reduce((total, b) => total + (b.total_cents ?? 0), 0);
  const pipeline = rows
    .filter((b) => b.status === 'requested' || b.status === 'accepted')
    .reduce((total, b) => total + Math.round(b.hourly_rate_cents * b.estimated_hours), 0);

  return (
    <AdminShell title="Bookings" subtitle="Every job requested through the platform.">
      <ErrorBanner error={bookings.error} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Bookings in view"
          value={String(rows.length)}
          tone="brand"
          icon={<Icons.calendar className="size-4" />}
        />
        <Stat
          label="Completed value"
          value={money(completedValue)}
          sub="Invoiced through the platform"
          tone="success"
          icon={<Icons.chart className="size-4" />}
        />
        <Stat
          label="Open pipeline"
          value={money(pipeline)}
          sub="Requested and confirmed estimates"
          tone="warning"
          icon={<Icons.clock className="size-4" />}
        />
      </div>

      <div className="mb-5 max-w-xs">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="requested">Requested</option>
          <option value="accepted">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="declined">Declined</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      {bookings.loading && <PageLoader />}
      {!bookings.loading && rows.length === 0 && <EmptyState title="No bookings match this filter" />}

      {rows.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="bg-ink-50 text-ink-500 text-left text-xs tracking-wide uppercase">
              <tr>
                <th className="px-5 py-3 font-medium">Job</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Professional</th>
                <th className="px-5 py-3 font-medium">Scheduled</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="divide-ink-100 divide-y">
              {rows.map((booking) => (
                <tr key={booking.id} className="hover:bg-ink-50/60">
                  <td className="px-5 py-3.5">
                    <p className="text-ink-950 font-medium">{booking.subject}</p>
                    <p className="text-ink-400 text-xs">{booking.reference}</p>
                  </td>
                  <td className="text-ink-700 px-5 py-3.5">{booking.client_name}</td>
                  <td className="px-5 py-3.5">
                    <p className="text-ink-800">{booking.professional_name}</p>
                    <p className="text-ink-400 text-xs">{booking.category_name}</p>
                  </td>
                  <td className="text-ink-700 px-5 py-3.5">{formatDateTime(booking.scheduled_for)}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={STATUS_TONE[booking.status] ?? 'neutral'}>{booking.status}</Badge>
                    {booking.status === 'completed' && booking.payment_status && (
                      <Badge
                        className="ml-1.5"
                        tone={booking.payment_status === 'paid' ? 'success' : 'warning'}
                      >
                        {booking.payment_status}
                      </Badge>
                    )}
                  </td>
                  <td className="text-ink-950 px-5 py-3.5 font-medium tabular-nums">
                    {money(
                      booking.total_cents ??
                        Math.round(booking.hourly_rate_cents * booking.estimated_hours),
                      booking.currency,
                    )}
                    <span className="text-ink-400 block text-xs font-normal">
                      {booking.total_cents !== null ? 'final' : 'estimate'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </AdminShell>
  );
}

const ACTION_TONE = (action: string) => {
  if (action.includes('fee') || action.includes('reprice')) return 'warning' as const;
  if (action.includes('onboard') || action.includes('create')) return 'success' as const;
  if (action.includes('suspend') || action.includes('rejected')) return 'danger' as const;
  return 'neutral' as const;
};

export function AdminAudit() {
  const audit = useAsync(() => api<{ events: AuditEvent[] }>('/admin/audit'));
  const [filter, setFilter] = useState('');

  const events = (audit.data?.events ?? []).filter(
    (event) =>
      !filter ||
      event.action.toLowerCase().includes(filter.toLowerCase()) ||
      event.summary.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <AdminShell
      title="Audit log"
      subtitle="Every administrative action, including fee changes and verification decisions."
    >
      <ErrorBanner error={audit.error} />

      <div className="mb-5 max-w-sm">
        <div className="relative">
          <Icons.search className="text-ink-400 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by action or description"
            aria-label="Filter audit log"
            className="field pl-9"
          />
        </div>
      </div>

      {audit.loading && <PageLoader />}
      {!audit.loading && events.length === 0 && <EmptyState title="No matching events" />}

      {events.length > 0 && (
        <Card className="divide-ink-100 divide-y">
          {events.map((event) => (
            <div key={event.id} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={ACTION_TONE(event.action)}>{event.action}</Badge>
                  <span className="text-ink-900 text-sm">{event.summary}</span>
                </div>
                <p className="text-ink-500 mt-1 text-xs">
                  {event.actor_email} · {event.entity_type}
                  {event.entity_id ? ` #${event.entity_id}` : ''}
                </p>
              </div>
              <span className="text-ink-400 shrink-0 text-xs" title={formatDateTime(event.created_at)}>
                {relativeTime(event.created_at)}
              </span>
            </div>
          ))}
        </Card>
      )}
    </AdminShell>
  );
}

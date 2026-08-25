import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatDate, hoursLabel, money } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { Booking } from '../../lib/types';
import { ErrorBanner, PageLoader } from '../../components/Layout';
import { Badge, EmptyState, LinkButton } from '../../components/ui';
import { Icons } from '../../components/icons';
import { ClientShell } from './ClientShell';

export function ClientInvoices() {
  const bookings = useAsync(() => api<{ bookings: Booking[] }>('/bookings?status=completed'));
  const rows = bookings.data?.bookings ?? [];
  const unpaid = rows.filter((row) => row.paymentStatus !== 'paid');
  const total = rows.reduce((sum, row) => sum + (row.totalCents ?? row.estimatedTotalCents), 0);

  return (
    <ClientShell
      title="Invoices"
      subtitle="Completed jobs, billed at the hourly rate locked in when you booked."
      actions={
        unpaid.length > 0 ? (
          <p className="text-ink-500 text-sm">{unpaid.length} unpaid</p>
        ) : undefined
      }
    >
      <ErrorBanner error={bookings.error} />
      {bookings.loading && <PageLoader />}
      {!bookings.loading && rows.length === 0 && (
        <EmptyState
          title="No invoices yet"
          description="When a professional marks a job complete, the invoice appears here."
          action={<LinkButton to="/browse">Find a professional</LinkButton>}
        />
      )}
      {rows.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-ink-50 text-ink-500 text-left text-xs tracking-wide uppercase">
              <tr>
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium">Professional</th>
                <th className="px-5 py-3 font-medium">Hours</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-ink-100 divide-y">
              {rows.map((booking) => (
                <tr key={booking.id} className="hover:bg-ink-50/60">
                  <td className="px-5 py-3.5">
                    <Link to={`/account/bookings/${booking.id}`} className="text-ink-950 font-medium hover:underline">
                      {booking.reference}
                    </Link>
                    <p className="text-ink-500 text-xs">{booking.subject}</p>
                  </td>
                  <td className="text-ink-700 px-5 py-3.5">{booking.professional.name}</td>
                  <td className="text-ink-700 px-5 py-3.5">
                    {hoursLabel(booking.loggedHours ?? booking.estimatedHours)}
                  </td>
                  <td className="text-ink-950 px-5 py-3.5 font-medium tabular-nums">
                    {money(booking.totalCents ?? booking.estimatedTotalCents, booking.currency)}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tone={booking.paymentStatus === 'paid' ? 'success' : 'warning'}>
                      {booking.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                    </Badge>
                    <p className="text-ink-400 mt-1 text-xs">{formatDate(booking.scheduledFor)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-ink-100 text-ink-700 flex items-center justify-between border-t px-5 py-3 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <Icons.card className="size-4" /> {rows.length} completed jobs
            </span>
            <span className="text-ink-950 font-semibold tabular-nums">{money(total)}</span>
          </div>
        </div>
      )}
    </ClientShell>
  );
}

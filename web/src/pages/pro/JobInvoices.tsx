import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatDate, hoursLabel, money } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { Booking } from '../../lib/types';
import { ErrorBanner, PageLoader } from '../../components/Layout';
import { Badge, EmptyState, LinkButton } from '../../components/ui';
import { ProShell } from './ProDashboard';

export function ProJobInvoices() {
  const bookings = useAsync(() => api<{ bookings: Booking[] }>('/bookings?status=completed'));
  const rows = bookings.data?.bookings ?? [];
  const billed = rows.reduce((sum, row) => sum + (row.totalCents ?? 0), 0);
  const unpaid = rows.filter((row) => row.paymentStatus !== 'paid');

  return (
    <ProShell
      title="Job invoices"
      subtitle="Completed work billed at the rate each job was booked at. Membership invoices live under Membership."
    >
      <ErrorBanner error={bookings.error} />
      {bookings.loading && <PageLoader />}
      {!bookings.loading && rows.length === 0 && (
        <EmptyState
          title="No job invoices yet"
          description="When you mark a booking complete, the invoice is generated from the logged hours."
          action={
            <LinkButton to="/dashboard/bookings" variant="secondary">
              Open bookings
            </LinkButton>
          }
        />
      )}
      {rows.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="bg-ink-50 text-ink-500 text-left text-xs tracking-wide uppercase">
              <tr>
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Hours</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-ink-100 divide-y">
              {rows.map((booking) => (
                <tr key={booking.id} className="hover:bg-ink-50/60">
                  <td className="px-5 py-3.5">
                    <Link
                      to={`/dashboard/bookings/${booking.id}`}
                      className="text-ink-950 font-medium hover:underline"
                    >
                      {booking.reference}
                    </Link>
                    <p className="text-ink-500 text-xs">{booking.subject}</p>
                  </td>
                  <td className="text-ink-700 px-5 py-3.5">{booking.client.name}</td>
                  <td className="text-ink-700 px-5 py-3.5">
                    {hoursLabel(booking.loggedHours ?? booking.estimatedHours)}
                    <p className="text-ink-400 text-xs">{formatDate(booking.scheduledFor)}</p>
                  </td>
                  <td className="text-ink-950 px-5 py-3.5 font-medium tabular-nums">
                    {money(booking.totalCents ?? booking.estimatedTotalCents, booking.currency)}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tone={booking.paymentStatus === 'paid' ? 'success' : 'warning'}>
                      {booking.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-ink-100 flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3 text-sm">
            <p className="text-ink-500">
              {rows.length} jobs · {unpaid.length} awaiting payment
            </p>
            <p className="text-ink-950 font-semibold tabular-nums">{money(billed)} billed</p>
          </div>
        </div>
      )}
    </ProShell>
  );
}

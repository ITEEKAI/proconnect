import type { Booking } from '../lib/types';
import { formatDate, hoursLabel, money } from '../lib/format';
import { Badge, Button, Card } from './ui';
import { STATUS_LABEL, STATUS_TONE } from './BookingList';

export function JobInvoice({ booking }: { booking: Booking }) {
  if (booking.status !== 'completed') return null;

  const hours = booking.loggedHours ?? booking.estimatedHours;
  const labour = Math.round(booking.hourlyRateCents * hours);
  const total = booking.totalCents ?? labour + booking.calloutFeeCents;

  function printInvoice() {
    window.print();
  }

  return (
    <Card className="job-invoice p-6 print:border-0 print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-ink-500 text-xs font-medium tracking-wide uppercase">Job invoice</p>
          <h3 className="text-ink-950 mt-1 text-lg font-semibold">{booking.reference}</h3>
          <p className="text-ink-500 mt-0.5 text-sm">{booking.subject}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[booking.status]}>{STATUS_LABEL[booking.status]}</Badge>
          <Badge tone={booking.paymentStatus === 'paid' ? 'success' : 'warning'}>
            {booking.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
          </Badge>
          <Button size="sm" variant="secondary" className="print:hidden" onClick={printInvoice}>
            Print invoice
          </Button>
        </div>
      </div>

      <dl className="text-ink-600 mt-5 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-ink-400 text-xs">Client</dt>
          <dd className="font-medium">{booking.client.name}</dd>
        </div>
        <div>
          <dt className="text-ink-400 text-xs">Professional</dt>
          <dd className="font-medium">{booking.professional.name}</dd>
          <dd className="text-ink-500 text-xs">{booking.professional.category}</dd>
        </div>
        <div>
          <dt className="text-ink-400 text-xs">Completed</dt>
          <dd className="font-medium">{formatDate(booking.scheduledFor)}</dd>
        </div>
      </dl>

      <table className="mt-5 w-full text-sm">
        <thead className="text-ink-500 text-left text-xs tracking-wide uppercase">
          <tr className="border-ink-100 border-b">
            <th className="py-2 font-medium">Item</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="text-ink-800">
          <tr className="border-ink-100 border-b">
            <td className="py-2.5">
              {hoursLabel(hours)} × {money(booking.hourlyRateCents, booking.currency)}/hr
            </td>
            <td className="py-2.5 text-right tabular-nums">{money(labour, booking.currency)}</td>
          </tr>
          {booking.calloutFeeCents > 0 && (
            <tr className="border-ink-100 border-b">
              <td className="py-2.5">Call-out fee</td>
              <td className="py-2.5 text-right tabular-nums">
                {money(booking.calloutFeeCents, booking.currency)}
              </td>
            </tr>
          )}
          <tr>
            <td className="text-ink-950 py-3 font-semibold">Total</td>
            <td className="text-ink-950 py-3 text-right font-semibold tabular-nums">
              {money(total, booking.currency)}
            </td>
          </tr>
        </tbody>
      </table>
      {booking.professionalNote && (
        <p className="text-ink-600 mt-2 text-sm">
          <span className="font-medium">Note:</span> {booking.professionalNote}
        </p>
      )}
    </Card>
  );
}

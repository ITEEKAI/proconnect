import { Link } from 'react-router-dom';
import type { Booking, BookingStatus } from '../lib/types';
import { formatDateTime, hoursLabel, money } from '../lib/format';
import { Avatar, Badge, Button, cx } from './ui';

export const STATUS_TONE: Record<BookingStatus, 'neutral' | 'brand' | 'success' | 'warning' | 'danger'> = {
  requested: 'warning',
  accepted: 'brand',
  completed: 'success',
  declined: 'danger',
  cancelled: 'neutral',
};

export const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: 'Awaiting response',
  accepted: 'Confirmed',
  completed: 'Completed',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

interface BookingRowProps {
  booking: Booking;
  /** Whose name to show on the row. */
  perspective: 'client' | 'professional';
  actions?: React.ReactNode;
}

export function BookingRow({ booking, perspective, actions }: BookingRowProps) {
  const counterpartName =
    perspective === 'client' ? booking.professional.name : booking.client.name;
  const counterpartMeta =
    perspective === 'client' ? booking.professional.category : 'Client';

  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3.5">
          <Avatar name={counterpartName} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-ink-950 font-semibold">{booking.subject}</p>
              <Badge tone={STATUS_TONE[booking.status]}>{STATUS_LABEL[booking.status]}</Badge>
              {booking.status === 'completed' && (
                <Badge tone={booking.paymentStatus === 'paid' ? 'success' : 'warning'}>
                  {booking.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                </Badge>
              )}
            </div>
            <p className="text-ink-500 mt-0.5 text-sm">
              {perspective === 'client' ? (
                <Link to={`/pro/${booking.professional.slug}`} className="hover:text-brand-700 font-medium">
                  {counterpartName}
                </Link>
              ) : (
                <span className="font-medium">{counterpartName}</span>
              )}{' '}
              · {counterpartMeta} · {booking.reference}
            </p>
            {booking.details && (
              <p className="text-ink-600 mt-2 line-clamp-2 max-w-2xl text-sm">{booking.details}</p>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-ink-950 font-semibold tabular-nums">
            {money(booking.totalCents ?? booking.estimatedTotalCents, booking.currency)}
          </p>
          <p className="text-ink-500 text-xs">
            {booking.totalCents !== null ? 'final' : 'estimate'} ·{' '}
            {money(booking.hourlyRateCents, booking.currency)}/hr
          </p>
        </div>
      </div>

      <dl className="text-ink-600 border-ink-100 mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t pt-4 text-sm sm:grid-cols-4">
        <Detail label="Scheduled" value={formatDateTime(booking.scheduledFor)} />
        <Detail label="Estimated" value={hoursLabel(booking.estimatedHours)} />
        <Detail
          label="Logged"
          value={booking.loggedHours !== null ? hoursLabel(booking.loggedHours) : "—"}
        />
        <Detail label="Requested" value={formatDateTime(booking.createdAt)} />
      </dl>

      {booking.professionalNote && (
        <p className="bg-ink-50 text-ink-700 mt-3 rounded-lg px-3.5 py-2.5 text-sm">
          <span className="font-medium">Note:</span> {booking.professionalNote}
        </p>
      )}

      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </li>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-400 text-xs">{label}</dt>
      <dd className="text-ink-800 font-medium">{value}</dd>
    </div>
  );
}

export function StatusFilterBar({
  value,
  onChange,
  counts,
}: {
  value: string;
  onChange: (value: string) => void;
  counts: Record<string, number>;
}) {
  const options = [
    { id: 'all', label: 'All' },
    { id: 'requested', label: 'Requests' },
    { id: 'accepted', label: 'Confirmed' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
    { id: 'declined', label: 'Declined' },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Button
          key={option.id}
          size="sm"
          variant={value === option.id ? 'primary' : 'secondary'}
          onClick={() => onChange(option.id)}
        >
          {option.label}
          <span className={cx('ml-1 tabular-nums', value === option.id ? 'text-white/70' : 'text-ink-400')}>
            {counts[option.id] ?? 0}
          </span>
        </Button>
      ))}
    </div>
  );
}

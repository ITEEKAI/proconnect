import { useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { money } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { Booking } from '../../lib/types';
import { BookingRow, StatusFilterBar } from '../../components/BookingList';
import { ErrorBanner, PageLoader } from '../../components/Layout';
import { Icons } from '../../components/icons';
import {
  Alert,
  Button,
  EmptyState,
  LinkButton,
  Modal,
  Stat,
  TextArea,
  cx,
} from '../../components/ui';
import { ClientShell } from './ClientShell';

export function Account() {
  const { user } = useAuth();
  const bookings = useAsync(() => api<{ bookings: Booking[] }>('/bookings'));
  const [filter, setFilter] = useState('all');
  const [reviewing, setReviewing] = useState<Booking | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const counts = useMemo(() => {
    const all = bookings.data?.bookings ?? [];
    return {
      all: all.length,
      requested: all.filter((b) => b.status === 'requested').length,
      accepted: all.filter((b) => b.status === 'accepted').length,
      completed: all.filter((b) => b.status === 'completed').length,
      cancelled: all.filter((b) => b.status === 'cancelled').length,
      declined: all.filter((b) => b.status === 'declined').length,
    };
  }, [bookings.data]);

  const visible = (bookings.data?.bookings ?? []).filter(
    (b) => filter === 'all' || b.status === filter,
  );

  const spend = (bookings.data?.bookings ?? [])
    .filter((b) => b.status === 'completed')
    .reduce((total, b) => total + (b.totalCents ?? 0), 0);

  async function cancel(booking: Booking) {
    setBusyId(booking.id);
    try {
      await api(`/bookings/${booking.id}/cancel`, { method: 'POST' });
      bookings.reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ClientShell
      title="My bookings"
      subtitle={`Signed in as ${user?.fullName ?? ''}`}
      actions={
        <LinkButton to="/browse">
          <Icons.search className="size-4" /> Find a professional
        </LinkButton>
      }
    >
      <ErrorBanner error={bookings.error} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Open requests"
          value={String(counts.requested + counts.accepted)}
          sub="Awaiting a reply or scheduled"
          tone="brand"
          icon={<Icons.clock className="size-4" />}
        />
        <Stat
          label="Completed jobs"
          value={String(counts.completed)}
          sub="Ready to review"
          tone="success"
          icon={<Icons.checkCircle className="size-4" />}
        />
        <Stat
          label="Total spend"
          value={money(spend)}
          sub="Across completed bookings"
          tone="neutral"
          icon={<Icons.card className="size-4" />}
        />
      </div>

      <div className="mb-5">
        <StatusFilterBar value={filter} onChange={setFilter} counts={counts} />
      </div>

      {bookings.loading && <PageLoader />}

      {!bookings.loading && visible.length === 0 && (
        <EmptyState
          title="Nothing here yet"
          description="When you request a professional, the job appears here with its estimate and status."
          action={<LinkButton to="/browse">Browse professionals</LinkButton>}
        />
      )}

      <ul className="space-y-4">
        {visible.map((booking) => (
          <BookingRow
            key={booking.id}
            booking={booking}
            perspective="client"
            actions={
              <>
                <LinkButton size="sm" variant="ghost" to={`/account/bookings/${booking.id}`}>
                  Open
                </LinkButton>
                {booking.status === 'completed' && booking.paymentStatus !== 'paid' && (
                  <LinkButton size="sm" to={`/account/bookings/${booking.id}`}>
                    Record payment
                  </LinkButton>
                )}
                {booking.status === 'completed' && (
                  <Button size="sm" onClick={() => setReviewing(booking)}>
                    Leave a review
                  </Button>
                )}
                {(booking.status === 'requested' || booking.status === 'accepted') && (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busyId === booking.id}
                    onClick={() => cancel(booking)}
                  >
                    Cancel booking
                  </Button>
                )}
                <LinkButton size="sm" variant="ghost" to={`/pro/${booking.professional.slug}`}>
                  View profile
                </LinkButton>
              </>
            }
          />
        ))}
      </ul>

      <ReviewModal booking={reviewing} onClose={() => setReviewing(null)} onDone={() => bookings.reload()} />
    </ClientShell>
  );
}

function ReviewModal({
  booking,
  onClose,
  onDone,
}: {
  booking: Booking | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!booking) return null;

  async function submit() {
    if (!booking) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/bookings/${booking.id}/review`, { body: { rating, comment } });
      onDone();
      onClose();
      setComment('');
      setRating(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your review.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Review ${booking.professional.name}`}
      description={booking.subject}
      width="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Publish review
          </Button>
        </>
      }
    >
      {error && (
        <div className="mb-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}
      <p className="label-text">How did it go?</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            aria-label={`${value} star${value === 1 ? '' : 's'}`}
            className="p-0.5"
          >
            <svg
              viewBox="0 0 20 20"
              className={cx(
                'size-8 transition',
                value <= rating ? 'text-brand-500' : 'text-ink-200',
              )}
              fill="currentColor"
            >
              <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L10 14.77l-5.2 2.73.99-5.78-4.21-4.1 5.82-.85L10 1.5z" />
            </svg>
          </button>
        ))}
      </div>
      <TextArea
        label="Your review"
        wrapperClassName="mt-5"
        placeholder="What was the work, and how did they handle it?"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
    </Modal>
  );
}

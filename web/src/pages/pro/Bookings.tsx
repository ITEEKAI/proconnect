import { useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { hoursLabel, money } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { Booking } from '../../lib/types';
import { BookingRow, StatusFilterBar } from '../../components/BookingList';
import { ErrorBanner, PageLoader } from '../../components/Layout';
import { Alert, Button, EmptyState, LinkButton, Modal, TextArea, TextInput } from '../../components/ui';
import { ProShell } from './ProDashboard';

export function ProBookings() {
  const bookings = useAsync(() => api<{ bookings: Booking[] }>('/bookings'));
  const [filter, setFilter] = useState('all');
  const [completing, setCompleting] = useState<Booking | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const visible = (bookings.data?.bookings ?? []).filter((b) => filter === 'all' || b.status === filter);

  async function setStatus(booking: Booking, status: 'accepted' | 'declined') {
    setBusyId(booking.id);
    setError(null);
    try {
      await api(`/bookings/${booking.id}/status`, { body: { status } });
      bookings.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the booking.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ProShell title="Bookings" subtitle="Accept work, log the hours you spent, and invoice at your booked rate.">
      <ErrorBanner error={bookings.error} />
      {error && (
        <div className="mb-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      <div className="mb-5">
        <StatusFilterBar value={filter} onChange={setFilter} counts={counts} />
      </div>

      {bookings.loading && <PageLoader />}

      {!bookings.loading && visible.length === 0 && (
        <EmptyState
          title="No bookings in this view"
          description="New enquiries land in Requests as soon as a client sends them."
        />
      )}

      <ul className="space-y-4">
        {visible.map((booking) => (
          <BookingRow
            key={booking.id}
            booking={booking}
            perspective="professional"
            actions={
              <>
                <LinkButton size="sm" variant="ghost" to={`/dashboard/bookings/${booking.id}`}>
                  Open
                </LinkButton>
                {booking.status === 'requested' && (
                  <>
                    <Button
                      size="sm"
                      loading={busyId === booking.id}
                      onClick={() => setStatus(booking, 'accepted')}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busyId === booking.id}
                      onClick={() => setStatus(booking, 'declined')}
                    >
                      Decline
                    </Button>
                  </>
                )}
                {booking.status === 'accepted' && (
                  <Button size="sm" onClick={() => setCompleting(booking)}>
                    Mark complete and log hours
                  </Button>
                )}
              </>
            }
          />
        ))}
      </ul>

      <CompleteModal
        booking={completing}
        onClose={() => setCompleting(null)}
        onDone={() => bookings.reload()}
      />
    </ProShell>
  );
}

function CompleteModal({
  booking,
  onClose,
  onDone,
}: {
  booking: Booking | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loggedHours = Number(hours || booking?.estimatedHours || 0);
  const total = booking
    ? Math.round(booking.hourlyRateCents * loggedHours) + booking.calloutFeeCents
    : 0;

  if (!booking) return null;

  async function submit() {
    if (!booking) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/bookings/${booking.id}/status`, {
        body: { status: 'completed', loggedHours, note: note || undefined },
      });
      onDone();
      onClose();
      setHours('');
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete the booking.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Complete this job"
      description={booking.subject}
      width="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Complete and invoice
          </Button>
        </>
      }
    >
      {error && (
        <div className="mb-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}
      <TextInput
        label="Hours actually worked"
        type="number"
        min={0}
        step="0.25"
        placeholder={String(booking.estimatedHours)}
        hint={`The client estimated ${hoursLabel(booking.estimatedHours)}.`}
        value={hours}
        onChange={(e) => setHours(e.target.value)}
      />
      <TextArea
        label="Note for the client"
        wrapperClassName="mt-4"
        placeholder="Anything they should know about the work or the invoice."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className="bg-ink-50 border-ink-200 mt-5 rounded-xl border p-4">
        <dl className="text-ink-700 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt>
              {hoursLabel(loggedHours)} × {money(booking.hourlyRateCents, booking.currency)}
            </dt>
            <dd className="tabular-nums">
              {money(Math.round(booking.hourlyRateCents * loggedHours), booking.currency)}
            </dd>
          </div>
          {booking.calloutFeeCents > 0 && (
            <div className="flex justify-between">
              <dt>Call-out fee</dt>
              <dd className="tabular-nums">{money(booking.calloutFeeCents, booking.currency)}</dd>
            </div>
          )}
          <div className="border-ink-200 text-ink-950 flex justify-between border-t pt-2 font-semibold">
            <dt>Total to invoice</dt>
            <dd className="tabular-nums">{money(total, booking.currency)}</dd>
          </div>
        </dl>
        <p className="text-ink-500 mt-2 text-xs">
          Billed at the rate this job was booked at, not your current rate.
        </p>
      </div>
    </Modal>
  );
}

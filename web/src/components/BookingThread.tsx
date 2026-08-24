import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDateTime, hoursLabel, money } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import type { Booking, BookingMessage } from '../lib/types';
import { STATUS_LABEL, STATUS_TONE } from './BookingList';
import { Icons } from './icons';
import { Alert, Avatar, Badge, Button, Card, TextArea, TextInput } from './ui';

export function BookingThread({
  bookingId,
  backTo,
}: {
  bookingId: number;
  backTo: string;
}) {
  const { user } = useAuth();
  const booking = useAsync(() => api<{ booking: Booking }>(`/bookings/${bookingId}`), [bookingId]);
  const thread = useAsync(
    () => api<{ messages: BookingMessage[] }>(`/bookings/${bookingId}/messages`),
    [bookingId],
  );
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');

  const data = booking.data?.booking;
  const messages = thread.data?.messages ?? [];
  const isClient = user?.role === 'client';
  const isPro = user?.role === 'professional';

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/bookings/${bookingId}/messages`, { body: { body: draft.trim() } });
      setDraft('');
      thread.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that message.');
    } finally {
      setBusy(false);
    }
  }

  async function act(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      await api(`/bookings/${bookingId}${path}`, { body: body ?? {} });
      booking.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this booking.');
    } finally {
      setBusy(false);
    }
  }

  if (booking.loading) {
    return <p className="text-ink-500 py-12 text-center text-sm">Loading booking…</p>;
  }
  if (!data) {
    return (
      <Alert tone="danger">
        {booking.error?.message ?? 'That booking could not be found.'}{' '}
        <Link to={backTo} className="font-medium underline">
          Back
        </Link>
      </Alert>
    );
  }

  const total = data.totalCents ?? data.estimatedTotalCents;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-ink-950 text-xl font-semibold">{data.subject}</h2>
                <Badge tone={STATUS_TONE[data.status]}>{STATUS_LABEL[data.status]}</Badge>
                {data.status === 'completed' && (
                  <Badge tone={data.paymentStatus === 'paid' ? 'success' : 'warning'}>
                    {data.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                  </Badge>
                )}
              </div>
              <p className="text-ink-500 mt-1 text-sm">
                {data.reference} · {isClient ? data.professional.name : data.client.name}
              </p>
            </div>
            <p className="text-ink-950 text-lg font-semibold tabular-nums">{money(total, data.currency)}</p>
          </div>
          {data.details && <p className="text-ink-700 mt-4 text-sm leading-relaxed">{data.details}</p>}
          <dl className="text-ink-600 border-ink-100 mt-5 grid grid-cols-2 gap-3 border-t pt-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-ink-400 text-xs">Scheduled</dt>
              <dd className="font-medium">{formatDateTime(data.scheduledFor)}</dd>
            </div>
            <div>
              <dt className="text-ink-400 text-xs">Estimated</dt>
              <dd className="font-medium">{hoursLabel(data.estimatedHours)}</dd>
            </div>
            <div>
              <dt className="text-ink-400 text-xs">Logged</dt>
              <dd className="font-medium">{data.loggedHours != null ? hoursLabel(data.loggedHours) : '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-400 text-xs">Rate</dt>
              <dd className="font-medium">{money(data.hourlyRateCents, data.currency)}/hr</dd>
            </div>
          </dl>
          {data.professionalNote && (
            <p className="bg-ink-50 text-ink-700 mt-4 rounded-lg px-3.5 py-2.5 text-sm">
              <span className="font-medium">Note:</span> {data.professionalNote}
            </p>
          )}
        </Card>

        <Card className="flex min-h-[22rem] flex-col p-0">
          <div className="border-ink-100 border-b px-5 py-3">
            <p className="text-ink-950 text-sm font-semibold">Messages</p>
          </div>
          <ul className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {messages.length === 0 && (
              <li className="text-ink-500 py-8 text-center text-sm">No messages yet. Introduce the job here.</li>
            )}
            {messages.map((message) => {
              const mine = message.authorId === user?.id;
              return (
                <li key={message.id} className={cxBubble(mine)}>
                  <div className="mb-1 flex items-center gap-2">
                    <Avatar name={message.authorName} size="sm" />
                    <span className="text-ink-900 text-xs font-medium">{message.authorName}</span>
                    <span className="text-ink-400 text-[11px]">{formatDateTime(message.createdAt)}</span>
                  </div>
                  <p className="text-ink-800 text-sm leading-relaxed whitespace-pre-wrap">{message.body}</p>
                </li>
              );
            })}
          </ul>
          <form onSubmit={send} className="border-ink-100 border-t p-4">
            <TextArea
              placeholder="Write a message…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-20"
            />
            <div className="mt-3 flex justify-end">
              <Button type="submit" size="sm" loading={busy} disabled={!draft.trim()}>
                Send
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <aside className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <Card className="p-5">
          <p className="text-ink-500 text-xs font-medium tracking-wide uppercase">Actions</p>
          <div className="mt-4 space-y-2">
            {isPro && data.status === 'requested' && (
              <>
                <Button className="w-full" loading={busy} onClick={() => void act('/status', { status: 'accepted' })}>
                  Accept booking
                </Button>
                <Button
                  className="w-full"
                  variant="secondary"
                  loading={busy}
                  onClick={() => void act('/status', { status: 'declined' })}
                >
                  Decline
                </Button>
              </>
            )}
            {isPro && data.status === 'accepted' && (
              <div className="space-y-3">
                <TextInput
                  label="Hours actually worked"
                  type="number"
                  min={0}
                  step="0.25"
                  placeholder={String(data.estimatedHours)}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
                <TextArea
                  label="Note for the client"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button
                  className="w-full"
                  loading={busy}
                  onClick={() =>
                    void act('/status', {
                      status: 'completed',
                      loggedHours: Number(hours || data.estimatedHours),
                      note: note || undefined,
                    })
                  }
                >
                  Mark complete
                </Button>
              </div>
            )}
            {isClient && (data.status === 'requested' || data.status === 'accepted') && (
              <Button
                className="w-full"
                variant="secondary"
                loading={busy}
                onClick={() => void act('/cancel')}
              >
                Cancel booking
              </Button>
            )}
            {isClient && data.status === 'completed' && data.paymentStatus !== 'paid' && (
              <Button className="w-full" loading={busy} onClick={() => void act('/pay')}>
                Record payment · {money(total, data.currency)}
              </Button>
            )}
            {isClient && data.status === 'completed' && data.paymentStatus === 'paid' && (
              <p className="text-sm font-medium text-emerald-700">Payment recorded.</p>
            )}
            {isClient && (
              <Link
                to={`/pro/${data.professional.slug}`}
                className="text-brand-700 inline-flex items-center gap-1 text-sm font-medium"
              >
                View profile <Icons.arrowRight className="size-3.5" />
              </Link>
            )}
          </div>
        </Card>
      </aside>
    </div>
  );
}

function cxBubble(mine: boolean) {
  return mine ? 'rounded-xl bg-brand-50 px-3 py-2.5' : 'rounded-xl bg-ink-50 px-3 py-2.5';
}

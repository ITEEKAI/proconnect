import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate, hoursLabel, locationLabel, money, pluralise, scheduledTimeFitsHours } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { AvailabilitySlot, Booking, Professional, Review } from '../../lib/types';
import { Icons } from '../../components/icons';
import { PageLoader } from '../../components/Layout';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  Stars,
  TextArea,
  TextInput,
  cx,
} from '../../components/ui';

interface ProfileResponse {
  professional: Professional;
  reviews: Review[];
  availability: AvailabilitySlot[];
}

export function ProfilePage() {
  const { slug = '' } = useParams();
  const profile = useAsync(() => api<ProfileResponse>(`/directory/professionals/${slug}`), [slug]);
  const [bookingOpen, setBookingOpen] = useState(false);

  if (profile.loading) return <PageLoader />;
  if (!profile.data) {
    return (
      <div className="container-page py-20">
        <EmptyState
          title="We couldn’t find that profile"
          description="It may have been unpublished while our team re-checks their credentials."
          action={
            <Link to="/browse" className="text-brand-700 text-sm font-medium">
              Back to search
            </Link>
          }
        />
      </div>
    );
  }

  const { professional: pro, reviews, availability } = profile.data;

  return (
    <>
      <div className="border-ink-200/70 border-b bg-white">
        <div className="container-page py-10">
          <nav className="text-ink-500 mb-6 flex items-center gap-2 text-sm">
            <Link to="/browse" className="hover:text-brand-700">
              Professionals
            </Link>
            <span>/</span>
            <Link to={`/browse?category=${pro.category.slug}`} className="hover:text-brand-700">
              {pro.category.name}
            </Link>
            <span>/</span>
            <span className="text-ink-800">{pro.displayName}</span>
          </nav>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <Avatar name={pro.displayName} size="xl" src={pro.avatarUrl} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-ink-950 text-3xl font-semibold tracking-tight">{pro.displayName}</h1>
                {pro.verificationStatus === 'verified' && (
                  <Badge tone="success">
                    <Icons.shieldCheck className="size-3" /> Verified
                  </Badge>
                )}
                {pro.pricing.freeConsultation && <Badge tone="brand">Free first consultation</Badge>}
              </div>
              {pro.businessName && <p className="text-ink-600 mt-1 font-medium">{pro.businessName}</p>}
              <p className="text-ink-700 mt-3 max-w-2xl text-lg leading-relaxed">{pro.headline}</p>

              <div className="text-ink-600 mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <Stars value={pro.rating.average} count={pro.rating.count} />
                <span className="inline-flex items-center gap-1.5">
                  <Icons.pin className="size-4" /> {locationLabel(pro.location)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Icons.briefcase className="size-4" /> {pluralise(pro.yearsExperience, 'year')} experience
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Icons.clock className="size-4" /> Usually replies in {pro.responseTimeHours}h
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-8">
          <Section title="About">
            <p className="text-ink-700 leading-relaxed whitespace-pre-line">{pro.bio || 'No bio yet.'}</p>
          </Section>

          {pro.specialties.length > 0 && (
            <Section title="Specialisms">
              <div className="flex flex-wrap gap-2">
                {pro.specialties.map((item) => (
                  <span
                    key={item}
                    className="border-ink-200 text-ink-700 rounded-lg border bg-white px-3 py-1.5 text-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {pro.credentials.length > 0 && (
            <Section title="Credentials and accreditations">
              <ul className="grid gap-3 sm:grid-cols-2">
                {pro.credentials.map((credential) => (
                  <li key={credential.label} className="card flex items-start gap-3 p-4">
                    <span className="mt-0.5 rounded-lg bg-emerald-50 p-1.5 text-emerald-600">
                      <Icons.shieldCheck className="size-4" />
                    </span>
                    <div>
                      <p className="text-ink-900 text-sm font-medium">{credential.label}</p>
                      <p className="text-ink-500 text-xs">
                        {credential.issuer}
                        {credential.year ? ` · ${credential.year}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <div className="grid gap-8 sm:grid-cols-2">
            {pro.serviceAreas.length > 0 && (
              <Section title="Areas covered">
                <ul className="text-ink-700 space-y-1.5 text-sm">
                  {pro.serviceAreas.map((area) => (
                    <li key={area} className="flex items-center gap-2">
                      <Icons.pin className="text-ink-400 size-3.5" /> {area}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            <Section title="Languages">
              <ul className="text-ink-700 space-y-1.5 text-sm">
                {pro.languages.map((language) => (
                  <li key={language} className="flex items-center gap-2">
                    <Icons.message className="text-ink-400 size-3.5" /> {language}
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <Section title="Typical hours">
            {availability.length === 0 ? (
              <p className="text-ink-500 text-sm">Hours are arranged per booking.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {availability.map((slot) => (
                  <li
                    key={slot.weekday}
                    className="border-ink-200 text-ink-700 flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{slot.weekdayLabel}</span>
                    <span className="tabular-nums">
                      {slot.start} – {slot.end}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={`Reviews (${pro.rating.count})`}>
            {reviews.length === 0 ? (
              <p className="text-ink-500 text-sm">No reviews yet — you could be the first.</p>
            ) : (
              <ul className="space-y-4">
                {reviews.map((review) => (
                  <li key={review.id} className="card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={review.author} size="sm" />
                        <div>
                          <p className="text-ink-900 text-sm font-medium">{review.author}</p>
                          <Stars value={review.rating} size="sm" />
                        </div>
                      </div>
                      <span className="text-ink-400 shrink-0 text-xs">{formatDate(review.createdAt)}</span>
                    </div>
                    {review.comment && (
                      <p className="text-ink-700 mt-3 text-sm leading-relaxed">{review.comment}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* Booking rail */}
        <aside>
          <Card className="lg:sticky lg:top-24">
            <div className="border-ink-100 border-b px-6 py-5">
              <p className="text-ink-500 text-sm">Hourly rate</p>
              <p className="text-ink-950 mt-1 text-3xl font-semibold tracking-tight">
                {money(pro.pricing.hourlyRateCents, pro.pricing.currency)}
                <span className="text-ink-500 text-base font-normal"> /hour</span>
              </p>
              <ul className="text-ink-600 mt-4 space-y-2 text-sm">
                <RateRow label="Minimum engagement" value={hoursLabel(pro.pricing.minimumHours)} />
                {pro.pricing.calloutFeeCents > 0 && (
                  <RateRow
                    label="Call-out fee"
                    value={money(pro.pricing.calloutFeeCents, pro.pricing.currency)}
                  />
                )}
                <RateRow
                  label="First consultation"
                  value={pro.pricing.freeConsultation ? 'Free' : 'Charged hourly'}
                  highlight={pro.pricing.freeConsultation}
                />
              </ul>
            </div>
            <div className="px-6 py-5">
              <Button className="w-full" size="lg" onClick={() => setBookingOpen(true)}>
                Request a booking
              </Button>
              <p className="text-ink-500 mt-3 text-center text-xs">
                You will not be charged until the work is confirmed.
              </p>
            </div>
          </Card>
        </aside>
      </div>

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        professional={pro}
        availability={availability}
        onBooked={() => profile.reload()}
      />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-ink-950 mb-4 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function RateRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <li className="flex items-center justify-between">
      <span>{label}</span>
      <span className={cx('font-medium', highlight ? 'text-emerald-600' : 'text-ink-900')}>{value}</span>
    </li>
  );
}

function defaultSchedule(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(10, 0, 0, 0);
  return date.toISOString().slice(0, 16);
}

function BookingModal({
  open,
  onClose,
  professional,
  availability,
  onBooked,
}: {
  open: boolean;
  onClose: () => void;
  professional: Professional;
  availability: AvailabilitySlot[];
  onBooked: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [scheduledFor, setScheduledFor] = useState(defaultSchedule());
  const [hours, setHours] = useState(String(Math.max(1, professional.pricing.minimumHours)));
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<Booking | null>(null);

  const estimate =
    Math.round(professional.pricing.hourlyRateCents * (Number(hours) || 0)) +
    professional.pricing.calloutFeeCents;
  const withinHours = scheduledTimeFitsHours(availability, scheduledFor);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const result = await api<{ booking: Booking }>('/bookings', {
        body: {
          professionalId: professional.id,
          subject,
          details,
          scheduledFor,
          estimatedHours: Number(hours),
        },
      });
      setCreated(result.booking);
      onBooked();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(500, 'error', 'Something went wrong.'));
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Sign in to send a request"
        description={`Create a free account to book ${professional.displayName}.`}
        width="sm"
      >
        <p className="text-ink-600 text-sm leading-relaxed">
          Your account keeps your bookings, estimates and invoices in one place, and lets you review the
          work afterwards.
        </p>
        <div className="mt-5 flex gap-3">
          <Button className="flex-1" onClick={() => navigate(`/signup?next=/pro/${professional.slug}`)}>
            Create an account
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => navigate(`/login?next=/pro/${professional.slug}`)}
          >
            Sign in
          </Button>
        </div>
      </Modal>
    );
  }

  if (user.role !== 'client') {
    return (
      <Modal open={open} onClose={onClose} title="Client accounts only" width="sm">
        <p className="text-ink-600 text-sm">
          You are signed in as a {user.role}. Bookings can only be created from a client account.
        </p>
      </Modal>
    );
  }

  if (created) {
    return (
      <Modal
        open={open}
        onClose={() => {
          setCreated(null);
          onClose();
        }}
        title="Request sent"
        description={`Reference ${created.reference}`}
        width="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => navigate('/account')}>
              View my bookings
            </Button>
            <Button
              onClick={() => {
                setCreated(null);
                onClose();
              }}
            >
              Done
            </Button>
          </>
        }
      >
        <Alert tone="success" title={`${professional.displayName} has your request`}>
          They usually reply within {professional.responseTimeHours} hours. Your estimate of{' '}
          <strong>{money(created.estimatedTotalCents, created.currency)}</strong> is locked to the{' '}
          {money(created.hourlyRateCents, created.currency)}/hour rate you booked at.
        </Alert>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Request ${professional.displayName}`}
      description={`${money(professional.pricing.hourlyRateCents, professional.pricing.currency)} per hour · ${professional.pricing.minimumHours} hour minimum`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="booking-form" loading={saving}>
            Send request
          </Button>
        </>
      }
    >
      <form id="booking-form" onSubmit={submit} className="space-y-4">
        {error && <Alert tone="danger">{error.message}</Alert>}

        <TextInput
          label="What do you need?"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. EV charger installation on the driveway"
          error={error?.fieldError('subject')}
        />

        <TextArea
          label="Any useful detail"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Property type, what you have already tried, deadlines, access notes…"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Preferred date and time"
            type="datetime-local"
            required
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            error={error?.fieldError('scheduledFor')}
          />
          <TextInput
            label="Estimated hours"
            type="number"
            min={professional.pricing.minimumHours}
            step="0.5"
            required
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            error={error?.fieldError('estimatedHours')}
          />
        </div>

        {availability.length > 0 && (
          <p className="text-ink-500 text-xs">
            Typical hours:{' '}
            {availability.map((slot) => `${slot.weekdayLabel} ${slot.start}–${slot.end}`).join(' · ')}
          </p>
        )}
        {!withinHours && (
          <Alert tone="warning" title="Outside typical hours">
            That start time is outside {professional.displayName}’s published weekly hours. You can still send
            the request — they may suggest another slot.
          </Alert>
        )}

        <div className="bg-ink-50 border-ink-200 rounded-xl border p-4">
          <p className="text-ink-500 text-xs font-medium tracking-wide uppercase">Your estimate</p>
          <dl className="text-ink-700 mt-2.5 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt>
                {hoursLabel(hours || 0)} × {money(professional.pricing.hourlyRateCents, professional.pricing.currency)}
              </dt>
              <dd className="tabular-nums">
                {money(
                  Math.round(professional.pricing.hourlyRateCents * (Number(hours) || 0)),
                  professional.pricing.currency,
                )}
              </dd>
            </div>
            {professional.pricing.calloutFeeCents > 0 && (
              <div className="flex justify-between">
                <dt>Call-out fee</dt>
                <dd className="tabular-nums">
                  {money(professional.pricing.calloutFeeCents, professional.pricing.currency)}
                </dd>
              </div>
            )}
            <div className="border-ink-200 text-ink-950 flex justify-between border-t pt-2 font-semibold">
              <dt>Estimated total</dt>
              <dd className="tabular-nums">{money(estimate, professional.pricing.currency)}</dd>
            </div>
          </dl>
          <p className="text-ink-500 mt-2.5 text-xs">
            Final invoice reflects the hours actually worked, always at this hourly rate.
          </p>
        </div>
      </form>
    </Modal>
  );
}

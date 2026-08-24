import { useEffect, useState } from 'react';
import { ApiError, api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { dollars, hoursLabel, money } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { ProfessionalPrivate, RateChange } from '../../lib/types';
import { ErrorBanner, PageLoader } from '../../components/Layout';
import { Icons } from '../../components/icons';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  SectionHeading,
  TextInput,
} from '../../components/ui';
import { ProShell, VerificationNotice } from './ProDashboard';
import { RateHistoryList } from './RateHistory';

export function ProRates() {
  const { professional, refresh } = useAuth();
  const history = useAsync(() => api<{ rateHistory: RateChange[] }>('/professional/rates/history'));

  const [hourlyRate, setHourlyRate] = useState('');
  const [calloutFee, setCalloutFee] = useState('');
  const [minimumHours, setMinimumHours] = useState('');
  const [freeConsultation, setFreeConsultation] = useState(false);
  const [reason, setReason] = useState('');

  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!professional) return;
    setHourlyRate(String(dollars(professional.pricing.hourlyRateCents)));
    setCalloutFee(String(dollars(professional.pricing.calloutFeeCents)));
    setMinimumHours(String(professional.pricing.minimumHours));
    setFreeConsultation(professional.pricing.freeConsultation);
  }, [professional]);

  if (!professional) {
    return (
      <ProShell title="My rates">
        <PageLoader />
      </ProShell>
    );
  }

  const currentCents = professional.pricing.hourlyRateCents;
  const nextCents = Math.round((Number(hourlyRate) || 0) * 100);
  const delta = nextCents - currentCents;
  const changed =
    nextCents !== currentCents ||
    Math.round((Number(calloutFee) || 0) * 100) !== professional.pricing.calloutFeeCents ||
    Number(minimumHours) !== professional.pricing.minimumHours ||
    freeConsultation !== professional.pricing.freeConsultation;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await api<{ professional: ProfessionalPrivate }>('/professional/rates', {
        method: 'PUT',
        body: {
          hourlyRate: Number(hourlyRate),
          calloutFee: Number(calloutFee),
          minimumHours: Number(minimumHours),
          freeConsultation,
          reason: reason.trim() || undefined,
        },
      });
      await refresh();
      history.reload();
      setReason('');
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(500, 'error', 'Could not save your rates.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProShell
      title="My rates"
      subtitle="You control what you charge. Changes apply to new bookings only."
    >
      <VerificationNotice />
      <ErrorBanner error={history.error} />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          <Card className="p-6">
            <form onSubmit={save} className="space-y-5">
              {error && <Alert tone="danger">{error.message}</Alert>}
              {saved && !changed && (
                <Alert tone="success">
                  Your rates are updated and live on your profile.
                </Alert>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <TextInput
                  label="Hourly rate"
                  type="number"
                  min={0}
                  step="1"
                  required
                  prefix="£"
                  hint="What clients see on your profile and in search."
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  error={error?.fieldError('hourlyRate')}
                />
                <TextInput
                  label="Call-out fee"
                  type="number"
                  min={0}
                  step="1"
                  prefix="£"
                  hint="Added once per job. Leave at 0 if you don’t charge one."
                  value={calloutFee}
                  onChange={(e) => setCalloutFee(e.target.value)}
                  error={error?.fieldError('calloutFee')}
                />
                <TextInput
                  label="Minimum engagement"
                  type="number"
                  min={0.25}
                  step="0.25"
                  hint="Clients cannot book fewer hours than this."
                  value={minimumHours}
                  onChange={(e) => setMinimumHours(e.target.value)}
                  error={error?.fieldError('minimumHours')}
                />
                <div className="flex items-end pb-2">
                  <Checkbox
                    label="Offer a free first consultation"
                    description="Shown as a badge on your profile and used as a search filter."
                    checked={freeConsultation}
                    onChange={(e) => setFreeConsultation(e.target.checked)}
                  />
                </div>
              </div>

              <TextInput
                label="Reason for this change"
                hint="Optional, but it makes the pricing history easier to read later."
                placeholder="e.g. Annual increase from April"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />

              <div className="border-ink-100 flex flex-wrap items-center justify-between gap-4 border-t pt-5">
                <div className="text-sm">
                  {delta !== 0 ? (
                    <p className="text-ink-700">
                      Hourly rate{' '}
                      <span className="text-ink-400 line-through">{money(currentCents)}</span>{' '}
                      <Icons.arrowRight className="text-ink-300 inline size-3.5" />{' '}
                      <span className="text-ink-950 font-semibold">{money(nextCents)}</span>{' '}
                      <span className={delta > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        ({delta > 0 ? '+' : ''}
                        {money(delta)})
                      </span>
                    </p>
                  ) : (
                    <p className="text-ink-500">No pending changes.</p>
                  )}
                </div>
                <Button type="submit" loading={saving} disabled={!changed}>
                  Save new rates
                </Button>
              </div>
            </form>
          </Card>

          <div>
            <SectionHeading
              title="Pricing history"
              description="Every change to your hourly rate, call-out fee and membership fee."
            />
            <Card className="p-2">
              <RateHistoryList
                entries={history.data?.rateHistory ?? []}
                currency={professional.pricing.currency}
              />
            </Card>
          </div>
        </div>

        <aside className="space-y-6">
          <Card className="overflow-hidden">
            <div className="border-ink-100 border-b px-5 py-4">
              <p className="text-ink-500 text-xs font-medium tracking-wide uppercase">
                How clients see it
              </p>
            </div>
            <div className="px-5 py-5">
              <p className="text-ink-950 text-3xl font-semibold tracking-tight">
                {money(nextCents)}
                <span className="text-ink-500 text-base font-normal"> /hour</span>
              </p>
              {freeConsultation && (
                <p className="mt-1 text-sm font-medium text-emerald-600">Free first consultation</p>
              )}
              <dl className="text-ink-600 mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt>Minimum engagement</dt>
                  <dd className="text-ink-900 font-medium">{hoursLabel(minimumHours || 1)}</dd>
                </div>
                {Number(calloutFee) > 0 && (
                  <div className="flex justify-between">
                    <dt>Call-out fee</dt>
                    <dd className="text-ink-900 font-medium">
                      {money(Math.round(Number(calloutFee) * 100))}
                    </dd>
                  </div>
                )}
              </dl>
              <div className="bg-ink-50 mt-5 rounded-xl p-4">
                <p className="text-ink-500 text-xs">Example: a 4 hour job</p>
                <p className="text-ink-950 mt-1 text-xl font-semibold tabular-nums">
                  {money(nextCents * 4 + Math.round((Number(calloutFee) || 0) * 100))}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex gap-3">
              <span className="bg-brand-50 text-brand-600 h-fit rounded-lg p-1.5">
                <Icons.shieldCheck className="size-4" />
              </span>
              <div>
                <p className="text-ink-900 text-sm font-medium">Existing bookings are protected</p>
                <p className="text-ink-600 mt-1 text-sm leading-relaxed">
                  Any job already requested keeps the rate it was quoted at. Your new rate applies to
                  requests made from now on.
                </p>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </ProShell>
  );
}

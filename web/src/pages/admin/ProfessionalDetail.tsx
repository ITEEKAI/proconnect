import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, api } from '../../lib/api';
import { dollars, formatDate, locationLabel, money, percentFromBps } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { AdminPlan, Invoice, ProfessionalPrivate, RateChange } from '../../lib/types';
import { ErrorBanner, PageLoader } from '../../components/Layout';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Modal,
  SectionHeading,
  Select,
  Stars,
  TextInput,
  cx,
} from '../../components/ui';
import { RateHistoryList } from '../pro/RateHistory';
import { AdminShell } from './AdminShell';

interface DetailResponse {
  professional: ProfessionalPrivate;
  rateHistory: RateChange[];
  bookings: Array<{
    id: number;
    reference: string;
    status: string;
    subject: string;
    scheduled_for: string;
    estimated_hours: number;
    hourly_rate_cents: number;
    total_cents: number | null;
    client_name: string;
  }>;
  invoices: Invoice[];
}

export function AdminProfessionalDetail() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const justCreated = params.get('created') === '1';

  const detail = useAsync(() => api<DetailResponse>(`/admin/professionals/${id}`), [id]);
  const plans = useAsync(() => api<{ plans: AdminPlan[] }>('/admin/plans'));

  const [feeOpen, setFeeOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (detail.loading) {
    return (
      <AdminShell title="Professional">
        <PageLoader />
      </AdminShell>
    );
  }
  if (detail.error || !detail.data) {
    return (
      <AdminShell title="Professional">
        <ErrorBanner error={detail.error} />
      </AdminShell>
    );
  }

  const pro = detail.data.professional;

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/professionals/${id}`, { method: 'PATCH', body });
      detail.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this professional.');
    } finally {
      setBusy(false);
    }
  }

  async function setAccountStatus(status: 'active' | 'suspended') {
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/professionals/${id}/account-status`, { body: { status } });
      detail.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the account.');
    } finally {
      setBusy(false);
    }
  }

  async function raiseInvoice() {
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/professionals/${id}/invoices`, { body: {} });
      detail.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not raise the invoice.');
    } finally {
      setBusy(false);
    }
  }

  async function markInvoicePaid(invoiceId: number) {
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/invoices/${invoiceId}`, { method: 'PATCH', body: { status: 'paid' } });
      detail.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark the invoice paid.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell
      title={pro.displayName}
      subtitle={`${pro.category.name} · ${locationLabel(pro.location)} · joined ${formatDate(pro.createdAt)}`}
      actions={
        <div className="flex gap-2">
          <Link
            to="/admin/professionals"
            className="text-ink-600 hover:text-ink-950 inline-flex h-10 items-center px-3 text-sm font-medium"
          >
            Back to list
          </Link>
          {pro.isPublished && (
            <Button variant="secondary" onClick={() => window.open(`/pro/${pro.slug}`, '_blank')}>
              View public profile
            </Button>
          )}
        </div>
      }
    >
      {justCreated && (
        <div className="mb-6">
          <Alert tone="success" title="Professional created">
            {pro.displayName} can sign in at once with the temporary password you set. Their profile is{' '}
            {pro.isPublished ? 'live in the directory' : 'not yet listed publicly'}.{' '}
            <button
              type="button"
              className="font-medium underline"
              onClick={() => {
                params.delete('created');
                setParams(params, { replace: true });
              }}
            >
              Dismiss
            </button>
          </Alert>
        </div>
      )}
      {error && (
        <div className="mb-6">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          {/* Identity */}
          <Card className="p-6">
            <div className="flex flex-wrap items-start gap-5">
              <Avatar name={pro.displayName} size="lg" src={pro.avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-ink-950 text-lg font-semibold">{pro.displayName}</h2>
                  <Badge
                    tone={
                      pro.verificationStatus === 'verified'
                        ? 'success'
                        : pro.verificationStatus === 'pending'
                          ? 'warning'
                          : 'danger'
                    }
                  >
                    {pro.verificationStatus}
                  </Badge>
                  {!pro.isPublished && <Badge tone="neutral">unlisted</Badge>}
                  {pro.contact.accountStatus === 'suspended' && <Badge tone="danger">suspended</Badge>}
                </div>
                {pro.businessName && <p className="text-ink-600 text-sm">{pro.businessName}</p>}
                <p className="text-ink-700 mt-2 text-sm">{pro.headline}</p>
                <div className="text-ink-500 mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  <span>{pro.contact.email}</span>
                  {pro.contact.phone && <span>{pro.contact.phone}</span>}
                  <span>{pro.yearsExperience} years experience</span>
                </div>
                <div className="mt-3">
                  <Stars value={pro.rating.average} count={pro.rating.count} size="sm" />
                </div>
              </div>
            </div>

            {pro.specialties.length > 0 && (
              <div className="border-ink-100 mt-5 flex flex-wrap gap-1.5 border-t pt-4">
                {pro.specialties.map((s) => (
                  <span key={s} className="bg-ink-100 text-ink-600 rounded-md px-2 py-1 text-xs">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* Pricing history */}
          <div>
            <SectionHeading
              title="Pricing history"
              description="Who changed what, and why. Hourly rate changes by the professional appear here too."
            />
            <Card className="p-2">
              <RateHistoryList
                entries={detail.data.rateHistory}
                currency={pro.pricing.currency}
                actorPerspective="admin"
              />
            </Card>
          </div>

          {/* Bookings */}
          <div>
            <SectionHeading title="Recent bookings" />
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-sm">
                <thead className="bg-ink-50 text-ink-500 text-left text-xs tracking-wide uppercase">
                  <tr>
                    <th className="px-5 py-3 font-medium">Job</th>
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="px-5 py-3 font-medium">Scheduled</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-ink-100 divide-y">
                  {detail.data.bookings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-ink-500 px-5 py-8 text-center">
                        No bookings yet.
                      </td>
                    </tr>
                  )}
                  {detail.data.bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="text-ink-900 px-5 py-3">
                        {booking.subject}
                        <span className="text-ink-400 block text-xs">{booking.reference}</span>
                      </td>
                      <td className="text-ink-700 px-5 py-3">{booking.client_name}</td>
                      <td className="text-ink-700 px-5 py-3">{formatDate(booking.scheduled_for)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={booking.status === 'completed' ? 'success' : 'neutral'}>
                          {booking.status}
                        </Badge>
                      </td>
                      <td className="text-ink-950 px-5 py-3 font-medium tabular-nums">
                        {money(
                          booking.total_cents ??
                            Math.round(booking.hourly_rate_cents * booking.estimated_hours),
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Invoices */}
          <div>
            <SectionHeading
              title="Membership invoices"
              action={
                <Button size="sm" variant="secondary" loading={busy} onClick={raiseInvoice}>
                  Raise this month’s invoice
                </Button>
              }
            />
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-ink-500 text-left text-xs tracking-wide uppercase">
                  <tr>
                    <th className="px-5 py-3 font-medium">Period</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-ink-100 divide-y">
                  {detail.data.invoices.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-ink-500 px-5 py-8 text-center">
                        No invoices raised yet.
                      </td>
                    </tr>
                  )}
                  {detail.data.invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="text-ink-800 px-5 py-3">
                        {formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}
                      </td>
                      <td className="text-ink-950 px-5 py-3 font-medium tabular-nums">
                        {money(invoice.amount_cents, invoice.currency)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          tone={
                            invoice.status === 'paid' ? 'success' : invoice.status === 'void' ? 'neutral' : 'warning'
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {invoice.status === 'due' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={busy}
                            onClick={() => void markInvoicePaid(invoice.id)}
                          >
                            Mark paid
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>

        {/* Control rail */}
        <aside className="space-y-6">
          <Card className="p-6">
            <p className="text-ink-500 text-xs font-medium tracking-wide uppercase">Monthly fee</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              <p className="text-ink-950 text-3xl font-semibold tracking-tight">
                {money(pro.billing.monthlyFeeCents)}
              </p>
              {pro.billing.feeIsOverridden && <Badge tone="brand">Custom</Badge>}
            </div>
            <p className="text-ink-500 mt-1 text-sm">
              {pro.billing.planName} plan · list price {money(pro.billing.planMonthlyFeeCents)} ·{' '}
              {percentFromBps(pro.billing.commissionBps)} commission
            </p>
            <dl className="text-ink-600 mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt>Subscription</dt>
                <dd className="text-ink-900 font-medium capitalize">{pro.billing.subscriptionStatus}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Next invoice</dt>
                <dd className="text-ink-900 font-medium">{formatDate(pro.billing.nextInvoiceDate)}</dd>
              </div>
            </dl>
            <Button className="mt-5 w-full" onClick={() => setFeeOpen(true)}>
              Change monthly fee
            </Button>
          </Card>

          <Card className="p-6">
            <p className="text-ink-500 text-xs font-medium tracking-wide uppercase">Hourly rate</p>
            <p className="text-ink-950 mt-2 text-3xl font-semibold tracking-tight">
              {money(pro.pricing.hourlyRateCents, pro.pricing.currency)}
              <span className="text-ink-500 text-base font-normal">/hr</span>
            </p>
            <p className="text-ink-500 mt-1 text-sm">
              Normally set by the professional. Override only if you have agreed it with them.
            </p>
            <Button variant="secondary" className="mt-4 w-full" onClick={() => setRateOpen(true)}>
              Override hourly rate
            </Button>
          </Card>

          <Card className="p-6">
            <p className="text-ink-500 text-xs font-medium tracking-wide uppercase">Listing controls</p>
            <div className="mt-4 space-y-4">
              <Select
                label="Verification"
                value={pro.verificationStatus}
                disabled={busy}
                onChange={(e) => patch({ verificationStatus: e.target.value })}
              >
                <option value="pending">Pending review</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </Select>

              <Checkbox
                label="Listed in the public directory"
                description={
                  pro.verificationStatus === 'verified'
                    ? 'Uncheck to hide them from search without deleting anything.'
                    : 'Only verified professionals can be listed.'
                }
                checked={pro.isPublished}
                disabled={busy || pro.verificationStatus !== 'verified'}
                onChange={(e) => patch({ isPublished: e.target.checked })}
              />

              <Select
                label="Subscription status"
                value={pro.billing.subscriptionStatus}
                disabled={busy}
                onChange={(e) => patch({ subscriptionStatus: e.target.value })}
              >
                <option value="trialing">Trialing</option>
                <option value="active">Active</option>
                <option value="past_due">Past due</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>

            <div className="border-ink-100 mt-5 border-t pt-5">
              {pro.contact.accountStatus === 'suspended' ? (
                <Button
                  variant="secondary"
                  className="w-full"
                  loading={busy}
                  onClick={() => setAccountStatus('active')}
                >
                  Reinstate account
                </Button>
              ) : (
                <Button
                  variant="danger"
                  className="w-full"
                  loading={busy}
                  onClick={() => setAccountStatus('suspended')}
                >
                  Suspend account
                </Button>
              )}
              <p className="text-ink-500 mt-2 text-xs">
                Suspending blocks sign-in and immediately removes them from the directory.
              </p>
            </div>
          </Card>
        </aside>
      </div>

      <FeeModal
        open={feeOpen}
        onClose={() => setFeeOpen(false)}
        professional={pro}
        plans={plans.data?.plans ?? []}
        onSaved={() => detail.reload()}
      />
      <RateOverrideModal
        open={rateOpen}
        onClose={() => setRateOpen(false)}
        professional={pro}
        onSaved={() => detail.reload()}
      />
    </AdminShell>
  );
}

function FeeModal({
  open,
  onClose,
  professional,
  plans,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  professional: ProfessionalPrivate;
  plans: AdminPlan[];
  onSaved: () => void;
}) {
  const [planId, setPlanId] = useState(String(professional.billing.planId));
  const [mode, setMode] = useState<'plan' | 'custom'>(
    professional.billing.feeIsOverridden ? 'custom' : 'plan',
  );
  const [fee, setFee] = useState(String(dollars(professional.billing.monthlyFeeCents)));
  const [reason, setReason] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPlanId(String(professional.billing.planId));
    setMode(professional.billing.feeIsOverridden ? 'custom' : 'plan');
    setFee(String(dollars(professional.billing.monthlyFeeCents)));
    setReason('');
    setError(null);
  }, [open, professional]);

  const selectedPlan = plans.find((p) => String(p.id) === planId);
  const nextFeeCents =
    mode === 'plan' ? (selectedPlan?.monthlyFeeCents ?? 0) : Math.round((Number(fee) || 0) * 100);
  const delta = nextFeeCents - professional.billing.monthlyFeeCents;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api(`/admin/professionals/${professional.id}/fee`, {
        method: 'PUT',
        body: {
          planId: Number(planId),
          useplanPrice: mode === 'plan',
          ...(mode === 'custom' ? { monthlyFee: Number(fee) } : {}),
          reason: reason.trim() || undefined,
        },
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(500, 'error', 'Could not change the fee.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Change ${professional.displayName}’s monthly fee`}
      description="Applies from the next invoice. The change is recorded in the pricing history."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving} disabled={delta === 0 && mode === 'plan'}>
            Save fee
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <Alert tone="danger">{error.message}</Alert>}

        <Select label="Membership plan" value={planId} onChange={(e) => setPlanId(e.target.value)}>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} — {money(plan.monthlyFeeCents)}/mo
            </option>
          ))}
        </Select>

        <div>
          <p className="label-text">What do they pay?</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode('plan')}
              className={cx(
                'rounded-xl border p-3.5 text-left transition',
                mode === 'plan' ? 'border-brand-600 bg-brand-50/50 ring-1 ring-brand-600' : 'border-ink-200',
              )}
            >
              <span className="text-ink-950 block text-sm font-medium">Plan list price</span>
              <span className="text-ink-500 block text-xs">
                {selectedPlan ? `${money(selectedPlan.monthlyFeeCents)}/mo` : '—'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={cx(
                'rounded-xl border p-3.5 text-left transition',
                mode === 'custom'
                  ? 'border-brand-600 bg-brand-50/50 ring-1 ring-brand-600'
                  : 'border-ink-200',
              )}
            >
              <span className="text-ink-950 block text-sm font-medium">Negotiated fee</span>
              <span className="text-ink-500 block text-xs">Set a bespoke amount</span>
            </button>
          </div>
        </div>

        {mode === 'custom' && (
          <TextInput
            label="Monthly fee"
            type="number"
            min={0}
            step="1"
            prefix="£"
            hint="This professional will be skipped when the plan price changes."
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            error={error?.fieldError('monthlyFee')}
          />
        )}

        <TextInput
          label="Reason"
          hint="Shown in the pricing history and the audit log."
          placeholder="e.g. Retention discount agreed for 12 months"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <div className="bg-ink-50 border-ink-200 rounded-xl border p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-600">Current</span>
            <span className="text-ink-500 tabular-nums line-through">
              {money(professional.billing.monthlyFeeCents)}/mo
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-ink-900 text-sm font-medium">New fee</span>
            <span className="text-ink-950 text-lg font-semibold tabular-nums">
              {money(nextFeeCents)}/mo
            </span>
          </div>
          {delta !== 0 && (
            <p
              className={cx(
                'mt-1.5 text-right text-xs font-medium',
                delta < 0 ? 'text-rose-600' : 'text-emerald-600',
              )}
            >
              {delta > 0 ? '+' : ''}
              {money(delta)} per month
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function RateOverrideModal({
  open,
  onClose,
  professional,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  professional: ProfessionalPrivate;
  onSaved: () => void;
}) {
  const [rate, setRate] = useState(String(dollars(professional.pricing.hourlyRateCents)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setRate(String(dollars(professional.pricing.hourlyRateCents)));
  }, [open, professional]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api(`/admin/professionals/${professional.id}`, {
        method: 'PATCH',
        body: { hourlyRate: Number(rate) },
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the rate.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Override hourly rate"
      description={`${professional.displayName} normally controls this from their own dashboard.`}
      width="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Save rate
          </Button>
        </>
      }
    >
      {error && (
        <div className="mb-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}
      <Alert tone="warning">
        This is recorded in the pricing history as an administrator change. Existing bookings keep the rate
        they were quoted at.
      </Alert>
      <TextInput
        label="Hourly rate"
        wrapperClassName="mt-4"
        type="number"
        min={0}
        step="1"
        prefix="£"
        value={rate}
        onChange={(e) => setRate(e.target.value)}
      />
    </Modal>
  );
}

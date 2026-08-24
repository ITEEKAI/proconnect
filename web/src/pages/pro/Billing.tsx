import { useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate, money, percentFromBps } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { Invoice, ProfessionalPrivate } from '../../lib/types';
import { ErrorBanner, PageLoader } from '../../components/Layout';
import { Icons } from '../../components/icons';
import { Alert, Badge, Button, Card, SectionHeading, cx } from '../../components/ui';
import { ProShell } from './ProDashboard';

interface BillingResponse {
  billing: ProfessionalPrivate['billing'];
  invoices: Invoice[];
  plans: Array<{
    id: number;
    slug: string;
    name: string;
    description: string;
    monthly_fee_cents: number;
    currency: string;
    commission_bps: number;
    features: string[];
  }>;
}

const STATUS_TONE = { paid: 'success', due: 'warning', void: 'neutral' } as const;

export function ProBilling() {
  const { refresh } = useAuth();
  const billing = useAsync(() => api<BillingResponse>('/professional/billing'));
  const [switching, setSwitching] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (billing.loading) {
    return (
      <ProShell title="Membership">
        <PageLoader />
      </ProShell>
    );
  }

  const data = billing.data;

  async function switchPlan(planId: number) {
    setSwitching(planId);
    setError(null);
    try {
      await api('/professional/plan', { body: { planId } });
      await refresh();
      billing.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change your plan.');
    } finally {
      setSwitching(null);
    }
  }

  return (
    <ProShell title="Membership" subtitle="What you pay ProConnect each month, and what you have been invoiced.">
      <ErrorBanner error={billing.error} />
      {error && (
        <div className="mb-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-6 lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-ink-500 text-xs font-medium tracking-wide uppercase">
                    Current membership
                  </p>
                  <div className="mt-2 flex flex-wrap items-baseline gap-3">
                    <p className="text-ink-950 text-4xl font-semibold tracking-tight">
                      {money(data.billing.monthlyFeeCents)}
                      <span className="text-ink-500 text-lg font-normal"> /month</span>
                    </p>
                    <Badge tone={data.billing.subscriptionStatus === 'active' ? 'success' : 'warning'}>
                      {data.billing.subscriptionStatus}
                    </Badge>
                  </div>
                  <p className="text-ink-600 mt-2">
                    {data.billing.planName} plan · {percentFromBps(data.billing.commissionBps)} commission on
                    completed work
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-ink-500 text-xs">Next invoice</p>
                  <p className="text-ink-900 font-medium">{formatDate(data.billing.nextInvoiceDate)}</p>
                </div>
              </div>

              {data.billing.feeIsOverridden && (
                <div className="mt-5">
                  <Alert tone="brand" title="You are on a negotiated rate">
                    Your monthly fee is {money(data.billing.monthlyFeeCents)} rather than the{' '}
                    {money(data.billing.planMonthlyFeeCents)} list price for the {data.billing.planName}{' '}
                    plan. Switching plans below will replace it with that plan’s standard price.
                  </Alert>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <p className="text-ink-500 text-xs font-medium tracking-wide uppercase">This year</p>
              <p className="text-ink-950 mt-2 text-3xl font-semibold tracking-tight">
                {money(
                  data.invoices
                    .filter((i) => i.status === 'paid')
                    .reduce((total, i) => total + i.amount_cents, 0),
                )}
              </p>
              <p className="text-ink-500 mt-1 text-sm">Membership fees paid</p>
              <div className="border-ink-100 mt-5 border-t pt-4">
                <p className="text-ink-500 text-sm">
                  {data.invoices.filter((i) => i.status === 'due').length} invoice(s) currently due
                </p>
              </div>
            </Card>
          </div>

          <div className="mt-8">
            <SectionHeading
              title="Change plan"
              description="Switching takes effect on your next invoice."
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {data.plans.map((plan) => {
                const current = plan.id === data.billing.planId;
                return (
                  <div
                    key={plan.id}
                    className={cx(
                      'flex flex-col rounded-2xl border p-5',
                      current ? 'border-brand-600 ring-1 ring-brand-600 bg-white' : 'border-ink-200/70 bg-white',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-ink-950 font-semibold">{plan.name}</p>
                      {current && <Badge tone="brand">Current</Badge>}
                    </div>
                    <p className="text-ink-950 mt-3 text-2xl font-semibold tracking-tight">
                      {money(plan.monthly_fee_cents, plan.currency)}
                      <span className="text-ink-500 text-sm font-normal">/mo</span>
                    </p>
                    <p className="text-ink-500 mt-1 text-xs">
                      {percentFromBps(plan.commission_bps)} commission
                    </p>
                    <ul className="mt-4 flex-1 space-y-1.5">
                      {plan.features.slice(0, 4).map((feature) => (
                        <li key={feature} className="text-ink-600 flex gap-2 text-xs">
                          <Icons.check className="text-brand-600 mt-0.5 size-3.5 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-5 w-full"
                      size="sm"
                      variant={current ? 'secondary' : 'primary'}
                      disabled={current}
                      loading={switching === plan.id}
                      onClick={() => switchPlan(plan.id)}
                    >
                      {current ? 'Your plan' : `Switch to ${plan.name}`}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8">
            <SectionHeading title="Invoices" />
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-ink-500 text-left text-xs tracking-wide uppercase">
                  <tr>
                    <th className="px-5 py-3 font-medium">Period</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-ink-100 divide-y">
                  {data.invoices.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-ink-500 px-5 py-8 text-center">
                        No invoices yet.
                      </td>
                    </tr>
                  )}
                  {data.invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="text-ink-800 px-5 py-3">
                        {formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}
                      </td>
                      <td className="text-ink-950 px-5 py-3 font-medium tabular-nums">
                        {money(invoice.amount_cents, invoice.currency)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={STATUS_TONE[invoice.status]}>{invoice.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </>
      )}
    </ProShell>
  );
}

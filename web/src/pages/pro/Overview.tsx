import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatDateTime, hoursLabel, money, relativeTime } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { ProfessionalPrivate, RateChange } from '../../lib/types';
import { ErrorBanner, PageLoader } from '../../components/Layout';
import { Icons } from '../../components/icons';
import { Badge, Card, EmptyState, LinkButton, SectionHeading, Stat, Stars } from '../../components/ui';
import { ProShell, VerificationNotice } from './ProDashboard';
import { RateHistoryList } from './RateHistory';

interface DashboardResponse {
  professional: ProfessionalPrivate;
  metrics: {
    pendingRequests: number;
    acceptedJobs: number;
    completedJobs: number;
    lifetimeEarningsCents: number;
  };
  upcoming: Array<{
    id: number;
    reference: string;
    subject: string;
    status: string;
    scheduled_for: string;
    estimated_hours: number;
    hourly_rate_cents: number;
    currency: string;
    client_name: string;
  }>;
  rateHistory: RateChange[];
}

export function ProOverview() {
  const dashboard = useAsync(() => api<DashboardResponse>('/professional/dashboard'));

  if (dashboard.loading) {
    return (
      <ProShell title="Overview">
        <PageLoader />
      </ProShell>
    );
  }

  const data = dashboard.data;
  const pro = data?.professional;

  return (
    <ProShell
      title="Overview"
      subtitle={pro ? `${pro.category.name} · ${pro.location.city || 'Remote'}` : undefined}
      actions={
        pro?.isPublished ? (
          <LinkButton to={`/pro/${pro.slug}`} variant="secondary">
            View public profile <Icons.arrowRight className="size-4" />
          </LinkButton>
        ) : undefined
      }
    >
      <ErrorBanner error={dashboard.error} />
      <VerificationNotice />

      {data && pro && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="New requests"
              value={String(data.metrics.pendingRequests)}
              sub="Waiting on your reply"
              tone="warning"
              icon={<Icons.message className="size-4" />}
            />
            <Stat
              label="Confirmed jobs"
              value={String(data.metrics.acceptedJobs)}
              sub="Scheduled and accepted"
              tone="brand"
              icon={<Icons.calendar className="size-4" />}
            />
            <Stat
              label="Completed"
              value={String(data.metrics.completedJobs)}
              sub="All time"
              tone="success"
              icon={<Icons.checkCircle className="size-4" />}
            />
            <Stat
              label="Lifetime earnings"
              value={money(data.metrics.lifetimeEarningsCents, pro.pricing.currency)}
              sub="Billed through ProConnect"
              tone="neutral"
              icon={<Icons.chart className="size-4" />}
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionHeading
                title="Upcoming work"
                description="Requests and confirmed jobs, soonest first."
                action={
                  <LinkButton to="/dashboard/bookings" variant="ghost" size="sm">
                    All bookings <Icons.arrowRight className="size-3.5" />
                  </LinkButton>
                }
              />
              {data.upcoming.length === 0 ? (
                <EmptyState
                  title="No upcoming work"
                  description="New enquiries will appear here as soon as they arrive."
                />
              ) : (
                <ul className="space-y-3">
                  {data.upcoming.map((job) => (
                    <li key={job.id}>
                      <Link
                        to={`/dashboard/bookings/${job.id}`}
                        className="card flex flex-wrap items-center justify-between gap-4 p-4 transition hover:border-brand-200"
                      >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-ink-950 font-medium">{job.subject}</p>
                          <Badge tone={job.status === 'requested' ? 'warning' : 'brand'}>
                            {job.status === 'requested' ? 'New request' : 'Confirmed'}
                          </Badge>
                        </div>
                        <p className="text-ink-500 mt-0.5 text-sm">
                          {job.client_name} · {formatDateTime(job.scheduled_for)} · {job.estimated_hours}h
                        </p>
                      </div>
                      <p className="text-ink-900 font-semibold tabular-nums">
                        {money(Math.round(job.hourly_rate_cents * job.estimated_hours), job.currency)}
                      </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-6">
              <Card className="p-5">
                <p className="text-ink-500 text-xs font-medium tracking-wide uppercase">Your hourly rate</p>
                <p className="text-ink-950 mt-1.5 text-3xl font-semibold tracking-tight">
                  {money(pro.pricing.hourlyRateCents, pro.pricing.currency)}
                  <span className="text-ink-500 text-base font-normal">/hr</span>
                </p>
                <dl className="text-ink-600 mt-4 space-y-1.5 text-sm">
                  <Row label="Minimum" value={hoursLabel(pro.pricing.minimumHours)} />
                  {pro.pricing.calloutFeeCents > 0 && (
                    <Row label="Call-out" value={money(pro.pricing.calloutFeeCents, pro.pricing.currency)} />
                  )}
                  <Row
                    label="First consultation"
                    value={pro.pricing.freeConsultation ? 'Free' : 'Charged'}
                  />
                </dl>
                <LinkButton to="/dashboard/rates" variant="subtle" size="sm" className="mt-4 w-full">
                  Change my rate
                </LinkButton>
              </Card>

              <Card className="p-5">
                <p className="text-ink-500 text-xs font-medium tracking-wide uppercase">Membership</p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <p className="text-ink-950 text-2xl font-semibold tracking-tight">
                    {money(pro.billing.monthlyFeeCents, pro.pricing.currency)}
                    <span className="text-ink-500 text-sm font-normal">/mo</span>
                  </p>
                  {pro.billing.feeIsOverridden && <Badge tone="brand">Custom</Badge>}
                </div>
                <p className="text-ink-500 mt-1 text-sm">
                  {pro.billing.planName} plan · renews {pro.billing.nextInvoiceDate ?? '—'}
                </p>
                <LinkButton to="/dashboard/billing" variant="ghost" size="sm" className="mt-3 w-full">
                  Manage membership
                </LinkButton>
              </Card>

              <Card className="p-5">
                <p className="text-ink-500 text-xs font-medium tracking-wide uppercase">Client rating</p>
                <div className="mt-2">
                  <Stars value={pro.rating.average} count={pro.rating.count} />
                </div>
                <p className="text-ink-500 mt-2 text-sm">
                  {pro.rating.count === 0
                    ? 'No reviews yet.'
                    : `Based on ${pro.rating.count} completed ${pro.rating.count === 1 ? 'job' : 'jobs'}.`}
                </p>
              </Card>
            </div>
          </div>

          <div className="mt-8">
            <SectionHeading
              title="Recent pricing changes"
              description="Every rate and fee change is recorded, whoever made it."
              action={
                <Link to="/dashboard/rates" className="text-brand-700 text-sm font-medium">
                  Full history
                </Link>
              }
            />
            <Card className="p-2">
              <RateHistoryList
                entries={data.rateHistory}
                currency={pro.pricing.currency}
                emptyLabel="No changes recorded yet."
              />
            </Card>
            {data.rateHistory[0] && (
              <p className="text-ink-400 mt-2 text-xs">
                Last change {relativeTime(data.rateHistory[0].created_at)}.
              </p>
            )}
          </div>
        </>
      )}
    </ProShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt>{label}</dt>
      <dd className="text-ink-900 font-medium">{value}</dd>
    </div>
  );
}

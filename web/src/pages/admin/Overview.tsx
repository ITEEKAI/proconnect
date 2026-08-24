import { api } from '../../lib/api';
import { money, relativeTime } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { AdminOverview } from '../../lib/types';
import { ErrorBanner, PageLoader } from '../../components/Layout';
import { Icons } from '../../components/icons';
import { Card, LinkButton, SectionHeading, Stat } from '../../components/ui';
import { AdminShell } from './AdminShell';

export function AdminOverviewPage() {
  const overview = useAsync(() => api<AdminOverview>('/admin/overview'));

  if (overview.loading) {
    return (
      <AdminShell title="Overview">
        <PageLoader />
      </AdminShell>
    );
  }

  const data = overview.data;
  const maxCategory = Math.max(1, ...(data?.byCategory.map((c) => c.professionals) ?? [1]));

  return (
    <AdminShell
      title="Overview"
      subtitle="Platform health, recurring revenue and what needs your attention."
      actions={
        <LinkButton to="/admin/professionals/new">
          <Icons.plus className="size-4" /> Sign up an expert
        </LinkButton>
      }
    >
      <ErrorBanner error={overview.error} />

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Monthly recurring revenue"
              value={money(data.totals.monthlyRecurringRevenueCents)}
              sub="Sum of active membership fees"
              tone="success"
              icon={<Icons.card className="size-4" />}
            />
            <Stat
              label="Professionals"
              value={String(data.totals.professionals)}
              sub={`${data.totals.publishedProfessionals} live in the directory`}
              tone="brand"
              icon={<Icons.users className="size-4" />}
            />
            <Stat
              label="Awaiting verification"
              value={String(data.totals.pendingVerification)}
              sub="Applications in the queue"
              tone={data.totals.pendingVerification > 0 ? 'warning' : 'neutral'}
              icon={<Icons.shieldCheck className="size-4" />}
            />
            <Stat
              label="Gross booking value"
              value={money(data.totals.grossBookingValueCents)}
              sub={`${data.totals.completedBookings} completed of ${data.totals.bookings}`}
              tone="neutral"
              icon={<Icons.chart className="size-4" />}
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div>
              <SectionHeading title="Revenue by plan" description="Membership fees currently being billed." />
              <Card className="divide-ink-100 divide-y">
                {data.byPlan.map((plan) => (
                  <div key={plan.name} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-ink-900 text-sm font-medium">{plan.name}</p>
                      <p className="text-ink-500 text-xs">
                        {plan.professionals} member{plan.professionals === 1 ? '' : 's'}
                      </p>
                    </div>
                    <p className="text-ink-950 font-semibold tabular-nums">
                      {money(plan.monthlyRevenueCents)}
                      <span className="text-ink-400 text-xs font-normal">/mo</span>
                    </p>
                  </div>
                ))}
              </Card>
            </div>

            <div>
              <SectionHeading
                title="Coverage by field"
                description="Where you have depth, and where you are thin."
              />
              <Card className="space-y-3 px-5 py-4">
                {data.byCategory.map((category) => (
                  <div key={category.slug}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-ink-800">{category.name}</span>
                      <span className="text-ink-500 tabular-nums">
                        {category.professionals}
                        {category.averageHourlyRateCents > 0 && (
                          <span className="text-ink-400">
                            {' '}
                            · avg {money(category.averageHourlyRateCents)}/hr
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="bg-ink-100 h-1.5 overflow-hidden rounded-full">
                      <div
                        className="bg-brand-500 h-full rounded-full transition-all"
                        style={{ width: `${(category.professionals / maxCategory) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          </div>

          <div className="mt-8">
            <SectionHeading
              title="Recent admin activity"
              action={
                <LinkButton to="/admin/audit" variant="ghost" size="sm">
                  Full audit log <Icons.arrowRight className="size-3.5" />
                </LinkButton>
              }
            />
            <Card className="divide-ink-100 divide-y">
              {data.recentActivity.length === 0 && (
                <p className="text-ink-500 px-5 py-8 text-center text-sm">Nothing recorded yet.</p>
              )}
              {data.recentActivity.map((event) => (
                <div key={event.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-ink-900 text-sm">{event.summary}</p>
                    <p className="text-ink-500 mt-0.5 text-xs">
                      {event.actor_email} · {event.action}
                    </p>
                  </div>
                  <span className="text-ink-400 shrink-0 text-xs">{relativeTime(event.created_at)}</span>
                </div>
              ))}
            </Card>
          </div>
        </>
      )}
    </AdminShell>
  );
}

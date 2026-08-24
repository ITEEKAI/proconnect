import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, query } from '../../lib/api';
import { locationLabel, money } from '../../lib/format';
import { useAsync, useDebounced } from '../../lib/useAsync';
import type { AdminCategory, ProfessionalPrivate } from '../../lib/types';
import { ErrorBanner, PageLoader } from '../../components/Layout';
import { Icons } from '../../components/icons';
import { Avatar, Badge, Card, EmptyState, LinkButton, Select, Stars } from '../../components/ui';
import { AdminShell } from './AdminShell';

const VERIFICATION_TONE = { verified: 'success', pending: 'warning', rejected: 'danger' } as const;
const SUBSCRIPTION_TONE = {
  active: 'success',
  trialing: 'info',
  past_due: 'warning',
  cancelled: 'neutral',
} as const;

export function AdminProfessionals() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [verification, setVerification] = useState('');
  const [subscription, setSubscription] = useState('');
  const debouncedSearch = useDebounced(search, 300);

  const categories = useAsync(() => api<{ categories: AdminCategory[] }>('/admin/categories'));
  const list = useAsync(
    () =>
      api<{ professionals: ProfessionalPrivate[] }>(
        `/admin/professionals${query({ search: debouncedSearch, category, verification, subscription })}`,
      ),
    [debouncedSearch, category, verification, subscription],
  );

  const rows = list.data?.professionals ?? [];
  const mrr = rows
    .filter((p) => ['active', 'past_due'].includes(p.billing.subscriptionStatus))
    .reduce((total, p) => total + p.billing.monthlyFeeCents, 0);

  return (
    <AdminShell
      title="Professionals"
      subtitle="Onboard experts, verify credentials and set what each of them pays."
      actions={
        <LinkButton to="/admin/professionals/new">
          <Icons.plus className="size-4" /> Sign up an expert
        </LinkButton>
      }
    >
      <ErrorBanner error={list.error} />

      <Card className="mb-6 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Icons.search className="text-ink-400 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email or business"
              aria-label="Search professionals"
              className="field pl-9"
            />
          </div>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {categories.data?.categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            value={verification}
            onChange={(e) => setVerification(e.target.value)}
            aria-label="Verification status"
          >
            <option value="">Any verification</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </Select>
          <Select
            value={subscription}
            onChange={(e) => setSubscription(e.target.value)}
            aria-label="Subscription status"
          >
            <option value="">Any subscription</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past due</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
        <div className="border-ink-100 text-ink-500 mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t pt-3 text-sm">
          <span>
            <span className="text-ink-900 font-semibold">{rows.length}</span> shown
          </span>
          <span>
            <span className="text-ink-900 font-semibold">{money(mrr)}</span> monthly recurring revenue in
            this view
          </span>
        </div>
      </Card>

      {list.loading && <PageLoader />}

      {!list.loading && rows.length === 0 && (
        <EmptyState
          title="No professionals match those filters"
          action={
            <LinkButton to="/admin/professionals/new" variant="secondary">
              Sign up an expert
            </LinkButton>
          }
        />
      )}

      {!list.loading && rows.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[64rem] text-sm">
            <thead className="bg-ink-50 text-ink-500 text-left text-xs tracking-wide uppercase">
              <tr>
                <th className="px-5 py-3 font-medium">Professional</th>
                <th className="px-5 py-3 font-medium">Field</th>
                <th className="px-5 py-3 font-medium">Hourly rate</th>
                <th className="px-5 py-3 font-medium">Monthly fee</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Rating</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-ink-100 divide-y">
              {rows.map((pro) => (
                <tr key={pro.id} className="hover:bg-ink-50/60 transition">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={pro.displayName} size="sm" src={pro.avatarUrl} />
                      <div className="min-w-0">
                        <Link
                          to={`/admin/professionals/${pro.id}`}
                          className="text-ink-950 hover:text-brand-700 block font-medium"
                        >
                          {pro.displayName}
                        </Link>
                        <p className="text-ink-500 truncate text-xs">{pro.contact.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-ink-800">{pro.category.name}</p>
                    <p className="text-ink-400 text-xs">{locationLabel(pro.location)}</p>
                  </td>
                  <td className="text-ink-950 px-5 py-3.5 font-medium tabular-nums">
                    {money(pro.pricing.hourlyRateCents, pro.pricing.currency)}
                    <span className="text-ink-400 text-xs font-normal">/hr</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-ink-950 font-medium tabular-nums">
                      {money(pro.billing.monthlyFeeCents)}
                    </span>
                    <span className="text-ink-400 text-xs">/mo</span>
                    <p className="text-ink-400 text-xs">
                      {pro.billing.planName}
                      {pro.billing.feeIsOverridden && (
                        <span className="text-brand-600 font-medium"> · custom</span>
                      )}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone={VERIFICATION_TONE[pro.verificationStatus]}>
                        {pro.verificationStatus}
                      </Badge>
                      <Badge tone={SUBSCRIPTION_TONE[pro.billing.subscriptionStatus]}>
                        {pro.billing.subscriptionStatus}
                      </Badge>
                      {!pro.isPublished && <Badge tone="neutral">unlisted</Badge>}
                      {pro.contact.accountStatus === 'suspended' && (
                        <Badge tone="danger">suspended</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Stars value={pro.rating.average} count={pro.rating.count} size="sm" />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      to={`/admin/professionals/${pro.id}`}
                      className="text-brand-700 inline-flex items-center gap-1 text-sm font-medium"
                    >
                      Manage <Icons.arrowRight className="size-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </AdminShell>
  );
}

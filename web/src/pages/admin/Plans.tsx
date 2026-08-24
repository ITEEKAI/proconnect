import { useEffect, useState } from 'react';
import { ApiError, api } from '../../lib/api';
import { dollars, money, percentFromBps, pluralise } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { AdminPlan } from '../../lib/types';
import { ErrorBanner, PageLoader } from '../../components/Layout';
import { Icons } from '../../components/icons';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Modal,
  TagInput,
  TextArea,
  TextInput,
  cx,
} from '../../components/ui';
import { AdminShell } from './AdminShell';

export function AdminPlans() {
  const plans = useAsync(() => api<{ plans: AdminPlan[] }>('/admin/plans'));
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const totalMrr = (plans.data?.plans ?? []).reduce(
    (total, plan) => total + plan.monthlyFeeCents * plan.subscribers,
    0,
  );

  return (
    <AdminShell
      title="Plans & fees"
      subtitle="Set what each membership tier costs. Changing a price re-prices everyone on that plan."
      actions={
        <Button onClick={() => setCreating(true)}>
          <Icons.plus className="size-4" /> New plan
        </Button>
      }
    >
      <ErrorBanner error={plans.error} />
      {notice && (
        <div className="mb-6">
          <Alert tone="success">{notice}</Alert>
        </div>
      )}

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div>
          <p className="text-ink-500 text-xs font-medium tracking-wide uppercase">
            List-price recurring revenue
          </p>
          <p className="text-ink-950 mt-1 text-2xl font-semibold tracking-tight">{money(totalMrr)}/mo</p>
        </div>
        <p className="text-ink-500 max-w-sm text-sm">
          Calculated from plan prices × subscribers. Professionals on a negotiated fee are billed their own
          amount instead.
        </p>
      </Card>

      {plans.loading && <PageLoader />}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {plans.data?.plans.map((plan) => (
          <Card key={plan.id} className={cx('flex flex-col p-6', !plan.isActive && 'opacity-60')}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-ink-950 font-semibold">{plan.name}</h2>
              {!plan.isActive && <Badge tone="neutral">inactive</Badge>}
            </div>
            <p className="text-ink-500 mt-1 min-h-10 text-sm">{plan.description}</p>

            <p className="text-ink-950 mt-4 text-3xl font-semibold tracking-tight">
              {money(plan.monthlyFeeCents, plan.currency)}
              <span className="text-ink-500 text-base font-normal">/mo</span>
            </p>
            <p className="text-ink-500 mt-1 text-xs">
              {percentFromBps(plan.commissionBps)} commission · {plan.maxListings} listing
              {plan.maxListings === 1 ? '' : 's'}
            </p>

            <div className="bg-ink-50 mt-4 rounded-xl px-3.5 py-3">
              <p className="text-ink-500 text-xs">Subscribers</p>
              <p className="text-ink-950 text-lg font-semibold tabular-nums">{plan.subscribers}</p>
              <p className="text-ink-500 text-xs">
                {money(plan.monthlyFeeCents * plan.subscribers)}/mo at list price
              </p>
            </div>

            <ul className="mt-4 flex-1 space-y-1.5">
              {plan.features.map((feature) => (
                <li key={feature} className="text-ink-600 flex gap-2 text-xs">
                  <Icons.check className="text-brand-600 mt-0.5 size-3.5 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <Button variant="secondary" size="sm" className="mt-5 w-full" onClick={() => setEditing(plan)}>
              Edit plan and price
            </Button>
          </Card>
        ))}
      </div>

      <PlanModal
        plan={editing}
        open={editing !== null || creating}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
        onSaved={(message) => {
          setNotice(message);
          plans.reload();
        }}
      />
    </AdminShell>
  );
}

function PlanModal({
  plan,
  open,
  onClose,
  onSaved,
}: {
  plan: AdminPlan | null;
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [commission, setCommission] = useState('');
  const [maxListings, setMaxListings] = useState('1');
  const [features, setFeatures] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(plan?.name ?? '');
    setDescription(plan?.description ?? '');
    setMonthlyFee(plan ? String(dollars(plan.monthlyFeeCents)) : '');
    setCommission(plan ? String(plan.commissionBps / 100) : '10');
    setMaxListings(String(plan?.maxListings ?? 1));
    setFeatures(plan?.features ?? []);
    setIsActive(plan?.isActive ?? true);
    setError(null);
  }, [open, plan]);

  const nextFeeCents = Math.round((Number(monthlyFee) || 0) * 100);
  const priceChanged = plan ? nextFeeCents !== plan.monthlyFeeCents : false;
  const affected = plan?.subscribers ?? 0;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body = {
        name,
        description,
        monthlyFee: Number(monthlyFee),
        commissionPercent: Number(commission),
        maxListings: Number(maxListings),
        features,
        isActive,
      };
      if (plan) {
        const result = await api<{ repriced: number }>(`/admin/plans/${plan.id}`, {
          method: 'PATCH',
          body,
        });
        onSaved(
          result.repriced > 0
            ? `${plan.name} updated. ${pluralise(result.repriced, 'professional')} re-priced to ${money(nextFeeCents)}/mo.`
            : `${plan.name} updated.`,
        );
      } else {
        await api('/admin/plans', { body });
        onSaved(`${name} plan created.`);
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(500, 'error', 'Could not save the plan.'));
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title={plan ? `Edit ${plan.name}` : 'Create a membership plan'}
      description={
        plan
          ? 'Price changes apply to every member on this plan except those with a negotiated fee.'
          : 'Define what this tier costs and what it includes.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            {plan ? 'Save changes' : 'Create plan'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert tone="danger">{error.message}</Alert>}

        <TextInput label="Plan name" required value={name} onChange={(e) => setName(e.target.value)} />
        <TextArea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput
            label="Monthly fee"
            type="number"
            min={0}
            step="1"
            required
            prefix="£"
            value={monthlyFee}
            onChange={(e) => setMonthlyFee(e.target.value)}
            error={error?.fieldError('monthlyFee')}
          />
          <TextInput
            label="Commission %"
            type="number"
            min={0}
            max={100}
            step="0.5"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
          />
          <TextInput
            label="Max listings"
            type="number"
            min={1}
            max={100}
            value={maxListings}
            onChange={(e) => setMaxListings(e.target.value)}
          />
        </div>

        <TagInput
          label="Features"
          hint="Press Enter after each one. Shown on the pricing page."
          values={features}
          onChange={setFeatures}
          placeholder="e.g. Verified badge"
        />

        <Checkbox
          label="Plan is active"
          description="Inactive plans are hidden from the pricing page and sign-up."
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />

        {priceChanged && affected > 0 && (
          <Alert tone="warning" title="This re-prices existing members">
            {pluralise(affected, 'professional')} {affected === 1 ? 'is' : 'are'} on this plan. Anyone
            without a negotiated fee will move from {money(plan?.monthlyFeeCents ?? 0)} to{' '}
            {money(nextFeeCents)} per month, and each change is written to their pricing history.
          </Alert>
        )}
      </div>
    </Modal>
  );
}

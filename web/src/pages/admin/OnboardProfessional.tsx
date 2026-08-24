import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, api } from '../../lib/api';
import { money } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { AdminCategory, AdminPlan, ProfessionalPrivate } from '../../lib/types';
import { Icons } from '../../components/icons';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Select,
  TagInput,
  TextArea,
  TextInput,
  cx,
} from '../../components/ui';
import { AdminShell } from './AdminShell';

function randomPassword(): string {
  const words = ['harbour', 'lantern', 'copper', 'meadow', 'kestrel', 'granite', 'juniper', 'anchor'];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  return `${pick()}-${pick()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function OnboardProfessional() {
  const navigate = useNavigate();
  const categories = useAsync(() => api<{ categories: AdminCategory[] }>('/admin/categories'));
  const plans = useAsync(() => api<{ plans: AdminPlan[] }>('/admin/plans'));

  const [form, setForm] = useState({
    fullName: '',
    displayName: '',
    businessName: '',
    email: '',
    phone: '',
    password: randomPassword(),
    categoryId: '',
    planId: '',
    headline: '',
    bio: '',
    city: '',
    region: '',
    country: 'United Kingdom',
    yearsExperience: '10',
    hourlyRate: '',
    monthlyFee: '',
  });
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(['English']);
  const [customFee, setCustomFee] = useState(false);
  const [verified, setVerified] = useState(true);
  const [publish, setPublish] = useState(true);

  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedPlan = plans.data?.plans.find((p) => String(p.id) === form.planId);
  const effectiveFeeCents = customFee
    ? Math.round((Number(form.monthlyFee) || 0) * 100)
    : (selectedPlan?.monthlyFeeCents ?? 0);

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const result = await api<{ professional: ProfessionalPrivate }>('/admin/professionals', {
        body: {
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          phone: form.phone || undefined,
          categoryId: Number(form.categoryId),
          planId: Number(form.planId),
          displayName: form.displayName || undefined,
          businessName: form.businessName || undefined,
          headline: form.headline,
          bio: form.bio,
          city: form.city,
          region: form.region,
          country: form.country,
          yearsExperience: Number(form.yearsExperience || 0),
          hourlyRate: Number(form.hourlyRate || 0),
          ...(customFee ? { monthlyFee: Number(form.monthlyFee || 0) } : {}),
          specialties,
          languages,
          verificationStatus: verified ? 'verified' : 'pending',
          isPublished: verified && publish,
        },
      });
      navigate(`/admin/professionals/${result.professional.id}?created=1`);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(500, 'error', 'Could not create the profile.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title="Sign up an expert"
      subtitle="Create the login and the directory profile in one step."
      actions={
        <Button variant="secondary" onClick={() => navigate('/admin/professionals')}>
          Cancel
        </Button>
      }
    >
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          {error && <Alert tone="danger">{error.message}</Alert>}

          <Card className="p-6">
            <h2 className="text-ink-950 mb-5 font-semibold">Account</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput
                label="Full name"
                required
                value={form.fullName}
                onChange={(e) => set('fullName', e.target.value)}
                error={error?.fieldError('fullName')}
              />
              <TextInput
                label="Display name"
                hint="Defaults to their full name."
                value={form.displayName}
                onChange={(e) => set('displayName', e.target.value)}
              />
              <TextInput
                label="Email address"
                type="email"
                required
                hint="This is their login."
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                error={error?.fieldError('email')}
              />
              <TextInput
                label="Phone"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
              <div className="sm:col-span-2">
                <TextInput
                  label="Temporary password"
                  required
                  hint="Share this with them securely. They can change it from their dashboard."
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  error={error?.fieldError('password')}
                />
                <button
                  type="button"
                  onClick={() => set('password', randomPassword())}
                  className="text-brand-700 mt-1.5 text-xs font-medium"
                >
                  Generate another
                </button>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-ink-950 mb-5 font-semibold">Field of expertise</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Category"
                required
                value={form.categoryId}
                onChange={(e) => set('categoryId', e.target.value)}
                error={error?.fieldError('categoryId')}
              >
                <option value="">Choose a category…</option>
                {categories.data?.categories
                  .filter((c) => c.isActive)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </Select>
              <TextInput
                label="Business name"
                value={form.businessName}
                onChange={(e) => set('businessName', e.target.value)}
              />
              <TextInput
                label="Headline"
                wrapperClassName="sm:col-span-2"
                placeholder="Gas Safe plumber — boilers, bathrooms and emergency leaks"
                value={form.headline}
                onChange={(e) => set('headline', e.target.value)}
              />
              <TextArea
                label="About"
                wrapperClassName="sm:col-span-2"
                value={form.bio}
                onChange={(e) => set('bio', e.target.value)}
              />
              <TagInput
                label="Specialisms"
                wrapperClassName="sm:col-span-2"
                hint="Press Enter after each one."
                values={specialties}
                onChange={setSpecialties}
                placeholder="e.g. Boiler installation"
              />
              <TagInput label="Languages" values={languages} onChange={setLanguages} />
              <TextInput
                label="Years of experience"
                type="number"
                min={0}
                max={80}
                value={form.yearsExperience}
                onChange={(e) => set('yearsExperience', e.target.value)}
              />
              <TextInput label="Town or city" value={form.city} onChange={(e) => set('city', e.target.value)} />
              <TextInput
                label="County or region"
                value={form.region}
                onChange={(e) => set('region', e.target.value)}
              />
              <TextInput
                label="Country"
                wrapperClassName="sm:col-span-2"
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
              />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-ink-950 font-semibold">Pricing</h2>
            <p className="text-ink-500 mt-1 text-sm">
              The hourly rate is theirs to change later. The monthly fee is set here.
            </p>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <TextInput
                label="Hourly rate"
                type="number"
                min={0}
                step="1"
                required
                prefix="£"
                hint="Shown to clients on their profile."
                value={form.hourlyRate}
                onChange={(e) => set('hourlyRate', e.target.value)}
                error={error?.fieldError('hourlyRate')}
              />
              <Select
                label="Membership plan"
                required
                value={form.planId}
                onChange={(e) => set('planId', e.target.value)}
                error={error?.fieldError('planId')}
              >
                <option value="">Choose a plan…</option>
                {plans.data?.plans
                  .filter((p) => p.isActive)
                  .map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} — {money(plan.monthlyFeeCents)}/mo
                    </option>
                  ))}
              </Select>
            </div>

            <div className="border-ink-100 mt-5 border-t pt-5">
              <Checkbox
                label="Set a bespoke monthly fee"
                description="Overrides the plan price for this professional only. Plan-wide price changes will not affect them."
                checked={customFee}
                onChange={(e) => setCustomFee(e.target.checked)}
              />
              {customFee && (
                <div className="mt-4 max-w-xs">
                  <TextInput
                    label="Negotiated monthly fee"
                    type="number"
                    min={0}
                    step="1"
                    prefix="£"
                    value={form.monthlyFee}
                    onChange={(e) => set('monthlyFee', e.target.value)}
                    error={error?.fieldError('monthlyFee')}
                  />
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-ink-950 mb-4 font-semibold">Verification</h2>
            <div className="space-y-3">
              <Checkbox
                label="Mark as verified"
                description="Confirms you have checked their credentials. Required before they can be listed."
                checked={verified}
                onChange={(e) => {
                  setVerified(e.target.checked);
                  if (!e.target.checked) setPublish(false);
                }}
              />
              <Checkbox
                label="Publish to the directory immediately"
                description="They appear in search as soon as you save."
                checked={publish}
                disabled={!verified}
                onChange={(e) => setPublish(e.target.checked)}
              />
            </div>
          </Card>
        </div>

        {/* Summary rail */}
        <aside>
          <Card className="p-6 lg:sticky lg:top-24">
            <h2 className="text-ink-950 text-sm font-semibold">Summary</h2>

            <dl className="mt-4 space-y-3 text-sm">
              <SummaryRow label="Name" value={form.displayName || form.fullName || '—'} />
              <SummaryRow
                label="Field"
                value={
                  categories.data?.categories.find((c) => String(c.id) === form.categoryId)?.name ?? '—'
                }
              />
              <SummaryRow
                label="Hourly rate"
                value={form.hourlyRate ? `${money(Math.round(Number(form.hourlyRate) * 100))}/hr` : '—'}
              />
              <SummaryRow label="Plan" value={selectedPlan?.name ?? '—'} />
            </dl>

            <div className="border-ink-100 mt-5 border-t pt-5">
              <p className="text-ink-500 text-xs font-medium tracking-wide uppercase">
                They will be charged
              </p>
              <p className="text-ink-950 mt-1.5 text-3xl font-semibold tracking-tight">
                {money(effectiveFeeCents)}
                <span className="text-ink-500 text-base font-normal"> /month</span>
              </p>
              {customFee && selectedPlan && effectiveFeeCents !== selectedPlan.monthlyFeeCents && (
                <p
                  className={cx(
                    'mt-1 text-xs font-medium',
                    effectiveFeeCents < selectedPlan.monthlyFeeCents ? 'text-emerald-600' : 'text-amber-600',
                  )}
                >
                  {effectiveFeeCents < selectedPlan.monthlyFeeCents ? 'Discounted' : 'Uplifted'} from the{' '}
                  {money(selectedPlan.monthlyFeeCents)} list price
                </p>
              )}
            </div>

            <div className="border-ink-100 mt-5 space-y-2 border-t pt-5">
              <StatusLine ok={verified} label={verified ? 'Verified' : 'Pending verification'} />
              <StatusLine
                ok={verified && publish}
                label={verified && publish ? 'Live in the directory' : 'Not listed publicly'}
              />
            </div>

            <Button type="submit" size="lg" className="mt-6 w-full" loading={saving}>
              Create professional
            </Button>
            <p className="text-ink-500 mt-3 text-center text-xs">
              They can sign in immediately with the temporary password.
            </p>
          </Card>
        </aside>
      </form>
    </AdminShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-ink-900 truncate text-right font-medium">{value}</dd>
    </div>
  );
}

function StatusLine({ ok, label }: { ok: boolean; label: string }) {
  return (
    <p className={cx('flex items-center gap-2 text-sm', ok ? 'text-emerald-700' : 'text-ink-500')}>
      {ok ? (
        <Icons.checkCircle className="size-4" />
      ) : (
        <span className="border-ink-300 size-4 rounded-full border" />
      )}
      {label}
    </p>
  );
}

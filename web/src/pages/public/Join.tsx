import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { money } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { Category, Plan } from '../../lib/types';
import { Icons } from '../../components/icons';
import { Alert, Button, Card, Select, TagInput, TextArea, TextInput, cx } from '../../components/ui';

export function Join() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const categories = useAsync(() => api<{ categories: Category[] }>('/directory/categories'));
  const plans = useAsync(() => api<{ plans: Plan[] }>('/directory/plans'));

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    businessName: '',
    categoryId: '',
    planId: '',
    headline: '',
    bio: '',
    city: '',
    region: '',
    country: 'United Kingdom',
    yearsExperience: '5',
    hourlyRate: '',
  });
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const planFromUrl = params.get('plan');
  const selectedPlanId =
    form.planId ||
    (planFromUrl ? String(plans.data?.plans.find((p) => p.slug === planFromUrl)?.id ?? '') : '');
  const selectedPlan = plans.data?.plans.find((p) => String(p.id) === selectedPlanId);

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api('/directory/applications', {
        body: {
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          phone: form.phone || undefined,
          categoryId: Number(form.categoryId),
          planId: Number(selectedPlanId),
          businessName: form.businessName || undefined,
          headline: form.headline,
          bio: form.bio,
          city: form.city,
          region: form.region,
          country: form.country,
          yearsExperience: Number(form.yearsExperience || 0),
          hourlyRate: Number(form.hourlyRate || 0),
          specialties,
        },
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(500, 'error', 'Could not send your application.'));
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="container-page py-20">
        <Card className="mx-auto max-w-lg p-10 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Icons.checkCircle className="size-7" />
          </span>
          <h1 className="text-ink-950 mt-6 text-2xl font-semibold tracking-tight">Application received</h1>
          <p className="text-ink-600 mt-3 leading-relaxed">
            Our team will verify your credentials before your profile goes live in the directory. You can
            sign in now to finish your profile while you wait.
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <Button
              onClick={async () => {
                try {
                  await login(form.email, form.password);
                  navigate('/dashboard');
                } catch {
                  navigate('/login');
                }
              }}
            >
              Go to my dashboard
            </Button>
            <Button variant="secondary" onClick={() => navigate('/')}>
              Back to home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-page py-14">
      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <header className="mb-8">
            <h1 className="text-ink-950 text-3xl font-semibold tracking-tight">
              Apply to join ProConnect
            </h1>
            <p className="text-ink-500 mt-2">
              Tell us what you do and what you charge. We verify every applicant before they appear in the
              directory.
            </p>
          </header>

          <form onSubmit={submit} className="space-y-8">
            {error && <Alert tone="danger">{error.message}</Alert>}

            <Card className="p-6">
              <h2 className="text-ink-950 mb-5 font-semibold">Your account</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput
                  label="Full name"
                  required
                  value={form.fullName}
                  onChange={(e) => set('fullName', e.target.value)}
                  error={error?.fieldError('fullName')}
                />
                <TextInput
                  label="Business name"
                  hint="Optional — leave blank if you trade under your own name."
                  value={form.businessName}
                  onChange={(e) => set('businessName', e.target.value)}
                />
                <TextInput
                  label="Email address"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  error={error?.fieldError('email')}
                />
                <TextInput
                  label="Phone"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                />
                <TextInput
                  label="Password"
                  type="password"
                  required
                  hint="At least 8 characters."
                  wrapperClassName="sm:col-span-2"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  error={error?.fieldError('password')}
                />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-ink-950 mb-5 font-semibold">Your practice</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Field of expertise"
                  required
                  value={form.categoryId}
                  onChange={(e) => set('categoryId', e.target.value)}
                  error={error?.fieldError('categoryId')}
                >
                  <option value="">Choose a category…</option>
                  {categories.data?.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
                <TextInput
                  label="Years of experience"
                  type="number"
                  min={0}
                  max={80}
                  value={form.yearsExperience}
                  onChange={(e) => set('yearsExperience', e.target.value)}
                />
                <TextInput
                  label="Headline"
                  required
                  wrapperClassName="sm:col-span-2"
                  hint="One sentence that tells a client what you do."
                  placeholder="NICEIC approved electrician — rewires, EICRs and EV chargers"
                  value={form.headline}
                  onChange={(e) => set('headline', e.target.value)}
                  error={error?.fieldError('headline')}
                />
                <TextArea
                  label="About you"
                  wrapperClassName="sm:col-span-2"
                  placeholder="What you specialise in, who you typically work with, how you like to work…"
                  value={form.bio}
                  onChange={(e) => set('bio', e.target.value)}
                />
                <TagInput
                  label="Specialisms"
                  wrapperClassName="sm:col-span-2"
                  hint="Press Enter after each one."
                  values={specialties}
                  onChange={setSpecialties}
                  placeholder="e.g. Full rewires"
                />
                <TextInput
                  label="Town or city"
                  required
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                  error={error?.fieldError('city')}
                />
                <TextInput
                  label="County or region"
                  value={form.region}
                  onChange={(e) => set('region', e.target.value)}
                />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-ink-950 font-semibold">Your pricing</h2>
              <p className="text-ink-500 mt-1 text-sm">
                You set this, and you can change it any time from your dashboard.
              </p>
              <div className="mt-5 max-w-xs">
                <TextInput
                  label="Hourly rate"
                  type="number"
                  min={0}
                  step="1"
                  required
                  prefix="£"
                  value={form.hourlyRate}
                  onChange={(e) => set('hourlyRate', e.target.value)}
                  error={error?.fieldError('hourlyRate')}
                />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-ink-950 font-semibold">Membership plan</h2>
              <p className="text-ink-500 mt-1 text-sm">This is what you pay us each month.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {plans.data?.plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => set('planId', String(plan.id))}
                    className={cx(
                      'rounded-xl border p-4 text-left transition',
                      String(plan.id) === selectedPlanId
                        ? 'border-brand-600 bg-brand-50/50 ring-1 ring-brand-600'
                        : 'border-ink-200 hover:border-ink-300',
                    )}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-ink-950 font-medium">{plan.name}</span>
                      <span className="text-ink-900 text-sm font-semibold">
                        {money(plan.monthlyFeeCents, plan.currency)}/mo
                      </span>
                    </div>
                    <p className="text-ink-500 mt-1 text-xs">{plan.description}</p>
                  </button>
                ))}
              </div>
              {error?.fieldError('planId') && (
                <p className="mt-2 text-xs font-medium text-rose-600">{error.fieldError('planId')}</p>
              )}
            </Card>

            <div className="flex items-center justify-between gap-4">
              <p className="text-ink-500 text-sm">
                Already applied?{' '}
                <Link to="/login" className="text-brand-700 font-medium">
                  Sign in
                </Link>
              </p>
              <Button type="submit" size="lg" loading={loading}>
                Submit application
              </Button>
            </div>
          </form>
        </div>

        <aside>
          <Card className="p-6 lg:sticky lg:top-24">
            <h2 className="text-ink-950 text-sm font-semibold">What happens next</h2>
            <ol className="mt-4 space-y-4">
              {[
                ['We check your credentials', 'Usually the same working week.'],
                ['Your profile goes live', 'With a verified badge and your published hourly rate.'],
                ['Enquiries start arriving', 'Each one includes the job, date and expected hours.'],
              ].map(([title, body], index) => (
                <li key={title} className="flex gap-3">
                  <span className="bg-ink-100 text-ink-700 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-ink-900 text-sm font-medium">{title}</p>
                    <p className="text-ink-500 text-xs">{body}</p>
                  </div>
                </li>
              ))}
            </ol>

            {selectedPlan && (
              <div className="border-ink-100 mt-6 border-t pt-5">
                <p className="text-ink-500 text-xs font-medium tracking-wide uppercase">Selected plan</p>
                <p className="text-ink-950 mt-1.5 font-semibold">{selectedPlan.name}</p>
                <p className="text-ink-900 text-2xl font-semibold tracking-tight">
                  {money(selectedPlan.monthlyFeeCents, selectedPlan.currency)}
                  <span className="text-ink-500 text-sm font-normal"> /month</span>
                </p>
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

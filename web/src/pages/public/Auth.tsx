import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { homeFor, useAuth } from '../../lib/auth';
import { Logo } from '../../components/Layout';
import { Alert, Button, Card, TextInput } from '../../components/ui';
import { Icons } from '../../components/icons';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@proconnect.test', password: 'admin1234', hint: 'Full platform control' },
  {
    label: 'Professional',
    email: 'james.whitfield@example.com',
    password: 'password123',
    hint: 'Electrician, Premier plan',
  },
  { label: 'Client', email: 'client@proconnect.test', password: 'password123', hint: 'Has live bookings' },
];

function AuthShell({ title, subtitle, children, aside }: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="container-page grid gap-12 py-14 lg:grid-cols-2 lg:py-20">
      <div className="mx-auto w-full max-w-md">
        <Logo className="mb-8" />
        <h1 className="text-ink-950 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-ink-500 mt-2">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
      {aside && <div className="hidden lg:block">{aside}</div>}
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(next ?? homeFor(user.role));
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(500, 'error', 'Could not sign in.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your bookings, profile or the platform."
      aside={
        <Card className="p-6">
          <p className="text-ink-950 text-sm font-semibold">Demo accounts</p>
          <p className="text-ink-500 mt-1 text-sm">
            This is a demonstration build. Pick a role to sign in instantly.
          </p>
          <div className="mt-4 space-y-2.5">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                }}
                className="border-ink-200 hover:border-brand-300 hover:bg-brand-50/40 flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition"
              >
                <span>
                  <span className="text-ink-900 block text-sm font-medium">{account.label}</span>
                  <span className="text-ink-500 block text-xs">{account.email}</span>
                </span>
                <span className="text-ink-400 shrink-0 text-xs">{account.hint}</span>
              </button>
            ))}
          </div>
        </Card>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="danger">{error.message}</Alert>}
        <TextInput
          label="Email address"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextInput
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>
      <p className="text-ink-500 mt-6 text-sm">
        New here?{' '}
        <Link to="/signup" className="text-brand-700 font-medium">
          Create a free client account
        </Link>{' '}
        or{' '}
        <Link to="/join" className="text-brand-700 font-medium">
          apply as a professional
        </Link>
        .
      </p>
    </AuthShell>
  );
}

export function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await signup({ email, password, fullName, phone: phone || undefined });
      navigate(next ?? homeFor(user.role));
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(500, 'error', 'Could not create your account.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your free account"
      subtitle="Book professionals, track the work and keep every estimate in one place."
      aside={
        <Card className="p-8">
          <h2 className="text-ink-950 text-lg font-semibold">What you get</h2>
          <ul className="mt-5 space-y-4">
            {[
              ['Transparent pricing', 'Every professional publishes their hourly rate before you enquire.'],
              ['Locked-in estimates', 'Your quote is fixed to the rate advertised when you booked.'],
              ['Verified professionals', 'We check identity and trade credentials before anyone is listed.'],
              ['One place for everything', 'Requests, accepted jobs, logged hours and reviews together.'],
            ].map(([title, body]) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 rounded-lg bg-emerald-50 p-1.5 text-emerald-600">
                  <Icons.check className="size-4" />
                </span>
                <div>
                  <p className="text-ink-900 text-sm font-medium">{title}</p>
                  <p className="text-ink-500 text-sm">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="danger">{error.message}</Alert>}
        <TextInput
          label="Full name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={error?.fieldError('fullName')}
        />
        <TextInput
          label="Email address"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error?.fieldError('email')}
        />
        <TextInput
          label="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <TextInput
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 8 characters."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error?.fieldError('password')}
        />
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Create account
        </Button>
      </form>
      <p className="text-ink-500 mt-6 text-sm">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-700 font-medium">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

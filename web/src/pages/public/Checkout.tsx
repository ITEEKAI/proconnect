import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { money } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { Alert, Button, Card } from '../../components/ui';
import { Icons } from '../../components/icons';

interface CheckoutSession {
  id: string;
  provider: 'stripe' | 'demo';
  kind: 'booking' | 'membership';
  status: 'pending' | 'paid' | 'cancelled';
  amountCents: number;
  currency: string;
  description: string;
  successPath: string;
  cancelPath: string;
}

export function CheckoutPage() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const session = useAsync(
    () => api<{ session: CheckoutSession }>(`/payments/sessions/${sessionId}`),
    [sessionId],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const data = session.data?.session;

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ session: CheckoutSession }>(`/payments/sessions/${sessionId}/complete`, {
        body: {},
      });
      const paid = result.session;
      navigate(`${paid.successPath}?checkout=success&session_id=${encodeURIComponent(paid.id)}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not complete this payment.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-page max-w-lg py-14">
      <p className="text-brand-700 text-xs font-semibold tracking-wide uppercase">Secure checkout</p>
      <h1 className="text-ink-950 mt-2 text-3xl font-semibold tracking-tight">Pay SimplyServices</h1>
      <p className="text-ink-500 mt-2 text-sm">
        Test checkout — no real card is charged until Stripe keys are set on the server.
      </p>

      {session.loading && <p className="text-ink-500 mt-10 text-sm">Loading checkout…</p>}
      {session.error && (
        <div className="mt-8">
          <Alert tone="danger">{session.error.message}</Alert>
          <Link to="/login" className="text-brand-700 mt-4 inline-block text-sm font-medium">
            Sign in to continue
          </Link>
        </div>
      )}

      {data && data.status === 'paid' && (
        <Card className="mt-8 p-6">
          <Alert tone="success" title="Already paid">
            This checkout has already been completed.
          </Alert>
          <Button className="mt-4" onClick={() => navigate(data.successPath)}>
            Continue
          </Button>
        </Card>
      )}

      {data && data.status === 'pending' && (
        <Card className="mt-8 p-6">
          {error && (
            <div className="mb-4">
              <Alert tone="danger">{error}</Alert>
            </div>
          )}
          <p className="text-ink-500 text-xs font-medium tracking-wide uppercase">
            {data.kind === 'booking' ? 'Job invoice' : 'Membership invoice'}
          </p>
          <p className="text-ink-950 mt-1 font-medium">{data.description}</p>
          <p className="text-ink-950 mt-4 text-3xl font-semibold tabular-nums">
            {money(data.amountCents, data.currency)}
          </p>

          <div className="border-ink-200 mt-6 space-y-3 rounded-xl border p-4">
            <label className="label-text">Card number</label>
            <input className="field font-mono" readOnly value="4242 4242 4242 4242" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text">Expiry</label>
                <input className="field font-mono" readOnly value="12 / 34" />
              </div>
              <div>
                <label className="label-text">CVC</label>
                <input className="field font-mono" readOnly value="123" />
              </div>
            </div>
            <p className="text-ink-500 text-xs">
              Stripe test card. When you add live keys, customers are sent to Stripe Checkout instead of this
              page.
            </p>
          </div>

          <Button className="mt-5 w-full" size="lg" loading={busy} onClick={() => void pay()}>
            Pay {money(data.amountCents, data.currency)}
          </Button>
          <Link
            to={data.cancelPath}
            className="text-ink-500 mt-3 flex items-center justify-center gap-1 text-sm"
          >
            <Icons.arrowRight className="size-3.5 rotate-180" /> Cancel
          </Link>
        </Card>
      )}
    </div>
  );
}

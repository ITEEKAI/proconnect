import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { CLIENT, ELECTRICIAN, startTestServer, type TestContext } from './harness.ts';

describe('checkout payments', () => {
  let ctx: TestContext;
  let clientToken: string;
  let proToken: string;
  let unpaidBookingId: number;
  let dueInvoiceId: number;

  before(async () => {
    ctx = await startTestServer();
    clientToken = await ctx.login(CLIENT.email, CLIENT.password);
    proToken = await ctx.login(ELECTRICIAN.email, ELECTRICIAN.password);

    const bookings = await ctx.request('/api/bookings', { token: clientToken });
    const unpaid = (bookings.body.bookings as Array<{ id: number; status: string; paymentStatus: string }>).find(
      (row) => row.status === 'completed' && row.paymentStatus === 'unpaid',
    );
    assert.ok(unpaid, 'seed should include an unpaid completed job for the demo client');
    unpaidBookingId = unpaid.id;

    const billing = await ctx.request('/api/professional/billing', { token: proToken });
    const due = (billing.body.invoices as Array<{ id: number; status: string }>).find((row) => row.status === 'due');
    assert.ok(due, 'seed should include a due membership invoice for the electrician');
    dueInvoiceId = due.id;
  });
  after(async () => ctx.close());

  it('exposes demo checkout when Stripe keys are not set', async () => {
    const res = await ctx.request('/api/payments/config');
    assert.equal(res.status, 200);
    assert.equal(res.body.provider, 'demo');
    assert.equal(res.body.testMode, true);
  });

  it('starts a job checkout and records payment through the test page', async () => {
    const started = await ctx.request(`/api/bookings/${unpaidBookingId}/pay`, { token: clientToken, json: {} });
    assert.equal(started.status, 200);
    assert.equal(started.body.provider, 'demo');
    assert.match(String(started.body.url), /\/checkout\/demo_/);
    const sessionId = started.body.sessionId as string;

    const session = await ctx.request(`/api/payments/sessions/${sessionId}`, { token: clientToken });
    assert.equal(session.status, 200);
    assert.equal(session.body.session.status, 'pending');
    assert.equal(session.body.session.kind, 'booking');
    assert.ok(session.body.session.amountCents > 0);

    const stranger = await ctx.login('megan.foster@example.com', 'password123');
    const blocked = await ctx.request(`/api/payments/sessions/${sessionId}/complete`, { token: stranger, json: {} });
    assert.equal(blocked.status, 403);

    const paid = await ctx.request(`/api/payments/sessions/${sessionId}/complete`, { token: clientToken, json: {} });
    assert.equal(paid.status, 200);
    assert.equal(paid.body.session.status, 'paid');

    const booking = await ctx.request(`/api/bookings/${unpaidBookingId}`, { token: clientToken });
    assert.equal(booking.body.booking.paymentStatus, 'paid');

    const again = await ctx.request(`/api/bookings/${unpaidBookingId}/pay`, { token: clientToken, json: {} });
    assert.equal(again.status, 400);

    const plumberToken = await ctx.login('kwame.mensah@example.com', 'password123');
    const inbox = await ctx.request('/api/notifications', { token: plumberToken });
    assert.ok(inbox.body.notifications.some((n: { type: string }) => n.type === 'booking.paid'));
  });

  it('refuses to start checkout before the job is complete', async () => {
    const bookings = await ctx.request('/api/bookings', { token: clientToken });
    const open = (bookings.body.bookings as Array<{ id: number; status: string }>).find(
      (row) => row.status === 'requested',
    );
    assert.ok(open);
    const res = await ctx.request(`/api/bookings/${open.id}/pay`, { token: clientToken, json: {} });
    assert.equal(res.status, 400);
  });

  it('lets a professional pay a due membership invoice through the test checkout', async () => {
    const started = await ctx.request(`/api/professional/invoices/${dueInvoiceId}/pay`, {
      token: proToken,
      json: {},
    });
    assert.equal(started.status, 200);
    assert.equal(started.body.provider, 'demo');
    const sessionId = started.body.sessionId as string;

    const clientBlocked = await ctx.request(`/api/payments/sessions/${sessionId}/complete`, {
      token: clientToken,
      json: {},
    });
    assert.equal(clientBlocked.status, 403);

    const paid = await ctx.request(`/api/payments/sessions/${sessionId}/complete`, { token: proToken, json: {} });
    assert.equal(paid.status, 200);

    const billing = await ctx.request('/api/professional/billing', { token: proToken });
    const invoice = (billing.body.invoices as Array<{ id: number; status: string }>).find(
      (row) => row.id === dueInvoiceId,
    );
    assert.equal(invoice?.status, 'paid');
  });
});

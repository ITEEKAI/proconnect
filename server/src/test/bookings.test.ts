import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { ADMIN, CLIENT, ELECTRICIAN, startTestServer, type TestContext } from './harness.ts';

describe('bookings', () => {
  let ctx: TestContext;
  let clientToken: string;
  let proToken: string;
  let proId: number;
  let bookingId: number;

  before(async () => {
    ctx = await startTestServer();
    clientToken = await ctx.login(CLIENT.email, CLIENT.password);
    proToken = await ctx.login(ELECTRICIAN.email, ELECTRICIAN.password);
    const me = await ctx.request('/api/auth/me', { token: proToken });
    proId = me.body.professional.id;
  });
  after(async () => ctx.close());

  it('quotes the estimate from the rate advertised at booking time', async () => {
    const res = await ctx.request('/api/bookings', {
      token: clientToken,
      json: {
        professionalId: proId,
        subject: 'Consumer unit replacement',
        details: 'Old wylex board, needs bringing up to 18th edition.',
        scheduledFor: '2026-11-02T09:00',
        estimatedHours: 5,
      },
    });
    assert.equal(res.status, 201);
    bookingId = res.body.booking.id;

    // 5h at £68 plus the £45 call-out fee.
    assert.equal(res.body.booking.hourlyRateCents, 6800);
    assert.equal(res.body.booking.calloutFeeCents, 4500);
    assert.equal(res.body.booking.estimatedTotalCents, 6800 * 5 + 4500);
    assert.equal(res.body.booking.status, 'requested');
    assert.match(res.body.booking.reference, /^PC-[A-Z2-9]{6}$/);
  });

  it('keeps the original rate on an existing booking after the pro raises their price', async () => {
    await ctx.request('/api/professional/rates', {
      method: 'PUT',
      token: proToken,
      json: { hourlyRate: 95 },
    });

    const res = await ctx.request(`/api/bookings/${bookingId}`, { token: clientToken });
    assert.equal(res.body.booking.hourlyRateCents, 6800);

    const fresh = await ctx.request('/api/bookings', {
      token: clientToken,
      json: {
        professionalId: proId,
        subject: 'Second job at the new rate',
        scheduledFor: '2026-11-20T09:00',
        estimatedHours: 2,
      },
    });
    assert.equal(fresh.body.booking.hourlyRateCents, 9500);
  });

  it('enforces the professional’s minimum engagement', async () => {
    await ctx.request('/api/professional/rates', {
      method: 'PUT',
      token: proToken,
      json: { hourlyRate: 95, minimumHours: 3 },
    });

    const res = await ctx.request('/api/bookings', {
      token: clientToken,
      json: {
        professionalId: proId,
        subject: 'Quick socket swap',
        scheduledFor: '2026-12-01T09:00',
        estimatedHours: 1,
      },
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error.message, /3 hour minimum/);
  });

  it('shows the request in the professional’s queue', async () => {
    const res = await ctx.request('/api/bookings', { token: proToken });
    assert.ok(res.body.bookings.some((b: { id: number }) => b.id === bookingId));

    const dashboard = await ctx.request('/api/professional/dashboard', { token: proToken });
    assert.ok(dashboard.body.metrics.pendingRequests >= 1);
  });

  it('will not let another client read someone else’s booking', async () => {
    const otherToken = await ctx.login('megan.foster@example.com', 'password123');
    const res = await ctx.request(`/api/bookings/${bookingId}`, { token: otherToken });
    assert.equal(res.status, 403);
  });

  it('lets the professional accept and then complete with logged hours', async () => {
    const accepted = await ctx.request(`/api/bookings/${bookingId}/status`, {
      token: proToken,
      json: { status: 'accepted' },
    });
    assert.equal(accepted.body.booking.status, 'accepted');

    const completed = await ctx.request(`/api/bookings/${bookingId}/status`, {
      token: proToken,
      json: { status: 'completed', loggedHours: 6.5, note: 'Extra circuit needed replacing.' },
    });
    assert.equal(completed.body.booking.status, 'completed');
    assert.equal(completed.body.booking.loggedHours, 6.5);
    // Billed at the booked rate, not the pro's current one.
    assert.equal(completed.body.booking.totalCents, Math.round(6800 * 6.5) + 4500);
  });

  it('rejects an invalid status transition', async () => {
    const res = await ctx.request(`/api/bookings/${bookingId}/status`, {
      token: proToken,
      json: { status: 'accepted' },
    });
    assert.equal(res.status, 400);
  });

  it('lets the client review a completed booking exactly once', async () => {
    const first = await ctx.request(`/api/bookings/${bookingId}/review`, {
      token: clientToken,
      json: { rating: 5, comment: 'Fast, tidy and properly certified.' },
    });
    assert.equal(first.status, 201);

    const second = await ctx.request(`/api/bookings/${bookingId}/review`, {
      token: clientToken,
      json: { rating: 1, comment: 'Changed my mind.' },
    });
    assert.equal(second.status, 409);
  });

  it('folds the new review into the public rating', async () => {
    const res = await ctx.request('/api/directory/professionals/james-whitfield-manchester');
    assert.ok(res.body.reviews.some((r: { comment: string }) => r.comment.startsWith('Fast, tidy')));
    assert.ok(res.body.professional.rating.count >= 3);
  });

  it('refuses a review on a booking that is not complete', async () => {
    const created = await ctx.request('/api/bookings', {
      token: clientToken,
      json: {
        professionalId: proId,
        subject: 'Outside light',
        scheduledFor: '2027-01-05T09:00',
        estimatedHours: 3,
      },
    });
    const res = await ctx.request(`/api/bookings/${created.body.booking.id}/review`, {
      token: clientToken,
      json: { rating: 5 },
    });
    assert.equal(res.status, 400);
  });

  it('lets the client cancel an open booking', async () => {
    const created = await ctx.request('/api/bookings', {
      token: clientToken,
      json: {
        professionalId: proId,
        subject: 'Garden lighting',
        scheduledFor: '2027-02-05T09:00',
        estimatedHours: 4,
      },
    });
    const res = await ctx.request(`/api/bookings/${created.body.booking.id}/cancel`, {
      method: 'POST',
      token: clientToken,
    });
    assert.equal(res.body.booking.status, 'cancelled');
  });

  it('surfaces every booking to an admin', async () => {
    const adminToken = await ctx.login(ADMIN.email, ADMIN.password);
    const res = await ctx.request('/api/admin/bookings', { token: adminToken });
    assert.ok(res.body.bookings.length >= 8);
  });

  it('counts completed work in the professional’s lifetime earnings', async () => {
    const res = await ctx.request('/api/professional/dashboard', { token: proToken });
    assert.ok(res.body.metrics.completedJobs >= 1);
    assert.ok(res.body.metrics.lifetimeEarningsCents >= 6800 * 6.5);
  });
});

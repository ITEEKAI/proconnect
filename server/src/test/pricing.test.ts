import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { ADMIN, ELECTRICIAN, startTestServer, type TestContext } from './harness.ts';

/**
 * The two pricing levers the platform is built around:
 *   - a professional sets their own hourly rate;
 *   - an admin sets the monthly membership fee.
 * Both are audited.
 */
describe('pricing controls', () => {
  let ctx: TestContext;
  let adminToken: string;
  let proToken: string;
  let proId: number;

  before(async () => {
    ctx = await startTestServer();
    adminToken = await ctx.login(ADMIN.email, ADMIN.password);
    proToken = await ctx.login(ELECTRICIAN.email, ELECTRICIAN.password);
    const me = await ctx.request('/api/auth/me', { token: proToken });
    proId = me.body.professional.id;
  });
  after(async () => ctx.close());

  it('lets a professional change their own hourly rate', async () => {
    const res = await ctx.request('/api/professional/rates', {
      method: 'PUT',
      token: proToken,
      json: { hourlyRate: 79.5, calloutFee: 50, minimumHours: 1.5, reason: 'Annual increase' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.professional.pricing.hourlyRateCents, 7950);
    assert.equal(res.body.professional.pricing.calloutFeeCents, 5000);
    assert.equal(res.body.professional.pricing.minimumHours, 1.5);
  });

  it('records the hourly rate change against the professional', async () => {
    const res = await ctx.request('/api/professional/rates/history', { token: proToken });
    const latest = res.body.rateHistory.find((r: { field: string }) => r.field === 'hourly_rate_cents');
    assert.equal(latest.new_value, 7950);
    assert.equal(latest.old_value, 6800);
    assert.equal(latest.changed_by_role, 'professional');
    assert.equal(latest.reason, 'Annual increase');
  });

  it('shows the new rate on the public profile', async () => {
    const res = await ctx.request('/api/directory/professionals/james-whitfield-manchester');
    assert.equal(res.body.professional.pricing.hourlyRateCents, 7950);
  });

  it('will not let a professional touch their own monthly fee', async () => {
    const before = await ctx.request('/api/professional/billing', { token: proToken });
    const res = await ctx.request(`/api/admin/professionals/${proId}/fee`, {
      method: 'PUT',
      token: proToken,
      json: { monthlyFee: 0 },
    });
    assert.equal(res.status, 403);

    const after = await ctx.request('/api/professional/billing', { token: proToken });
    assert.equal(after.body.billing.monthlyFeeCents, before.body.billing.monthlyFeeCents);
  });

  it('lets an admin set a bespoke monthly fee and flags it as an override', async () => {
    const res = await ctx.request(`/api/admin/professionals/${proId}/fee`, {
      method: 'PUT',
      token: adminToken,
      json: { monthlyFee: 59, reason: 'Loyalty discount' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.professional.billing.monthlyFeeCents, 5900);
    assert.equal(res.body.professional.billing.feeIsOverridden, true);

    const entry = res.body.rateHistory.find((r: { field: string }) => r.field === 'monthly_fee_cents');
    assert.equal(entry.new_value, 5900);
    assert.equal(entry.changed_by_role, 'admin');
    assert.equal(entry.reason, 'Loyalty discount');
  });

  it('surfaces the admin fee change in the professional’s own billing view', async () => {
    const res = await ctx.request('/api/professional/billing', { token: proToken });
    assert.equal(res.body.billing.monthlyFeeCents, 5900);
    assert.equal(res.body.billing.feeIsOverridden, true);
  });

  it('moving a professional to another plan adopts that plan’s price', async () => {
    const plans = await ctx.request('/api/admin/plans', { token: adminToken });
    const premier = plans.body.plans.find((p: { slug: string }) => p.slug === 'premier');

    const res = await ctx.request(`/api/admin/professionals/${proId}/fee`, {
      method: 'PUT',
      token: adminToken,
      json: { planId: premier.id, useplanPrice: true },
    });
    assert.equal(res.body.professional.billing.planSlug, 'premier');
    assert.equal(res.body.professional.billing.monthlyFeeCents, premier.monthlyFeeCents);
    assert.equal(res.body.professional.billing.feeIsOverridden, false);
  });

  it('re-prices plan members when the plan price changes, skipping overridden fees', async () => {
    const plans = await ctx.request('/api/admin/plans', { token: adminToken });
    const starter = plans.body.plans.find((p: { slug: string }) => p.slug === 'starter');

    // Give one starter member a bespoke fee so we can prove they are skipped.
    const all = await ctx.request('/api/admin/professionals', { token: adminToken });
    const starterMembers = all.body.professionals.filter(
      (p: { billing: { planSlug: string } }) => p.billing.planSlug === 'starter',
    );
    assert.ok(starterMembers.length >= 2, 'need at least two starter members for this test');
    const [overridden, ...followers] = starterMembers;

    await ctx.request(`/api/admin/professionals/${overridden.id}/fee`, {
      method: 'PUT',
      token: adminToken,
      json: { monthlyFee: 12, reason: 'Founding member rate' },
    });

    const res = await ctx.request(`/api/admin/plans/${starter.id}`, {
      method: 'PATCH',
      token: adminToken,
      json: { monthlyFee: 39 },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.repriced, followers.length);

    const after = await ctx.request('/api/admin/professionals', { token: adminToken });
    const findById = (id: number) => after.body.professionals.find((p: { id: number }) => p.id === id);

    assert.equal(findById(overridden.id).billing.monthlyFeeCents, 1200, 'overridden fee must survive a re-price');
    for (const follower of followers) {
      assert.equal(findById(follower.id).billing.monthlyFeeCents, 3900);
    }
  });

  it('lets a professional switch their own plan, which clears any override', async () => {
    const plans = await ctx.request('/api/directory/plans');
    const professionalPlan = plans.body.plans.find((p: { slug: string }) => p.slug === 'professional');

    const res = await ctx.request('/api/professional/plan', {
      token: proToken,
      json: { planId: professionalPlan.id },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.professional.billing.planSlug, 'professional');
    assert.equal(res.body.professional.billing.monthlyFeeCents, professionalPlan.monthlyFeeCents);
    assert.equal(res.body.professional.billing.feeIsOverridden, false);
  });

  it('rejects a negative hourly rate', async () => {
    const res = await ctx.request('/api/professional/rates', {
      method: 'PUT',
      token: proToken,
      json: { hourlyRate: -10 },
    });
    assert.equal(res.status, 400);
  });

  it('writes an audit event for every admin fee change', async () => {
    const res = await ctx.request('/api/admin/audit', { token: adminToken });
    const feeEvents = res.body.events.filter((e: { action: string }) => e.action === 'professional.fee_change');
    assert.ok(feeEvents.length >= 2);
    assert.equal(feeEvents[0].actor_email, ADMIN.email);
  });
});

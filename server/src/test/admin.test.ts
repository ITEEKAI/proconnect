import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { ADMIN, startTestServer, type TestContext } from './harness.ts';

describe('admin management', () => {
  let ctx: TestContext;
  let token: string;

  before(async () => {
    ctx = await startTestServer();
    token = await ctx.login(ADMIN.email, ADMIN.password);
  });
  after(async () => ctx.close());

  it('reports platform-wide totals including recurring revenue', async () => {
    const res = await ctx.request('/api/admin/overview', { token });
    assert.equal(res.status, 200);
    assert.ok(res.body.totals.professionals >= 14);
    assert.ok(res.body.totals.monthlyRecurringRevenueCents > 0);
    assert.ok(res.body.byCategory.length >= 10);
    assert.ok(res.body.byPlan.length >= 4);
  });

  it('onboards an expert, creating both the login and the profile', async () => {
    const categories = await ctx.request('/api/admin/categories', { token });
    const plans = await ctx.request('/api/admin/plans', { token });
    const lawyers = categories.body.categories.find((c: { slug: string }) => c.slug === 'lawyers');
    const professional = plans.body.plans.find((p: { slug: string }) => p.slug === 'professional');

    const res = await ctx.request('/api/admin/professionals', {
      token,
      json: {
        email: 'new.expert@example.com',
        password: 'onboard-me-1',
        fullName: 'Ines Delgado',
        categoryId: lawyers.id,
        planId: professional.id,
        headline: 'Immigration solicitor',
        city: 'London',
        country: 'United Kingdom',
        yearsExperience: 9,
        hourlyRate: 195,
        specialties: ['Visas', 'Sponsor licences'],
        verificationStatus: 'verified',
        isPublished: true,
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.professional.displayName, 'Ines Delgado');
    assert.equal(res.body.professional.pricing.hourlyRateCents, 19500);
    assert.equal(res.body.professional.billing.monthlyFeeCents, professional.monthlyFeeCents);
    assert.equal(res.body.professional.billing.feeIsOverridden, false);
    assert.equal(res.body.professional.isPublished, true);

    // The new expert can sign in and reach their own dashboard.
    const proToken = await ctx.login('new.expert@example.com', 'onboard-me-1');
    const dashboard = await ctx.request('/api/professional/dashboard', { token: proToken });
    assert.equal(dashboard.status, 200);
    assert.equal(dashboard.body.professional.slug, 'ines-delgado-london');

    // And they are immediately findable in the public directory.
    const search = await ctx.request('/api/directory/professionals?q=Ines%20Delgado');
    assert.ok(search.body.results.some((p: { displayName: string }) => p.displayName === 'Ines Delgado'));
  });

  it('onboards with a negotiated fee that differs from the plan price', async () => {
    const categories = await ctx.request('/api/admin/categories', { token });
    const plans = await ctx.request('/api/admin/plans', { token });
    const trades = categories.body.categories.find((c: { slug: string }) => c.slug === 'plumbers');
    const premier = plans.body.plans.find((p: { slug: string }) => p.slug === 'premier');

    const res = await ctx.request('/api/admin/professionals', {
      token,
      json: {
        email: 'negotiated@example.com',
        password: 'onboard-me-2',
        fullName: 'Owen Blake',
        categoryId: trades.id,
        planId: premier.id,
        hourlyRate: 70,
        monthlyFee: 120,
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.professional.billing.monthlyFeeCents, 12000);
    assert.equal(res.body.professional.billing.planMonthlyFeeCents, premier.monthlyFeeCents);
    assert.equal(res.body.professional.billing.feeIsOverridden, true);
  });

  it('rejects onboarding with a duplicate email', async () => {
    const categories = await ctx.request('/api/admin/categories', { token });
    const plans = await ctx.request('/api/admin/plans', { token });
    const res = await ctx.request('/api/admin/professionals', {
      token,
      json: {
        email: 'new.expert@example.com',
        password: 'onboard-me-3',
        fullName: 'Duplicate Person',
        categoryId: categories.body.categories[0].id,
        planId: plans.body.plans[0].id,
      },
    });
    assert.equal(res.status, 409);
  });

  it('will not publish an unverified professional', async () => {
    const categories = await ctx.request('/api/admin/categories', { token });
    const plans = await ctx.request('/api/admin/plans', { token });
    const res = await ctx.request('/api/admin/professionals', {
      token,
      json: {
        email: 'unverified@example.com',
        password: 'onboard-me-4',
        fullName: 'Not Yet Checked',
        categoryId: categories.body.categories[0].id,
        planId: plans.body.plans[0].id,
        verificationStatus: 'pending',
        isPublished: true,
      },
    });
    assert.equal(res.status, 400);
  });

  it('verifies a pending professional and lists them publicly', async () => {
    const pending = await ctx.request('/api/admin/professionals?verification=pending', { token });
    assert.ok(pending.body.professionals.length > 0);
    const target = pending.body.professionals[0];

    const before = await ctx.request(`/api/directory/professionals/${target.slug}`);
    assert.equal(before.status, 404);

    const res = await ctx.request(`/api/admin/professionals/${target.id}`, {
      method: 'PATCH',
      token,
      json: { verificationStatus: 'verified', isPublished: true },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.professional.verificationStatus, 'verified');

    const afterPublish = await ctx.request(`/api/directory/professionals/${target.slug}`);
    assert.equal(afterPublish.status, 200);
  });

  it('un-verifying a professional pulls them out of the directory', async () => {
    const verified = await ctx.request('/api/admin/professionals?verification=verified&published=true', { token });
    const target = verified.body.professionals[0];

    await ctx.request(`/api/admin/professionals/${target.id}`, {
      method: 'PATCH',
      token,
      json: { verificationStatus: 'rejected' },
    });

    const res = await ctx.request(`/api/directory/professionals/${target.slug}`);
    assert.equal(res.status, 404);
  });

  it('suspending an account blocks login and hides the listing', async () => {
    const list = await ctx.request('/api/admin/professionals?published=true', { token });
    const target = list.body.professionals.find(
      (p: { contact: { email: string } }) => p.contact.email === 'new.expert@example.com',
    );

    const res = await ctx.request(`/api/admin/professionals/${target.id}/account-status`, {
      token,
      json: { status: 'suspended' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.professional.isPublished, false);

    const login = await ctx.request('/api/auth/login', {
      json: { email: 'new.expert@example.com', password: 'onboard-me-1' },
    });
    assert.equal(login.status, 403);
  });

  it('creates a category that the public directory then exposes', async () => {
    const res = await ctx.request('/api/admin/categories', {
      token,
      json: { name: 'Veterinary Surgeons', description: 'Small animal and equine practice.', icon: 'paw' },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.slug, 'veterinary-surgeons');

    const publicList = await ctx.request('/api/directory/categories');
    assert.ok(publicList.body.categories.some((c: { slug: string }) => c.slug === 'veterinary-surgeons'));
  });

  it('deactivating a category removes it from the public list', async () => {
    const admin = await ctx.request('/api/admin/categories', { token });
    const target = admin.body.categories.find((c: { slug: string }) => c.slug === 'veterinary-surgeons');

    await ctx.request(`/api/admin/categories/${target.id}`, {
      method: 'PATCH',
      token,
      json: { isActive: false },
    });

    const publicList = await ctx.request('/api/directory/categories');
    assert.ok(!publicList.body.categories.some((c: { slug: string }) => c.slug === 'veterinary-surgeons'));
  });

  it('creates a new membership plan', async () => {
    const res = await ctx.request('/api/admin/plans', {
      token,
      json: {
        name: 'Trades Lite',
        description: 'Single-trade listing with pay-as-you-go leads.',
        monthlyFee: 15,
        commissionPercent: 15,
        features: ['Directory listing', 'Pay per lead'],
      },
    });
    assert.equal(res.status, 201);

    const plans = await ctx.request('/api/admin/plans', { token });
    const created = plans.body.plans.find((p: { slug: string }) => p.slug === 'trades-lite');
    assert.equal(created.monthlyFeeCents, 1500);
    assert.equal(created.commissionBps, 1500);
    assert.equal(created.subscribers, 0);
  });

  it('raises a membership invoice at the professional’s current fee', async () => {
    const list = await ctx.request('/api/admin/professionals?verification=verified', { token });
    const target = list.body.professionals[0];

    const res = await ctx.request(`/api/admin/professionals/${target.id}/invoices`, { token, json: {} });
    assert.equal(res.status, 201);
    assert.equal(res.body.invoices[0].amount_cents, target.billing.monthlyFeeCents);
    assert.equal(res.body.invoices[0].status, 'due');
  });

  it('records an audit event for onboarding', async () => {
    const res = await ctx.request('/api/admin/audit', { token });
    assert.ok(res.body.events.some((e: { action: string }) => e.action === 'professional.onboard'));
  });
});

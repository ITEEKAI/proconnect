import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { startTestServer, type TestContext } from './harness.ts';

describe('public directory', () => {
  let ctx: TestContext;
  before(async () => {
    ctx = await startTestServer();
  });
  after(async () => ctx.close());

  it('lists active categories with a live professional count', async () => {
    const res = await ctx.request('/api/directory/categories');
    assert.equal(res.status, 200);
    const slugs = res.body.categories.map((c: { slug: string }) => c.slug);
    for (const expected of ['water-storage-rainwater-plumbing', 'solar-battery-critical-power', 'resilience-emergency-preparedness']) {
      assert.ok(slugs.includes(expected), `expected the ${expected} category`);
    }
    const water = res.body.categories.find((c: { slug: string }) => c.slug === 'water-storage-rainwater-plumbing');
    assert.ok(water.professionalCount >= 1);
  });

  it('only returns verified, published professionals', async () => {
    const res = await ctx.request('/api/directory/professionals?pageSize=48');
    assert.equal(res.status, 200);
    assert.ok(res.body.total > 0);
    for (const pro of res.body.results) {
      assert.equal(pro.verificationStatus, 'verified');
      assert.equal(pro.isPublished, true);
    }
  });

  it('filters by category', async () => {
    const res = await ctx.request('/api/directory/professionals?category=solar-battery-critical-power');
    assert.ok(res.body.results.length > 0);
    assert.ok(res.body.results.every((p: { category: { slug: string } }) => p.category.slug === 'solar-battery-critical-power'));
  });

  it('filters by free-text search across name, headline and specialties', async () => {
    const res = await ctx.request('/api/directory/professionals?q=critical-load');
    assert.ok(res.body.results.some((p: { displayName: string }) => p.displayName === 'Critical Power Demo'));
  });

  it('filters by location including declared service areas', async () => {
    const res = await ctx.request('/api/directory/professionals?location=Wellington');
    assert.ok(res.body.results.length >= 1);
    assert.ok(
      res.body.results.every(
        (p: { location: { city: string }; serviceAreas: string[] }) =>
          p.location.city === 'Wellington' || p.serviceAreas.includes('Wellington'),
      ),
    );
  });

  it('filters by maximum hourly rate', async () => {
    const res = await ctx.request('/api/directory/professionals?maxRate=120&pageSize=48');
    assert.ok(res.body.results.length > 0);
    assert.ok(res.body.results.every((p: { pricing: { hourlyRateCents: number } }) => p.pricing.hourlyRateCents <= 12000));
  });

  it('sorts by price ascending and descending', async () => {
    const low = await ctx.request('/api/directory/professionals?sort=price_low&pageSize=48');
    const rates = low.body.results.map((p: { pricing: { hourlyRateCents: number } }) => p.pricing.hourlyRateCents);
    assert.deepEqual(rates, [...rates].sort((a: number, b: number) => a - b));

    const high = await ctx.request('/api/directory/professionals?sort=price_high&pageSize=48');
    const desc = high.body.results.map((p: { pricing: { hourlyRateCents: number } }) => p.pricing.hourlyRateCents);
    assert.deepEqual(desc, [...desc].sort((a: number, b: number) => b - a));
  });

  it('paginates', async () => {
    const first = await ctx.request('/api/directory/professionals?pageSize=5&page=1');
    const second = await ctx.request('/api/directory/professionals?pageSize=5&page=2');
    assert.equal(first.body.results.length, 5);
    assert.ok(second.body.results.length > 0);
    const firstIds = new Set(first.body.results.map((p: { id: number }) => p.id));
    assert.ok(second.body.results.every((p: { id: number }) => !firstIds.has(p.id)));
  });

  it('serves a full profile with reviews', async () => {
    const res = await ctx.request('/api/directory/professionals/resilience-planning-demo-nelson');
    assert.equal(res.status, 200);
    assert.equal(res.body.professional.displayName, 'Resilience Planning Demo');
    assert.equal(res.body.professional.isDemo, true);
    assert.equal(res.body.professional.pricing.currency, 'NZD');
  });

  it('hides unpublished profiles behind a 404', async () => {
    const res = await ctx.request('/api/directory/professionals/peter-donnelly-liverpool');
    assert.equal(res.status, 404);
  });

  it('publishes the membership plans used by the pricing page', async () => {
    const res = await ctx.request('/api/directory/plans');
    assert.equal(res.status, 200);
    assert.ok(res.body.plans.length >= 3);
    assert.ok(res.body.plans.every((p: { monthlyFeeCents: number }) => p.monthlyFeeCents >= 0));
  });

  it('accepts a self-service application into the pending queue', async () => {
    const categories = await ctx.request('/api/directory/categories');
    const plans = await ctx.request('/api/directory/plans');

    const res = await ctx.request('/api/directory/applications', {
      json: {
        email: 'applicant@example.com',
        password: 'let-me-in-please',
        fullName: 'Erin Mackay',
        categoryId: categories.body.categories[0].id,
        planId: plans.body.plans[0].id,
        headline: 'Employment law for small businesses',
        city: 'Dundee',
        hourlyRate: 160,
        yearsExperience: 10,
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'pending_review');

    // Not public until an admin verifies it...
    const publicView = await ctx.request('/api/directory/professionals/erin-mackay-dundee');
    assert.equal(publicView.status, 404);

    // ...but the applicant can sign in and see their own pending profile.
    const token = await ctx.login('applicant@example.com', 'let-me-in-please');
    const me = await ctx.request('/api/professional/dashboard', { token });
    assert.equal(me.status, 200);
    assert.equal(me.body.professional.verificationStatus, 'pending');
    assert.equal(me.body.professional.pricing.hourlyRateCents, 16000);
  });

  it('an applicant cannot publish themselves before verification', async () => {
    const token = await ctx.login('applicant@example.com', 'let-me-in-please');
    const res = await ctx.request('/api/professional/profile', {
      method: 'PATCH',
      token,
      json: { isPublished: true },
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error.message, /verified/);
  });
});

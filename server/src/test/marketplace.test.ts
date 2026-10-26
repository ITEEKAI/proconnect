import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { ADMIN, CLIENT, startTestServer, type TestContext } from './harness.ts';

describe('OffGrid056 marketplace edition', () => {
  let ctx: TestContext;
  let clientToken: string;
  let adminToken: string;
  let bookingId: number;

  before(async () => {
    ctx = await startTestServer();
    clientToken = await ctx.login(CLIENT.email, CLIENT.password);
    adminToken = await ctx.login(ADMIN.email, ADMIN.password);
  });
  after(async () => ctx.close());

  it('publishes the reusable single-business configuration', async () => {
    const res = await ctx.request('/api/marketplace/config');
    assert.equal(res.status, 200);
    assert.equal(res.body.marketplace.edition, 'offgrid056');
    assert.equal(res.body.marketplace.locale.currency, 'NZD');
    assert.equal(res.body.marketplace.categories.length, 7);
    assert.equal(res.body.marketplace.integrations.offgrid056Os.mode, 'mock');
    assert.equal(res.body.marketplace.integrations.payments.liveEnabled, false);
  });

  it('limits the public catalogue to the seven OffGrid056 categories', async () => {
    const res = await ctx.request('/api/directory/categories');
    assert.equal(res.status, 200);
    assert.equal(res.body.categories.length, 7);
    assert.ok(res.body.categories.some((category: { slug: string }) => category.slug === 'solar-battery-critical-power'));
    assert.ok(res.body.categories.every((category: { slug: string }) => !['lawyers', 'accountants'].includes(category.slug)));
  });

  it('labels prototype profiles as demo data and prices them in NZD', async () => {
    const res = await ctx.request('/api/directory/professionals?pageSize=48');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 7);
    assert.ok(res.body.results.every((professional: { isDemo: boolean }) => professional.isDemo));
    assert.ok(res.body.results.every((professional: { pricing: { currency: string } }) => professional.pricing.currency === 'NZD'));
  });

  it('creates a consultation request with reference-only OS handoff data', async () => {
    const directory = await ctx.request('/api/directory/professionals?category=resilience-emergency-preparedness');
    const professional = directory.body.results[0];
    const created = await ctx.request('/api/bookings', {
      token: clientToken,
      json: {
        professionalId: professional.id,
        subject: 'Household resilience planning session',
        scheduledFor: '2026-12-03T10:00',
        estimatedHours: 1,
        serviceType: 'consultation',
        customerReference: 'CUST-DEMO-001',
        assessmentReference: 'ASSESS-DEMO-001',
      },
    });
    assert.equal(created.status, 201);
    bookingId = created.body.booking.id;
    assert.equal(created.body.booking.serviceType, 'consultation');
    assert.equal(created.body.booking.integration.mode, 'mock');
    assert.equal(created.body.booking.integration.assessmentReference, 'ASSESS-DEMO-001');
  });

  it('exposes and updates the mock handoff without transferring private records', async () => {
    const clientView = await ctx.request(`/api/integrations/offgrid056/handoffs/${bookingId}`, { token: clientToken });
    assert.equal(clientView.status, 200);
    assert.equal(clientView.body.handoff.privateRecordTransfer, false);
    assert.equal(clientView.body.handoff.customerReference, 'CUST-DEMO-001');

    const updated = await ctx.request(`/api/integrations/offgrid056/handoffs/${bookingId}`, {
      method: 'PATCH', token: adminToken,
      json: { projectHandoff: 'referred', completionFollowUp: 'due' },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.handoff.projectHandoff, 'referred');
    assert.equal(updated.body.handoff.completionFollowUp, 'due');
  });
});

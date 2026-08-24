import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { ADMIN, CLIENT, ELECTRICIAN, startTestServer, type TestContext } from './harness.ts';

describe('authentication', () => {
  let ctx: TestContext;
  before(async () => {
    ctx = await startTestServer();
  });
  after(async () => ctx.close());

  it('signs a visitor up as a client and returns a usable session', async () => {
    const res = await ctx.request('/api/auth/signup', {
      json: { email: 'new.visitor@example.com', password: 'hunter2hunter2', fullName: 'New Visitor' },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'client');
    assert.ok(res.body.token);

    const me = await ctx.request('/api/auth/me', { token: res.body.token });
    assert.equal(me.status, 200);
    assert.equal(me.body.user.email, 'new.visitor@example.com');
  });

  it('rejects a duplicate email', async () => {
    const res = await ctx.request('/api/auth/signup', {
      json: { email: CLIENT.email, password: 'hunter2hunter2', fullName: 'Impostor' },
    });
    assert.equal(res.status, 409);
  });

  it('rejects a short password with a field-level message', async () => {
    const res = await ctx.request('/api/auth/signup', {
      json: { email: 'short@example.com', password: 'abc', fullName: 'Short Pass' },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.details[0].field, 'password');
  });

  it('rejects a wrong password', async () => {
    const res = await ctx.request('/api/auth/login', {
      json: { email: CLIENT.email, password: 'not-the-password' },
    });
    assert.equal(res.status, 401);
  });

  it('returns the linked profile when a professional signs in', async () => {
    const token = await ctx.login(ELECTRICIAN.email, ELECTRICIAN.password);
    const me = await ctx.request('/api/auth/me', { token });
    assert.equal(me.body.user.role, 'professional');
    assert.equal(me.body.professional.category.slug, 'electricians');
    assert.ok(me.body.professional.billing.monthlyFeeCents > 0);
  });

  it('does not expose the billing block to anonymous directory callers', async () => {
    const res = await ctx.request('/api/directory/professionals/james-whitfield-manchester');
    assert.equal(res.status, 200);
    assert.equal(res.body.professional.billing, undefined);
  });

  it('refuses admin endpoints to clients', async () => {
    const token = await ctx.login(CLIENT.email, CLIENT.password);
    const res = await ctx.request('/api/admin/overview', { token });
    assert.equal(res.status, 403);
  });

  it('refuses admin endpoints to anonymous callers', async () => {
    const res = await ctx.request('/api/admin/overview');
    assert.equal(res.status, 401);
  });

  it('rejects a tampered token', async () => {
    const token = await ctx.login(ADMIN.email, ADMIN.password);
    const forged = `${token.slice(0, -4)}AAAA`;
    const res = await ctx.request('/api/admin/overview', { token: forged });
    assert.equal(res.status, 401);
  });

  it('lets a user change their password and blocks the old one', async () => {
    const token = await ctx.login(CLIENT.email, CLIENT.password);
    const changed = await ctx.request('/api/auth/change-password', {
      token,
      json: { currentPassword: CLIENT.password, newPassword: 'brand-new-secret' },
    });
    assert.equal(changed.status, 200);

    const oldLogin = await ctx.request('/api/auth/login', {
      json: { email: CLIENT.email, password: CLIENT.password },
    });
    assert.equal(oldLogin.status, 401);

    const newLogin = await ctx.request('/api/auth/login', {
      json: { email: CLIENT.email, password: 'brand-new-secret' },
    });
    assert.equal(newLogin.status, 200);
  });
});

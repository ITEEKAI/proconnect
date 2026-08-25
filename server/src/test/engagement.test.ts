import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { ADMIN, CLIENT, ELECTRICIAN, startTestServer, type TestContext } from './harness.ts';

const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('notifications, messages, availability, avatars and payments', () => {
  let ctx: TestContext;
  let clientToken: string;
  let proToken: string;
  let adminToken: string;
  let proId: number;
  let bookingId: number;

  before(async () => {
    ctx = await startTestServer();
    clientToken = await ctx.login(CLIENT.email, CLIENT.password);
    proToken = await ctx.login(ELECTRICIAN.email, ELECTRICIAN.password);
    adminToken = await ctx.login(ADMIN.email, ADMIN.password);
    const me = await ctx.request('/api/auth/me', { token: proToken });
    proId = me.body.professional.id;
  });
  after(async () => ctx.close());

  it('notifies the professional when a client requests a booking', async () => {
    const created = await ctx.request('/api/bookings', {
      token: clientToken,
      json: {
        professionalId: proId,
        subject: 'Consumer unit replacement',
        details: 'Old board, 18th edition.',
        scheduledFor: '2026-11-02T09:00',
        estimatedHours: 5,
      },
    });
    assert.equal(created.status, 201);
    bookingId = created.body.booking.id;
    assert.equal(created.body.booking.paymentStatus, 'unpaid');

    const inbox = await ctx.request('/api/notifications', { token: proToken });
    assert.equal(inbox.status, 200);
    assert.ok(inbox.body.unread >= 1);
    assert.ok(
      inbox.body.notifications.some(
        (n: { title: string; href: string }) =>
          n.title.includes('New booking') && n.href.includes(`/dashboard/bookings/${bookingId}`),
      ),
    );
  });

  it('marks notifications read', async () => {
    const before = await ctx.request('/api/notifications', { token: proToken });
    const unread = before.body.unread as number;
    const res = await ctx.request('/api/notifications/read', { token: proToken, json: {} });
    assert.equal(res.status, 200);
    assert.equal(res.body.unread, 0);
    assert.ok(res.body.marked >= unread);
  });

  it('lets the client and professional message on a booking', async () => {
    const sent = await ctx.request(`/api/bookings/${bookingId}/messages`, {
      token: clientToken,
      json: { body: 'The meter is in the under-stairs cupboard.' },
    });
    assert.equal(sent.status, 201);
    assert.equal(sent.body.message.body, 'The meter is in the under-stairs cupboard.');

    const reply = await ctx.request(`/api/bookings/${bookingId}/messages`, {
      token: proToken,
      json: { body: 'Noted — I will bring a spare 18th edition board.' },
    });
    assert.equal(reply.status, 201);

    const thread = await ctx.request(`/api/bookings/${bookingId}/messages`, { token: clientToken });
    assert.equal(thread.body.messages.length, 2);

    const clientInbox = await ctx.request('/api/notifications', { token: clientToken });
    assert.ok(clientInbox.body.notifications.some((n: { type: string }) => n.type === 'booking.message'));
  });

  it('notifies both parties when an admin writes on the thread', async () => {
    const sent = await ctx.request(`/api/bookings/${bookingId}/messages`, {
      token: adminToken,
      json: { body: 'Please keep the conversation on this job.' },
    });
    assert.equal(sent.status, 201);

    const clientInbox = await ctx.request('/api/notifications', { token: clientToken });
    const proInbox = await ctx.request('/api/notifications', { token: proToken });
    assert.ok(
      clientInbox.body.notifications.some(
        (n: { type: string; body: string }) => n.type === 'booking.message' && n.body.includes('conversation'),
      ),
    );
    assert.ok(
      proInbox.body.notifications.some(
        (n: { type: string; body: string }) => n.type === 'booking.message' && n.body.includes('conversation'),
      ),
    );
  });

  it('refuses a stranger from reading the thread', async () => {
    const other = await ctx.login('megan.foster@example.com', 'password123');
    const res = await ctx.request(`/api/bookings/${bookingId}/messages`, { token: other });
    assert.equal(res.status, 403);
  });

  it('notifies the client when the professional accepts', async () => {
    const res = await ctx.request(`/api/bookings/${bookingId}/status`, {
      token: proToken,
      json: { status: 'accepted' },
    });
    assert.equal(res.body.booking.status, 'accepted');
    const inbox = await ctx.request('/api/notifications', { token: clientToken });
    assert.ok(inbox.body.notifications.some((n: { title: string }) => n.title.includes('accepted')));
  });

  it('exposes weekday hours on the public profile and lets the professional edit them', async () => {
    const initial = await ctx.request('/api/professional/availability', { token: proToken });
    assert.equal(initial.status, 200);
    assert.ok(initial.body.availability.some((s: { weekday: number }) => s.weekday === 0));

    const saved = await ctx.request('/api/professional/availability', {
      method: 'PUT',
      token: proToken,
      json: {
        slots: [
          { weekday: 0, start: '08:00', end: '16:00' },
          { weekday: 5, start: '09:00', end: '12:00' },
        ],
      },
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.availability.length, 2);
    assert.equal(saved.body.availability[0].start, '08:00');

    const profile = await ctx.request('/api/directory/professionals/james-whitfield-manchester');
    assert.ok(profile.body.availability.some((s: { weekdayLabel: string; end: string }) => s.weekdayLabel === 'Saturday' && s.end === '12:00'));
  });

  it('rejects overlapping weekday windows', async () => {
    const res = await ctx.request('/api/professional/availability', {
      method: 'PUT',
      token: proToken,
      json: {
        slots: [
          { weekday: 1, start: '09:00', end: '12:00' },
          { weekday: 1, start: '13:00', end: '17:00' },
        ],
      },
    });
    assert.equal(res.status, 400);
  });

  it('stores a local avatar and serves it from /uploads', async () => {
    const res = await ctx.request('/api/professional/avatar', {
      token: proToken,
      json: { mimeType: 'image/png', imageBase64: TINY_PNG },
    });
    assert.equal(res.status, 200);
    const url = res.body.avatarUrl as string;
    assert.match(url, /^\/uploads\/avatars\/.+\.png$/);

    const profile = await ctx.request('/api/directory/professionals/james-whitfield-manchester');
    assert.equal(profile.body.professional.avatarUrl, url);

    const file = await fetch(`${ctx.url}${url}`);
    assert.equal(file.status, 200);
    assert.match(file.headers.get('content-type') ?? '', /image\/png/);
  });

  it('lets a professional update credentials and remove their photo', async () => {
    const saved = await ctx.request('/api/professional/profile', {
      method: 'PATCH',
      token: proToken,
      json: {
        credentials: [{ label: '18th Edition Wiring Regulations', issuer: 'City & Guilds', year: 2022 }],
      },
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.professional.credentials[0].label, '18th Edition Wiring Regulations');

    const removed = await ctx.request('/api/professional/avatar', { method: 'DELETE', token: proToken });
    assert.equal(removed.status, 200);
    assert.equal(removed.body.avatarUrl, null);
    assert.equal(removed.body.professional.avatarUrl, null);
  });

  it('lets the client record payment after the job is completed', async () => {
    const tooSoon = await ctx.request(`/api/bookings/${bookingId}/pay`, { token: clientToken, json: {} });
    assert.equal(tooSoon.status, 400);

    const completed = await ctx.request(`/api/bookings/${bookingId}/status`, {
      token: proToken,
      json: { status: 'completed', loggedHours: 5 },
    });
    assert.equal(completed.body.booking.status, 'completed');
    assert.equal(completed.body.booking.paymentStatus, 'unpaid');

    const paid = await ctx.request(`/api/bookings/${bookingId}/pay`, { token: clientToken, json: {} });
    assert.equal(paid.status, 200);
    assert.equal(paid.body.booking.paymentStatus, 'paid');

    const again = await ctx.request(`/api/bookings/${bookingId}/pay`, { token: clientToken, json: {} });
    assert.equal(again.status, 400);

    const proInbox = await ctx.request('/api/notifications', { token: proToken });
    assert.ok(proInbox.body.notifications.some((n: { type: string }) => n.type === 'booking.paid'));
  });

  it('notifies admins when someone applies to join', async () => {
    const categories = await ctx.request('/api/directory/categories');
    const plans = await ctx.request('/api/directory/plans');
    const res = await ctx.request('/api/directory/applications', {
      json: {
        email: 'notify-me@example.com',
        password: 'let-me-in-please',
        fullName: 'Samira Khan',
        categoryId: categories.body.categories[0].id,
        planId: plans.body.plans[0].id,
        headline: 'Employment law for small businesses',
        city: 'Leeds',
        hourlyRate: 140,
        yearsExperience: 8,
      },
    });
    assert.equal(res.status, 201);

    const inbox = await ctx.request('/api/notifications', { token: adminToken });
    assert.ok(inbox.body.notifications.some((n: { title: string }) => n.title.includes('Samira Khan')));

    const applicant = await ctx.login('notify-me@example.com', 'let-me-in-please');
    const hours = await ctx.request('/api/professional/availability', { token: applicant });
    assert.ok(hours.body.availability.length >= 5);
  });

  it('lets an admin mark a membership invoice paid', async () => {
    const detail = await ctx.request(`/api/admin/professionals/${proId}`, { token: adminToken });
    const due = (detail.body.invoices as Array<{ id: number; status: string }>).find((i) => i.status === 'due');
    assert.ok(due, 'seeded electrician should have a due invoice');

    const res = await ctx.request(`/api/admin/invoices/${due.id}`, {
      method: 'PATCH',
      token: adminToken,
      json: { status: 'paid' },
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.invoices.some((i: { id: number; status: string }) => i.id === due.id && i.status === 'paid'));

    const inbox = await ctx.request('/api/notifications', { token: proToken });
    assert.ok(inbox.body.notifications.some((n: { type: string }) => n.type === 'invoice.paid'));
  });

  it('notifies the professional when an admin verifies them', async () => {
    const pending = await ctx.request('/api/admin/professionals?verification=pending', { token: adminToken });
    const target = (pending.body.professionals as Array<{ id: number; contact: { email: string }; displayName: string }>).find(
      (p) => p.contact.email === 'peter.donnelly@example.com',
    );
    assert.ok(target);

    const res = await ctx.request(`/api/admin/professionals/${target.id}`, {
      method: 'PATCH',
      token: adminToken,
      json: { verificationStatus: 'verified', isPublished: true },
    });
    assert.equal(res.status, 200);

    const token = await ctx.login(target.contact.email, 'password123');
    const inbox = await ctx.request('/api/notifications', { token });
    assert.ok(inbox.body.notifications.some((n: { type: string }) => n.type === 'professional.verified'));
  });
});

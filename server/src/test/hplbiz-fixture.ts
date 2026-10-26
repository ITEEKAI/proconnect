import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../app.ts';
import { closeDb, openDatabase, setDb } from '../db/database.ts';
import { ensureSeedData } from '../db/seed.ts';
import { marketplace } from '../business/marketplace.ts';

assert.equal(marketplace.edition, 'hplbiz');
assert.equal(marketplace.categories.length, 7);
assert.equal(marketplace.locale.currency, 'NZD');

setDb(openDatabase(':memory:'));
ensureSeedData(true);

const server: Server = await new Promise((resolve) => {
  const instance = createApp().listen(0, '127.0.0.1', () => resolve(instance));
});
const { port } = server.address() as AddressInfo;
const baseUrl = `http://127.0.0.1:${port}`;

async function json(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, init);
  return { status: response.status, body: await response.json() as any };
}

try {
  const config = await json('/api/marketplace/config');
  assert.equal(config.body.marketplace.identity.businessName, 'HPLBIZ');
  assert.equal(config.body.marketplace.branding.primary, '#173b57');

  const categories = await json('/api/directory/categories');
  assert.equal(categories.body.categories.length, 7);
  assert.equal(categories.body.categories[0].slug, 'business-strategy-planning');

  const directory = await json('/api/directory/professionals?pageSize=48');
  assert.equal(directory.body.results.length, 7);
  assert.ok(directory.body.results.every((professional: any) => professional.isDemo));

  const hplLogin = await json('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'client@hplbiz.test', password: 'hpl-client-demo' }),
  });
  assert.equal(hplLogin.status, 200);

  const offgridLogin = await json('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'client@proconnect.test', password: 'password123' }),
  });
  assert.equal(offgridLogin.status, 401);
  process.stdout.write('HPLBIZ edition isolation verified\n');
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  closeDb();
}

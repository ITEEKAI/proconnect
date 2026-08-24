import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../app.ts';
import { closeDb, openDatabase, setDb } from '../db/database.ts';
import { ensureSeedData } from '../db/seed.ts';

export interface TestContext {
  url: string;
  close: () => Promise<void>;
  request: (
    path: string,
    init?: RequestInit & { token?: string; json?: unknown },
  ) => Promise<{ status: number; body: any }>;
  login: (email: string, password: string) => Promise<string>;
}

export const ADMIN = { email: 'admin@proconnect.test', password: 'admin1234' };
export const CLIENT = { email: 'client@proconnect.test', password: 'password123' };
export const ELECTRICIAN = { email: 'james.whitfield@example.com', password: 'password123' };

/** Boots the API on an ephemeral port against a freshly seeded in-memory database. */
export async function startTestServer(): Promise<TestContext> {
  setDb(openDatabase(':memory:'));
  ensureSeedData(true);

  const server: Server = await new Promise((resolve) => {
    const s = createApp().listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;

  async function request(
    path: string,
    init: RequestInit & { token?: string; json?: unknown } = {},
  ): Promise<{ status: number; body: any }> {
    const { token, json, headers, ...rest } = init;
    const response = await fetch(`${url}${path}`, {
      ...rest,
      method: rest.method ?? (json ? 'POST' : 'GET'),
      headers: {
        ...(json ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(headers as Record<string, string> | undefined),
      },
      body: json ? JSON.stringify(json) : (rest.body ?? null),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }

  async function login(email: string, password: string): Promise<string> {
    const res = await request('/api/auth/login', { json: { email, password } });
    if (res.status !== 200) throw new Error(`login failed for ${email}: ${JSON.stringify(res.body)}`);
    return res.body.token as string;
  }

  return {
    url,
    request,
    login,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      closeDb();
    },
  };
}

import { expect, type Page } from '@playwright/test';

export const OFFGRID_URL = 'http://127.0.0.1:5273';
export const HPLBIZ_URL = 'http://127.0.0.1:5274';

export async function login(page: Page, baseUrl: string, email: string, password: string) {
  await page.goto(`${baseUrl}/login`);
  await page.getByRole('textbox', { name: 'Email address', exact: true }).fill(email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function authedJson<T>(page: Page, requestPath: string, options: { method?: string; body?: unknown } = {}) {
  return page.evaluate(async ({ requestPath, options }) => {
    const token = localStorage.getItem('proconnect.token');
    const response = await fetch(requestPath, {
      method: options.method ?? (options.body ? 'POST' : 'GET'),
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const text = await response.text();
    return { status: response.status, body: (text ? JSON.parse(text) : null) as T };
  }, { requestPath, options });
}

export async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll<HTMLElement>('body *')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { tag: element.tagName, className: element.className, left: rect.left, right: rect.right };
      })
      .filter((item) => item.left < -0.5 || item.right > document.documentElement.clientWidth + 0.5)
      .slice(0, 5),
  }));
  expect(dimensions.scrollWidth, JSON.stringify(dimensions.offenders, null, 2)).toBeLessThanOrEqual(dimensions.clientWidth);
}

export function expectNoAxeViolations(violations: Array<{ id: string; impact?: string | null; nodes: Array<{ target: unknown }> }>) {
  const summary = violations.map(({ id, impact, nodes }) => ({
    id,
    impact,
    targets: nodes.map(({ target }) => target),
  }));
  expect(summary).toEqual([]);
}

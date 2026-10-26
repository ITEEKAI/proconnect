import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { HPLBIZ_URL, expectNoAxeViolations, login } from './helpers';

test('HPLBIZ has independent identity, catalogue, sample data and credentials', async ({ page, request }) => {
  await page.goto(HPLBIZ_URL);
  await expect(page.getByText('HPLBIZ', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Practical advisers for stronger New Zealand businesses.', { exact: false })).toBeVisible();

  await page.goto(`${HPLBIZ_URL}/categories`);
  await expect(page.locator('main')).toContainText('Business Strategy & Planning');
  await expect(page.locator('main')).toContainText('Technology & AI Enablement');

  await page.goto(`${HPLBIZ_URL}/browse`);
  await expect(page.getByText('Demo profile', { exact: true })).toHaveCount(7);
  await expect(page.getByText('Resilience Planning Demo', { exact: true })).toHaveCount(0);

  const rejected = await request.post(`${HPLBIZ_URL}/api/auth/login`, {
    data: { email: 'client@proconnect.test', password: 'password123' },
  });
  expect(rejected.status()).toBe(401);
  await login(page, HPLBIZ_URL, 'client@hplbiz.test', 'hpl-client-demo');
  await expect(page.getByRole('heading', { name: 'My bookings' })).toBeVisible();

  await page.goto(`${HPLBIZ_URL}/signup`);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expectNoAxeViolations(scan.violations);
});

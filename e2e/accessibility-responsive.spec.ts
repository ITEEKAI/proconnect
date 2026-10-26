import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { HPLBIZ_URL, OFFGRID_URL, expectNoAxeViolations, expectNoHorizontalOverflow } from './helpers';

test.describe('shared form accessibility', () => {
  for (const [edition, baseUrl] of [['OffGrid056', OFFGRID_URL], ['HPLBIZ', HPLBIZ_URL]] as const) {
    test(`${edition} controls have accessible names, label focus and keyboard order`, async ({ page }) => {
      await page.goto(`${baseUrl}/signup`);
      const fullName = page.getByRole('textbox', { name: 'Full name', exact: true });
      const email = page.getByRole('textbox', { name: 'Email address', exact: true });
      const phone = page.getByRole('textbox', { name: 'Phone (optional)', exact: true });
      const password = page.getByRole('textbox', { name: 'Password', exact: true });
      const fullNameLabel = page.locator('label').filter({ hasText: 'Full name' }).first();

      await expect(fullName).toHaveAccessibleName('Full name');
      await expect(fullNameLabel).toHaveAttribute('for', await fullName.getAttribute('id') ?? 'missing-control-id');
      await fullNameLabel.click();
      await expect(fullName).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(email).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(phone).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(password).toBeFocused();

      await page.reload();
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(page.getByRole('textbox', { name: 'Full name', exact: true })).toBeFocused();

      const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expectNoAxeViolations(scan.violations);

      if (process.env.UPDATE_HANDOVER_SCREENSHOTS && edition === 'OffGrid056') {
        await page.screenshot({
          path: path.resolve('docs/screenshots/phase1c/01-offgrid-accessible-signup.png'),
          fullPage: true,
        });
      }
    });
  }
});

const widths = [320, 360, 390, 768, 1024] as const;
for (const [edition, baseUrl] of [['OffGrid056', OFFGRID_URL], ['HPLBIZ', HPLBIZ_URL]] as const) {
  for (const width of widths) {
    test(`${edition} homepage has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(baseUrl);
      await expect(page.getByText(edition, { exact: true }).first()).toBeVisible();
      await expectNoHorizontalOverflow(page);

      if (process.env.UPDATE_HANDOVER_SCREENSHOTS && ((edition === 'OffGrid056' && width === 320) || (edition === 'HPLBIZ' && width === 390))) {
        const file = edition === 'OffGrid056' ? '02-offgrid-mobile-320.png' : '03-hplbiz-mobile-390.png';
        await page.screenshot({ path: path.resolve(`docs/screenshots/phase1c/${file}`), fullPage: true });
      }
    });
  }
}

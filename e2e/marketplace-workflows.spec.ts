import { expect, test } from '@playwright/test';
import { OFFGRID_URL, authedJson, login } from './helpers';

test.describe.serial('OffGrid056 customer, professional and administrator workflows', () => {
  const stamp = Date.now();
  const clientEmail = `phase1c.client.${stamp}@offgrid056.test`;
  const applicantEmail = `phase1c.applicant.${stamp}@offgrid056.test`;
  const consultationSubject = `Phase 1C consultation ${stamp}`;
  const onsiteSubject = `Phase 1C on-site request ${stamp}`;

  test('customer registers and creates consultation and on-site requests', async ({ page }) => {
    await page.goto(`${OFFGRID_URL}/signup`);
    await page.getByRole('textbox', { name: 'Full name', exact: true }).fill('Phase 1C Browser Client');
    await page.getByRole('textbox', { name: 'Email address', exact: true }).fill(clientEmail);
    await page.getByRole('textbox', { name: 'Phone (optional)', exact: true }).fill('021 555 0131');
    await page.getByRole('textbox', { name: 'Password', exact: true }).fill('phase1c-client-demo');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('heading', { name: 'My bookings' })).toBeVisible();

    for (const request of [
      { type: 'consultation', subject: consultationSubject, reference: 'ASSESS-PHASE1C-ONLINE' },
      { type: 'onsite', subject: onsiteSubject, reference: 'ASSESS-PHASE1C-ONSITE' },
    ]) {
      await page.goto(`${OFFGRID_URL}/pro/resilience-planning-demo-nelson`);
      await page.getByRole('button', { name: 'Request a booking' }).click();
      await page.getByRole('combobox', { name: 'Service pathway', exact: true }).selectOption(request.type);
      await page.getByRole('textbox', { name: 'What do you need?', exact: true }).fill(request.subject);
      await page.getByRole('textbox', { name: 'Any useful detail', exact: true }).fill('Phase 1C automated browser test data only.');
      await page.getByRole('textbox', { name: 'Customer reference', exact: true }).fill(`PHASE1C-${request.type.toUpperCase()}`);
      await page.getByRole('textbox', { name: 'Assessment reference', exact: true }).fill(request.reference);
      await page.getByRole('button', { name: 'Send request' }).click();
      await expect(page.getByRole('heading', { name: 'Request sent' })).toBeVisible();
      await page.getByRole('button', { name: 'Done' }).click();
    }

    await page.goto(`${OFFGRID_URL}/account`);
    await expect(page.getByText(consultationSubject, { exact: true })).toBeVisible();
    await expect(page.getByText(onsiteSubject, { exact: true })).toBeVisible();
    const bookings = await authedJson<{ bookings: Array<{ id: number; subject: string }> }>(page, '/api/bookings');
    const consultation = bookings.body.bookings.find((booking) => booking.subject === consultationSubject);
    expect(consultation).toBeTruthy();
    const handoff = await authedJson<{ handoff: { mode: string; privateRecordTransfer: boolean } }>(page, `/api/integrations/offgrid056/handoffs/${consultation!.id}`);
    expect(handoff.status).toBe(200);
    expect(handoff.body.handoff).toMatchObject({ mode: 'mock', privateRecordTransfer: false });
  });

  test('professional accepts the consultation and can reach rate management', async ({ page }) => {
    await login(page, OFFGRID_URL, 'resilience.demo@offgrid056.test', 'password123');
    await page.goto(`${OFFGRID_URL}/dashboard/bookings`);
    const request = page.locator('li').filter({ hasText: consultationSubject });
    await request.getByRole('button', { name: 'Accept', exact: true }).click();
    await expect(request.getByText('Confirmed', { exact: true })).toBeVisible();
    await page.goto(`${OFFGRID_URL}/dashboard/rates`);
    await expect(page.getByRole('spinbutton', { name: 'Hourly rate', exact: true })).toHaveValue('150');
  });

  test('professional applies and administrator verifies and publishes the profile', async ({ page, browser }) => {
    await page.goto(`${OFFGRID_URL}/join`);
    await page.getByRole('textbox', { name: 'Full name', exact: true }).fill('Phase 1C Pending Specialist');
    await page.getByRole('textbox', { name: 'Business name', exact: true }).fill('Phase 1C Test Services');
    await page.getByRole('textbox', { name: 'Email address', exact: true }).fill(applicantEmail);
    await page.getByRole('textbox', { name: 'Password', exact: true }).fill('phase1c-pro-demo');
    await page.getByRole('combobox', { name: 'Field of expertise', exact: true }).selectOption({ index: 1 });
    await page.getByRole('textbox', { name: 'Headline', exact: true }).fill('Accessible browser-tested specialist application');
    await page.getByRole('textbox', { name: 'About you', exact: true }).fill('Synthetic profile for Phase 1C browser regression testing.');
    await page.getByRole('textbox', { name: 'Town or city', exact: true }).fill('Wellington');
    await page.getByRole('textbox', { name: 'County or region', exact: true }).fill('Wellington');
    await page.getByRole('spinbutton', { name: 'Hourly rate', exact: true }).fill('140');
    await page.getByRole('button', { name: /Starter/ }).first().click();
    await page.getByRole('button', { name: 'Submit application' }).click();
    await expect(page.getByRole('heading', { name: 'Application received' })).toBeVisible();

    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    await login(admin, OFFGRID_URL, 'admin@proconnect.test', 'admin1234');
    await admin.goto(`${OFFGRID_URL}/admin/professionals`);
    await admin.getByRole('textbox', { name: 'Search professionals', exact: true }).fill(applicantEmail);
    const row = admin.locator('tr').filter({ hasText: applicantEmail });
    await row.getByRole('link', { name: 'Phase 1C Pending Specialist' }).click();
    await Promise.all([
      admin.waitForResponse((response) => response.request().method() === 'PATCH' && /\/api\/admin\/professionals\/\d+$/.test(new URL(response.url()).pathname)),
      admin.getByRole('combobox', { name: 'Verification', exact: true }).selectOption('verified'),
    ]);
    const listed = admin.getByRole('checkbox', { name: /^Listed in the public directory/ });
    await expect(listed).toBeEnabled();
    await Promise.all([
      admin.waitForResponse((response) => response.request().method() === 'PATCH' && /\/api\/admin\/professionals\/\d+$/.test(new URL(response.url()).pathname)),
      listed.click(),
    ]);
    await expect(listed).toBeChecked();
    await adminContext.close();
  });
});

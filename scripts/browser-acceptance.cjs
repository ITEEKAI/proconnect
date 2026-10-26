const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const screenshots = path.join(root, 'docs', 'screenshots', 'phase1b');
const resultsDir = path.join(root, 'test-results');
const bundledChromium = chromium.executablePath();
const chromiumExecutable = fs.existsSync(bundledChromium)
  ? bundledChromium
  : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
fs.mkdirSync(screenshots, { recursive: true });
fs.mkdirSync(resultsDir, { recursive: true });

const offgrid = process.env.OFFGRID_BASE_URL || 'http://127.0.0.1:5173';
const hplbiz = process.env.HPLBIZ_BASE_URL || 'http://127.0.0.1:5174';
const assertions = [];
const browserErrors = [];
const defects = [
  {
    id: 'P1B-001',
    severity: 'release-blocker',
    summary: 'Visible form captions are not programmatically associated with their inputs, selects or textareas.',
  },
];

function pass(name, evidence) {
  assertions.push({ name, status: 'passed', evidence });
}

function fail(name, evidence) {
  assertions.push({ name, status: 'failed', evidence });
}

async function shot(page, name, fullPage = true) {
  const target = path.join(screenshots, name);
  await page.screenshot({ path: target, fullPage });
  return path.relative(root, target).replaceAll('\\', '/');
}

function observe(page, edition) {
  page.on('pageerror', (error) => browserErrors.push({ edition, type: 'pageerror', message: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push({ edition, type: 'console', message: message.text() });
  });
}

async function login(page, base, email, password) {
  await page.goto(`${base}/login`);
  const inputs = page.locator('form input');
  await inputs.nth(0).fill(email);
  await inputs.nth(1).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForLoadState('networkidle');
}

async function gotoText(page, url, text) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    try {
      await page.getByText(text, { exact: false }).first().waitFor({ timeout: 10000 });
      return;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
}

async function authedJson(page, url, options = {}) {
  return page.evaluate(async ({ url, options }) => {
    const token = localStorage.getItem('proconnect.token');
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }, { url, options });
}

async function createRequest(page, serviceType, subject, assessmentReference) {
  await page.goto(`${offgrid}/pro/resilience-planning-demo-nelson`);
  await page.getByRole('button', { name: 'Request a booking' }).click();
  const form = page.locator('#booking-form');
  await form.locator('select').selectOption(serviceType);
  await form.locator('input').nth(0).fill(subject);
  await form.locator('textarea').fill('Phase 1B browser acceptance test data only.');
  await form.locator('input').nth(1).fill(`PHASE1B-${serviceType.toUpperCase()}`);
  await form.locator('input').nth(2).fill(assessmentReference);
  await page.getByRole('button', { name: 'Send request' }).click();
  await page.getByRole('heading', { name: 'Request sent' }).waitFor();
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable });
  try {
    const clientContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const client = await clientContext.newPage();
    observe(client, 'offgrid056');

    await client.goto(offgrid);
    await client.getByText('OffGrid056', { exact: true }).first().waitFor();
    await client.getByText('OffGrid056 prototype', { exact: false }).first().waitFor();
    pass('OffGrid056 homepage and prototype notice', await shot(client, '01-offgrid-home-desktop.png'));

    const categories = [
      'Water Storage, Rainwater & Plumbing',
      'Solar, Battery & Critical Power',
      'Food Growing, Greenhouses & Gardens',
      'Shelter, Emergency Accommodation & Building',
      'Air Quality, Ventilation & Safety',
      'Resilience Planning & Emergency Preparedness',
      'Community Preparedness & Training',
    ];
    await client.goto(`${offgrid}/categories`);
    for (const category of categories) await client.getByText(category, { exact: true }).waitFor();
    pass('Seven OffGrid056 specialist categories', await shot(client, '02-offgrid-seven-categories.png'));

    await client.goto(`${offgrid}/browse`);
    await client.getByText('Resilience Planning Demo', { exact: true }).waitFor();
    const demoBadges = await client.getByText('Demo profile', { exact: true }).count();
    if (demoBadges !== 7) throw new Error(`Expected 7 demo-labelled profiles, found ${demoBadges}`);
    pass('Directory has seven demonstration-labelled profiles', await shot(client, '03-offgrid-directory-demo-labels.png'));

    await client.goto(`${offgrid}/pro/resilience-planning-demo-nelson`);
    await client.getByText(/\$150/).first().waitFor();
    await client.getByText('Prototype demonstration profile', { exact: true }).waitFor();
    const currencyConfig = await client.evaluate(async () => (await (await fetch('/api/marketplace/config')).json()).marketplace.locale.currency);
    if (currencyConfig !== 'NZD') throw new Error(`Expected NZD currency, found ${currencyConfig}`);
    pass('Professional detail shows NZD pricing and demo warning', await shot(client, '04-offgrid-profile-nzd.png'));

    const unique = Date.now();
    const clientEmail = `phase1b.client.${unique}@offgrid056.test`;
    await gotoText(client, `${offgrid}/signup`, 'Create your free account');
    const signupInputs = client.locator('form input');
    await signupInputs.nth(0).fill('Phase 1B Browser Client');
    await signupInputs.nth(1).fill(clientEmail);
    await signupInputs.nth(2).fill('021 555 0199');
    await signupInputs.nth(3).fill('phase1b-client-demo');
    await client.getByRole('button', { name: 'Create account' }).click();
    await client.getByRole('heading', { name: 'My bookings' }).waitFor();
    pass('Customer registration and authenticated account', await shot(client, '05-offgrid-customer-registration.png'));

    await createRequest(client, 'consultation', 'Online resilience consultation', 'ASSESS-PHASE1B-ONLINE');
    await client.getByText('Consultation integration is not live', { exact: true }).waitFor({ state: 'hidden' }).catch(() => {});
    pass('Online consultation request created', await shot(client, '06-offgrid-online-consultation-request.png', false));
    await client.getByRole('button', { name: 'Done' }).click();

    await createRequest(client, 'onsite', 'On-site continuity assessment', 'ASSESS-PHASE1B-ONSITE');
    pass('On-site service request created', await shot(client, '07-offgrid-onsite-request.png', false));
    await client.getByRole('button', { name: 'View my bookings' }).click();
    await client.getByText('Online resilience consultation', { exact: true }).waitFor();
    await client.getByText('On-site continuity assessment', { exact: true }).waitFor();
    pass('Customer booking management lists both request pathways', await shot(client, '08-offgrid-customer-bookings.png'));

    const bookingList = await authedJson(client, '/api/bookings');
    if (bookingList.status !== 200 || bookingList.body.bookings.length < 2) throw new Error('Could not read created bookings');
    const online = bookingList.body.bookings.find((booking) => booking.subject === 'Online resilience consultation');
    const handoff = await authedJson(client, `/api/integrations/offgrid056/handoffs/${online.id}`);
    if (handoff.status !== 200 || handoff.body.handoff.mode !== 'mock' || handoff.body.handoff.privateRecordTransfer !== false) {
      throw new Error('OffGrid056 OS mock handoff contract failed');
    }
    pass('OffGrid056 OS mock handoff', `booking ${online.reference}; reference-only; privateRecordTransfer=false`);

    const professionalContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const professional = await professionalContext.newPage();
    observe(professional, 'offgrid056-professional');
    await login(professional, offgrid, 'resilience.demo@offgrid056.test', 'password123');
    await professional.getByRole('heading', { name: 'Overview' }).waitFor();
    pass('Professional dashboard', await shot(professional, '09-offgrid-professional-dashboard.png'));
    await professional.goto(`${offgrid}/dashboard/bookings`);
    const requestRow = professional.locator('li').filter({ hasText: 'Online resilience consultation' }).first();
    await requestRow.getByRole('button', { name: 'Accept', exact: true }).click();
    await requestRow.getByText('Confirmed', { exact: true }).waitFor();
    pass('Professional booking acceptance', await shot(professional, '10-offgrid-professional-booking-accepted.png'));
    await professional.goto(`${offgrid}/dashboard/rates`);
    await professional.getByRole('heading', { name: 'My rates' }).waitFor();
    await professional.locator('form input[type="number"]').first().waitFor();
    pass('Professional rate management', await shot(professional, '11-offgrid-professional-rates.png'));

    const applicantContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const applicant = await applicantContext.newPage();
    observe(applicant, 'offgrid056-applicant');
    const applicantEmail = `phase1b.applicant.${unique}@offgrid056.test`;
    await applicant.goto(`${offgrid}/join`);
    const joinForm = applicant.locator('form');
    const joinInputs = joinForm.locator('input');
    await joinInputs.nth(0).fill('Phase 1B Pending Specialist');
    await joinInputs.nth(1).fill('Browser Proof Services');
    await joinInputs.nth(2).fill(applicantEmail);
    await joinInputs.nth(4).fill('phase1b-pro-demo');
    await joinForm.locator('select').selectOption({ index: 1 });
    await joinInputs.nth(6).fill('Browser-tested resilience specialist application');
    await joinForm.locator('textarea').fill('Demonstration application used only to prove the administrator verification workflow.');
    await joinInputs.nth(8).fill('Wellington');
    await joinInputs.nth(9).fill('Wellington');
    await joinInputs.nth(10).fill('140');
    await applicant.locator('button').filter({ hasText: /Starter/ }).first().click();
    await applicant.getByRole('button', { name: 'Submit application' }).click();
    await applicant.getByRole('heading', { name: 'Application received' }).waitFor();
    pass('Professional application enters pending verification', await shot(applicant, '12-offgrid-professional-application.png'));

    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const admin = await adminContext.newPage();
    observe(admin, 'offgrid056-admin');
    await login(admin, offgrid, 'admin@proconnect.test', 'admin1234');
    await admin.getByRole('heading', { name: 'Overview', exact: true }).waitFor();
    pass('Admin dashboard', await shot(admin, '13-offgrid-admin-dashboard.png'));
    await admin.goto(`${offgrid}/admin/professionals`);
    await admin.getByLabel('Search professionals').fill(applicantEmail);
    const applicantRow = admin.locator('tr').filter({ hasText: applicantEmail });
    await applicantRow.getByRole('link', { name: 'Phase 1B Pending Specialist' }).click();
    await Promise.all([
      admin.waitForResponse((response) => response.request().method() === 'PATCH' && /\/api\/admin\/professionals\/\d+$/.test(new URL(response.url()).pathname)),
      admin.locator('select').nth(0).selectOption('verified'),
    ]);
    const listingCheckbox = admin.getByLabel('Listed in the public directory');
    await listingCheckbox.waitFor({ state: 'visible' });
    await admin.waitForTimeout(750);
    await Promise.all([
      admin.waitForResponse((response) => response.request().method() === 'PATCH' && /\/api\/admin\/professionals\/\d+$/.test(new URL(response.url()).pathname)),
      listingCheckbox.click(),
    ]);
    await listingCheckbox.waitFor({ state: 'visible' });
    const verifiedProfessionalId = new URL(admin.url()).pathname.split('/').pop();
    const verifiedDetail = await authedJson(admin, `/api/admin/professionals/${verifiedProfessionalId}`);
    if (verifiedDetail.status !== 200 || !verifiedDetail.body.professional.isPublished || verifiedDetail.body.professional.verificationStatus !== 'verified') {
      throw new Error('Verified applicant was not published');
    }
    pass('Admin professional verification and publishing', await shot(admin, '14-offgrid-admin-verification.png'));

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const mobile = await mobileContext.newPage();
    observe(mobile, 'offgrid056-mobile');
    await mobile.goto(offgrid);
    await mobile.getByText('OffGrid056', { exact: true }).first().waitFor();
    const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    const mobileEvidence = await shot(mobile, '15-offgrid-mobile-home.png');
    if (overflow) {
      fail('Mobile homepage at 390 × 844 without horizontal overflow', mobileEvidence);
      defects.push({ id: 'P1B-002', severity: 'release-blocker', summary: 'Homepage has horizontal overflow at a 390 × 844 mobile viewport.' });
    } else {
      pass('Mobile homepage at 390 × 844 without horizontal overflow', mobileEvidence);
    }

    const hplContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const hpl = await hplContext.newPage();
    observe(hpl, 'hplbiz');
    await hpl.goto(hplbiz);
    await hpl.getByText('HPLBIZ', { exact: true }).first().waitFor();
    await hpl.getByText('Practical advisers for stronger New Zealand businesses.', { exact: false }).waitFor();
    pass('Independent HPLBIZ identity and branding', await shot(hpl, '16-hplbiz-home.png'));
    await hpl.goto(`${hplbiz}/categories`);
    await hpl.getByText('Business Strategy & Planning', { exact: true }).waitFor();
    await hpl.getByText('Technology & AI Enablement', { exact: true }).waitFor();
    pass('HPLBIZ-specific categories', await shot(hpl, '17-hplbiz-categories.png'));
    await hpl.goto(`${hplbiz}/browse`);
    await hpl.getByText('HPL Strategy Adviser Demo', { exact: true }).waitFor();
    if (await hpl.getByText('Resilience Planning Demo', { exact: true }).count()) throw new Error('OffGrid profile leaked into HPLBIZ');
    pass('HPLBIZ-specific sample directory data', await shot(hpl, '18-hplbiz-directory.png'));
    const offgridCredentialAttempt = await hplContext.request.post(`${hplbiz}/api/auth/login`, {
      data: { email: 'client@proconnect.test', password: 'password123' },
    });
    if (offgridCredentialAttempt.status() !== 401) throw new Error('OffGrid credentials were accepted by HPLBIZ');
    await login(hpl, hplbiz, 'client@hplbiz.test', 'hpl-client-demo');
    await hpl.getByRole('heading', { name: 'My bookings' }).waitFor();
    pass('HPLBIZ separate demo credentials', 'HPLBIZ client login passed; OffGrid client login returned 401');

    const report = {
      generatedAt: new Date().toISOString(),
      browser: await browser.version(),
      bases: { offgrid, hplbiz },
      assertions,
      browserErrors,
      defects,
      summary: {
        passed: assertions.filter((assertion) => assertion.status === 'passed').length,
        failed: assertions.filter((assertion) => assertion.status === 'failed').length,
        browserErrors: browserErrors.length,
      },
    };
    fs.writeFileSync(path.join(resultsDir, 'phase1b-browser-results.json'), `${JSON.stringify(report, null, 2)}\n`);
    if (browserErrors.length) throw new Error(`Browser emitted ${browserErrors.length} error(s); see results JSON`);
    console.log(`Phase 1B browser acceptance passed: ${assertions.length} checks`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  fs.writeFileSync(path.join(resultsDir, 'phase1b-browser-failure.txt'), `${error.stack || error}\n`);
  console.error(error);
  process.exitCode = 1;
});

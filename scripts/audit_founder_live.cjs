const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/krish/.gemini/antigravity-ide/brain/68ed6026-d74f-48d3-9e30-152dc6f1f996');

async function auditFounder() {
  console.log('--- STARTING LIVE AUDIT OF /admin/founder ---');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  // Login as Super Admin
  console.log('Logging in as degreepartners@gmail.com...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('input[type="email"], input[name="email"]', 'degreepartners@gmail.com');
  await page.fill('input[type="password"], input[name="password"]', '@Krish4165');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  // Navigate to /admin/founder
  console.log('Navigating to http://localhost:3000/admin/founder...');
  await page.goto('http://localhost:3000/admin/founder', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Capture desktop screenshot
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'founder_initial_view.png'), fullPage: true });
  console.log('Captured founder_initial_view.png');

  // Capture mobile view
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'founder_initial_mobile.png'), fullPage: true });
  console.log('Captured founder_initial_mobile.png');

  console.log('\n--- AUDIT RESULTS ---');
  console.log('Console Errors (' + consoleErrors.length + '):');
  consoleErrors.forEach(err => console.log('  [CONSOLE ERROR]', err));

  console.log('\nNetwork Errors (' + networkErrors.length + '):');
  networkErrors.forEach(err => console.log('  [NETWORK ERROR]', err));

  await browser.close();
  console.log('--- AUDIT FINISHED ---');
}

auditFounder().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});

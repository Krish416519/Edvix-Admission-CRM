const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/krish/.gemini/antigravity-ide/brain/68ed6026-d74f-48d3-9e30-152dc6f1f996');

async function auditAnalytics() {
  console.log('--- STARTING LIVE AUDIT OF /analytics ---');
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

  // Login
  console.log('Logging in as degreepartners@gmail.com...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('input[type="email"], input[name="email"]', 'degreepartners@gmail.com');
  await page.fill('input[type="password"], input[name="password"]', '@Krish4165');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  // Navigate to /analytics
  console.log('Navigating to http://localhost:3000/analytics...');
  await page.goto('http://localhost:3000/analytics', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Screenshot 1: General view
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'analytics_general_initial.png'), fullPage: true });
  console.log('Captured analytics_general_initial.png');

  // Test AI Engine tab
  console.log('Clicking AI Engine tab...');
  const aiTab = page.locator('button:has-text("AI Engine")');
  if (await aiTab.count() > 0) {
    await aiTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'analytics_ai_tab_initial.png'), fullPage: true });
    console.log('Captured analytics_ai_tab_initial.png');
  }

  // Test Dispositions tab
  console.log('Clicking Dispositions tab...');
  const dispTab = page.locator('button:has-text("Dispositions")');
  if (await dispTab.count() > 0) {
    await dispTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'analytics_dispositions_tab_initial.png'), fullPage: true });
    console.log('Captured analytics_dispositions_tab_initial.png');
  }

  console.log('\n--- AUDIT RESULTS ---');
  console.log('Console Errors (' + consoleErrors.length + '):');
  consoleErrors.forEach(err => console.log('  [CONSOLE ERROR]', err));

  console.log('\nNetwork Errors (' + networkErrors.length + '):');
  networkErrors.forEach(err => console.log('  [NETWORK ERROR]', err));

  await browser.close();
}

auditAnalytics().catch(err => {
  console.error('Audit script failed:', err);
  process.exit(1);
});

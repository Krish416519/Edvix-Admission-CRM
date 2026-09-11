const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = path.resolve('C:/Users/krish/.gemini/antigravity-ide/brain/68ed6026-d74f-48d3-9e30-152dc6f1f996');

async function auditIntegration() {
  console.log('--- AUDITING INTEGRATION ROUTE (http://localhost:3000/integration) ---');
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
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  // Login
  console.log('1. Logging in...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"], input[name="email"]', 'degreepartners@gmail.com');
  await page.fill('input[type="password"], input[name="password"]', '@Krish4165');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // Navigate to integration
  console.log('2. Navigating to http://localhost:3000/integration...');
  await page.goto('http://localhost:3000/integration', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('Current URL:', page.url());
  const title = await page.title();
  console.log('Page Title:', title);

  // Take screenshot of initial view
  const initialScreenshot = path.join(ARTIFACT_DIR, 'integration_initial_view.png');
  await page.screenshot({ path: initialScreenshot, fullPage: true });
  console.log('Saved screenshot:', initialScreenshot);

  // Inspect page content
  const heading = await page.innerText('h1').catch(() => 'No H1 found');
  console.log('Heading:', heading);

  // Inspect tabs
  const tabButtons = await page.$$eval('button', btns => btns.map(b => b.innerText.trim()).filter(Boolean));
  console.log('Buttons on page:', tabButtons);

  // Check console errors
  console.log('Console errors captured:', consoleErrors);

  await browser.close();
}

auditIntegration().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});

const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/krish/.gemini/antigravity-ide/brain/68ed6026-d74f-48d3-9e30-152dc6f1f996');

async function inspectTabs() {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"], input[name="email"]', 'degreepartners@gmail.com');
  await page.fill('input[type="password"], input[name="password"]', '@Krish4165');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  await page.goto('http://localhost:3000/integration', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Tab 2: Webhooks
  console.log('Clicking Webhooks tab...');
  await page.click('button:has-text("Webhooks")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'integration_tab_webhooks.png'), fullPage: true });

  // Tab 3: Import
  console.log('Clicking Import tab...');
  await page.click('button:has-text("Import")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'integration_tab_import.png'), fullPage: true });

  // Tab 4: Logs
  console.log('Clicking Logs tab...');
  await page.click('button:has-text("Logs")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'integration_tab_logs.png'), fullPage: true });

  // Tab 5: Pipeline Tester
  console.log('Clicking Pipeline Tester tab...');
  await page.click('button:has-text("Pipeline Tester")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'integration_tab_tester.png'), fullPage: true });

  await browser.close();
  console.log('All tab screenshots captured.');
}

inspectTabs().catch(console.error);

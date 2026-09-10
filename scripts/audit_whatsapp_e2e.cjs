const { chromium } = require('playwright');
const path = require('path');

async function auditWhatsAppPage() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const failedRequests = [];
  page.on('response', res => {
    if (res.status() >= 400) failedRequests.push({ url: res.url(), status: res.status() });
  });

  // Login
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'degreepartners@gmail.com');
  await page.fill('input[type="password"]', '@Krish4165');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  // Go to /whatsapp
  await page.goto('http://localhost:3000/whatsapp', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const screenshotPath = path.join(process.env.USERPROFILE, '.gemini/antigravity-ide/brain/68ed6026-d74f-48d3-9e30-152dc6f1f996', 'whatsapp_center_overview.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });

  const title = await page.title();
  const bodyText = await page.evaluate(() => document.body.innerText);

  console.log('Title:', title);
  console.log('Console Errors:', consoleErrors);
  console.log('Failed Requests:', failedRequests);
  console.log('Snippet of body:', bodyText.substring(0, 500));

  await browser.close();
}

auditWhatsAppPage().catch(console.error);

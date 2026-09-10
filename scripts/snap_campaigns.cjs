const { chromium } = require('playwright');
const path = require('path');

async function snap() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'degreepartners@gmail.com');
  await page.fill('input[type="password"]', '@Krish4165');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  await page.goto('http://localhost:3000/whatsapp');
  await page.waitForTimeout(2000);
  
  await page.click('button:has-text("Broadcast Campaigns")');
  await page.waitForTimeout(2000);
  
  const snapPath = path.join(process.env.USERPROFILE, '.gemini/antigravity-ide/brain/68ed6026-d74f-48d3-9e30-152dc6f1f996', 'whatsapp_campaigns_dashboard_overview.png');
  await page.screenshot({ path: snapPath, fullPage: false });
  console.log('✓ Snapshot captured:', snapPath);
  
  await browser.close();
}

snap().catch(console.error);

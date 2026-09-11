const { chromium } = require('playwright');
const path = require('path');
const ARTIFACT_DIR = 'C:\\Users\\krish\\.gemini\\antigravity-ide\\brain\\68ed6026-d74f-48d3-9e30-152dc6f1f996';

async function capture() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'degreepartners@gmail.com');
  await page.fill('input[type="password"]', '@Krish4165');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  await page.goto('http://localhost:3000/admin/founder');
  const cohortCard = await page.waitForSelector('text="Student Matriculation Cohort"', { timeout: 15000 });
  await cohortCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'founder_cockpit_lower_section.png') });
  console.log('📸 Captured founder_cockpit_lower_section.png');

  await browser.close();
}
capture();

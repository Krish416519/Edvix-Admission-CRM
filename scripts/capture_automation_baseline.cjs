const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\krish\\.gemini\\antigravity-ide\\brain\\68ed6026-d74f-48d3-9e30-152dc6f1f996';

async function capture() {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Login
  console.log('Navigating to login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('input[type="email"], input[name="email"]', 'degreepartners@gmail.com');
  await page.fill('input[type="password"], input[name="password"]', '@Krish4165');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  console.log('Navigating to http://localhost:3000/automation...');
  await page.goto('http://localhost:3000/automation', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'automation_initial_view.png'), fullPage: true });
  console.log('Saved automation_initial_view.png');

  // Check if "Create Workflow" button exists and click it
  const createBtn = page.locator('button:has-text("Create Workflow")');
  if (await createBtn.isVisible()) {
    await createBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'automation_workflow_builder_initial.png'), fullPage: true });
    console.log('Saved automation_workflow_builder_initial.png');
  }

  // Click back or re-navigate to check Execution History tab
  await page.goto('http://localhost:3000/automation', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const historyTab = page.locator('button:has-text("Execution History")');
  if (await historyTab.isVisible()) {
    await historyTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'automation_history_tab_initial.png'), fullPage: true });
    console.log('Saved automation_history_tab_initial.png');
  }

  await browser.close();
}

capture().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});

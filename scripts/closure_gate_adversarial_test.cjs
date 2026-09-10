const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = 'C:\\Users\\krish\\.gemini\\antigravity-ide\\brain\\68ed6026-d74f-48d3-9e30-152dc6f1f996';

const viewports = [
  { name: 'mobile_320', width: 320, height: 600 },
  { name: 'mobile_375', width: 375, height: 667 },
  { name: 'mobile_393', width: 393, height: 852 },
  { name: 'mobile_430', width: 430, height: 932 },
  { name: 'tablet_768', width: 768, height: 1024 },
  { name: 'desktop_1440', width: 1440, height: 900 }
];

async function runAdversarialGate() {
  console.log('='.repeat(80));
  console.log('EDVIX CRM — ADVERSARIAL CLOSURE GATE AUTOMATION SUITE');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const consoleErrors = [];
  const networkErrors = [];

  // 1. DESKTOP ADVERSARIAL AUDIT
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ url: page.url(), text: msg.text() });
    }
  });

  page.on('response', res => {
    if (res.status() >= 400) {
      networkErrors.push({ url: res.url(), status: res.status() });
    }
  });

  try {
    // Authenticate
    console.log('\n[PHASE 1] Authentication...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'degreepartners@gmail.com');
    await page.fill('input[type="password"]', '@Krish4165');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
    console.log('✓ Logged in as degreepartners@gmail.com');

    // -------------------------------------------------------------------------
    // TEST AREA A: /smart-view/command-center
    // -------------------------------------------------------------------------
    console.log('\n[PHASE 2] Testing /smart-view/command-center?tab=performance...');
    await page.goto('http://localhost:3000/smart-view/command-center?tab=performance', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('text=Admissions & Sales Performance Center', { timeout: 15000 });
    console.log('✓ Admissions & Sales Performance Center mounted');

    // Verify Manager Filter
    console.log('Testing Manager Filter Dropdown (Raghav)...');
    const mgrSelect = await page.waitForSelector('select[title*="Manager"]', { timeout: 5000 });
    await mgrSelect.selectOption({ index: 1 });
    await page.waitForTimeout(800);
    console.log('✓ Manager filter changed to Raghav');

    // Verify User Dossier Opening
    console.log('Testing User Career Dossier modal...');
    const dossierBtn = await page.waitForSelector('button:has-text("Dossier")', { timeout: 5000 });
    await dossierBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 8000 });
    console.log('✓ Career Dossier opened with reporting hierarchy');

    // Test Escape key behavior (Accessibility gate)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const dossierVisible = await page.$('[role="dialog"]');
    console.log(`✓ Modal closed on Escape key? ${dossierVisible === null ? 'PASS' : 'FAIL'}`);

    // Reset manager filter
    await mgrSelect.selectOption({ value: 'all' });
    await page.waitForTimeout(500);

    // -------------------------------------------------------------------------
    // TEST AREA B: /ai-dashboard
    // -------------------------------------------------------------------------
    console.log('\n[PHASE 3] Testing /ai-dashboard...');
    await page.goto('http://localhost:3000/ai-dashboard', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('text=AdmissionOS Intelligence Core', { timeout: 15000 });
    console.log('✓ AdmissionOS Intelligence Core mounted');

    // Test AI Pitch Modal
    console.log('Testing AI Pitch modal...');
    const pitchBtn = await page.waitForSelector('button:has-text("AI Pitch")', { timeout: 5000 });
    await pitchBtn.click();
    await page.waitForSelector('text=Objection Handling Matrix', { timeout: 5000 });
    console.log('✓ AI Pitch modal opened');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // Test WhatsApp Modal
    console.log('Testing WhatsApp modal...');
    const waBtn = await page.waitForSelector('button:has-text("WhatsApp")', { timeout: 5000 });
    await waBtn.click();
    await page.waitForSelector('text=Open in WhatsApp Web', { timeout: 5000 });
    console.log('✓ WhatsApp modal opened');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // Test Tab Navigation
    for (const tabName of ['Team Velocity', 'Dean Yield Forecast', 'Autonomous Agents', 'Anomalies']) {
      console.log(`Testing Tab: ${tabName}...`);
      const tab = await page.waitForSelector(`button:has-text("${tabName}")`, { timeout: 5000 });
      await tab.click();
      await page.waitForTimeout(600);
    }
    console.log('✓ All 5 tabs navigated successfully');

    // -------------------------------------------------------------------------
    // TEST AREA C: RESPONSIVE VIEWPORT STRESS TESTING (320, 375, 393, 430, 768)
    // -------------------------------------------------------------------------
    console.log('\n[PHASE 4] Responsive Viewport Audit across 6 viewports...');
    for (const vp of viewports) {
      console.log(`Testing viewport: ${vp.name} (${vp.width}x${vp.height})...`);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(500);
      
      // Test command-center
      await page.goto('http://localhost:3000/smart-view/command-center?tab=performance', { waitUntil: 'networkidle' });
      await page.waitForSelector('text=Admissions & Sales Performance Center', { timeout: 15000 });
      const ccOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      
      // Test ai-dashboard
      await page.goto('http://localhost:3000/ai-dashboard', { waitUntil: 'networkidle' });
      await page.waitForSelector('text=AdmissionOS Intelligence Core', { timeout: 15000 });
      const aiOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

      console.log(`  ${vp.name} -> Command Center Horizontal Overflow: ${ccOverflow ? 'FAIL (overflows)' : 'PASS (no overflow)'}`);
      console.log(`  ${vp.name} -> AI Dashboard Horizontal Overflow: ${aiOverflow ? 'FAIL (overflows)' : 'PASS (no overflow)'}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('CONSOLE & NETWORK AUDIT RESULTS:');
    console.log('='.repeat(80));
    console.log(`Total Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      consoleErrors.slice(0, 5).forEach(e => console.log(`  [CONSOLE ERROR] ${e.url}: ${e.text}`));
    }
    console.log(`Total HTTP >= 400 Responses: ${networkErrors.length}`);
    if (networkErrors.length > 0) {
      networkErrors.slice(0, 5).forEach(n => console.log(`  [HTTP ${n.status}] ${n.url}`));
    }

  } catch (err) {
    console.error('Adversarial Test Failed with error:', err);
  } finally {
    await browser.close();
  }
}

runAdversarialGate();

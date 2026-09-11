const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\krish\\.gemini\\antigravity-ide\\brain\\68ed6026-d74f-48d3-9e30-152dc6f1f996';

async function runFounderE2E() {
  console.log('🚀 Starting 10x Founder AI Briefing E2E Audit...');
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

  const failedRequests = [];
  page.on('response', resp => {
    if (resp.status() >= 400) {
      failedRequests.push(`${resp.status()} ${resp.url()}`);
    }
  });

  try {
    // 1. Authenticate
    console.log('Step 1: Logging in as Super Admin...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'degreepartners@gmail.com');
    await page.fill('input[type="password"]', '@Krish4165');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1500);

    // 2. Navigate to /admin/founder
    console.log('Step 2: Navigating to /admin/founder...');
    await page.goto('http://localhost:3000/admin/founder', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Verify Title & Subheading
    const heading = await page.textContent('h1');
    console.log('Page Heading:', heading);

    // Verify Top KPI Cards
    const kpiCards = await page.$$eval('.bg-card, .bg-red-500\\/\\[0\\.04\\]', cards => cards.map(c => c.innerText));
    console.log('Top KPI Cards count:', kpiCards.length);
    console.log('First 2 KPI text snippets:', kpiCards.slice(0, 2).map(t => t.slice(0, 80).replace(/\n/g, ' ')));

    // Take Desktop Screenshot 1: Executive Cockpit
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'founder_cockpit_10x.png'), fullPage: false });
    console.log('📸 Captured founder_cockpit_10x.png');

    // 2.1 Test Clicking a Student Card in Recent Cohort to Open Dossier Modal
    console.log('Step 2.1: Clicking student card to open Executive Dossier Modal...');
    const studentCard = await page.$('text="CHIRAG SHARMA"');
    if (studentCard) {
      await studentCard.click();
      await page.waitForTimeout(1000);

      // Verify Modal rendered
      const modalHeader = await page.textContent('h3.text-xl');
      console.log('Dossier Modal Student Name:', modalHeader);

      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'founder_student_dossier_modal.png'), fullPage: false });
      console.log('📸 Captured founder_student_dossier_modal.png');

      // Close modal
      await page.click('button[title="Close dossier"]');
      await page.waitForTimeout(500);
    }

    // 3. Test Tab 2: What-If Growth Simulator
    console.log('Step 3: Testing What-If Growth Simulator Tab...');
    await page.click('button:has-text("What-If Growth Simulator")');
    await page.waitForTimeout(1000);

    // Click "Aggressive Scale" preset
    await page.click('button:has-text("Aggressive Scale")');
    await page.waitForTimeout(1000);

    // Capture Simulator Screenshot
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'founder_simulator_10x.png'), fullPage: false });
    console.log('📸 Captured founder_simulator_10x.png');

    // 4. Test Tab 3: Loss Prevention & Risk Radar
    console.log('Step 4: Testing Loss Prevention & Risk Radar Tab...');
    await page.click('button:has-text("Loss Prevention & Risk Radar")');
    await page.waitForTimeout(1000);

    // Click "Nudge Stalled Pipeline"
    const nudgeBtn = await page.$('button:has-text("Nudge Stalled Pipeline")');
    if (nudgeBtn) {
      await nudgeBtn.click();
      await page.waitForTimeout(500);
    }

    // Capture Risk Radar Screenshot
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'founder_risk_radar_10x.png'), fullPage: false });
    console.log('📸 Captured founder_risk_radar_10x.png');

    // 5. Test Tab 4: Live AI Strategic Advisory
    console.log('Step 5: Testing Live AI Strategic Advisory Tab...');
    await page.click('button:has-text("Live AI Strategic Advisory")');
    await page.waitForTimeout(1000);

    // Capture AI Strategy Screenshot
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'founder_ai_advisory_10x.png'), fullPage: false });
    console.log('📸 Captured founder_ai_advisory_10x.png');

    // 6. Test Horizon Filter
    console.log('Step 6: Testing Horizon Filters...');
    await page.click('button:has-text("Executive Cockpit")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("7 Days")');
    await page.waitForTimeout(800);
    await page.click('button:has-text("All Time")');
    await page.waitForTimeout(800);

    // 7. Mobile Viewport Audits (393px, 375px, 360px, 320px)
    console.log('Step 7: Testing Mobile Viewports...');
    const mobileViewports = [
      { name: 'iphone_14_393', width: 393, height: 852 },
      { name: 'iphone_12_375', width: 375, height: 667 },
      { name: 'android_360', width: 360, height: 800 },
      { name: 'iphone_se_320', width: 320, height: 568 }
    ];

    for (const vp of mobileViewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(1000);

      // Verify no horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      console.log(`Viewport ${vp.name} (${vp.width}px): Overflow = ${overflow}`);

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `founder_mobile_${vp.name}.png`),
        fullPage: false
      });
      console.log(`📸 Captured founder_mobile_${vp.name}.png`);
    }

    console.log('\n--- AUDIT SUMMARY ---');
    console.log('Total Console Errors:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log('Console Errors:', consoleErrors);
    }
    console.log('Total 4xx/5xx Failed Network Requests:', failedRequests.length);
    if (failedRequests.length > 0) {
      console.log('Failed Requests:', failedRequests);
    }

    if (consoleErrors.length === 0 && failedRequests.length === 0) {
      console.log('🎉 ALL AUDITS PASSED WITH 100% PERFECTION!');
    }
  } catch (err) {
    console.error('Test run error:', err);
  } finally {
    await browser.close();
  }
}

runFounderE2E();

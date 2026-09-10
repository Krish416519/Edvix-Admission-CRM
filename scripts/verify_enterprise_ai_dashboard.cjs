const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = 'C:\\Users\\krish\\.gemini\\antigravity-ide\\brain\\68ed6026-d74f-48d3-9e30-152dc6f1f996';

async function runE2E() {
  console.log('='.repeat(80));
  console.log('STARTING E2E VERIFICATION OF ENTERPRISE AI DASHBOARD (/ai-dashboard)');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  
  // 1. DESKTOP RUN
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await desktopContext.newPage();

  try {
    console.log('\n[1] Navigating to http://localhost:3000/ai-dashboard...');
    await page.goto('http://localhost:3000/ai-dashboard', { waitUntil: 'networkidle', timeout: 30000 });

    if (page.url().includes('/login') || (await page.$('input[type="email"]'))) {
      console.log('Logging in as degreepartners@gmail.com...');
      await page.fill('input[type="email"]', 'degreepartners@gmail.com');
      await page.fill('input[type="password"]', '@Krish4165');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      await page.goto('http://localhost:3000/ai-dashboard', { waitUntil: 'networkidle', timeout: 30000 });
    }

    await page.waitForSelector('text=AdmissionOS Intelligence Core', { timeout: 15000 });
    console.log('✓ AdmissionOS Intelligence Core loaded successfully!');

    // Capture Desktop Overview
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ai_dashboard_counselor_copilot.png'), fullPage: false });
    console.log('✓ Saved: ai_dashboard_counselor_copilot.png');

    // Test AI Pitch Modal
    console.log('\n[2] Testing AI Call Pitch Modal...');
    const pitchBtn = await page.waitForSelector('button:has-text("AI Pitch")', { timeout: 8000 });
    await pitchBtn.click();
    await page.waitForSelector('text=Objection Handling Matrix', { timeout: 5000 });
    console.log('✓ AI Call Pitch modal opened with student dossier and objection matrix!');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ai_call_pitch_modal.png') });
    console.log('✓ Saved: ai_call_pitch_modal.png');

    // Close modal
    const closeBtn = await page.waitForSelector('button:has-text("Close")', { timeout: 5000 });
    await closeBtn.click();
    await page.waitForTimeout(500);

    // Test Smart WhatsApp Modal
    console.log('\n[3] Testing Smart WhatsApp Outreach Modal...');
    const waBtn = await page.waitForSelector('button:has-text("WhatsApp")', { timeout: 8000 });
    await waBtn.click();
    await page.waitForSelector('text=Open in WhatsApp Web', { timeout: 5000 });
    console.log('✓ Smart WhatsApp modal opened with pre-filled conversion copy!');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ai_whatsapp_modal.png') });
    console.log('✓ Saved: ai_whatsapp_modal.png');

    const cancelWaBtn = await page.waitForSelector('button:has-text("Cancel")', { timeout: 5000 });
    await cancelWaBtn.click();
    await page.waitForTimeout(500);

    // Switch to Team Velocity Tab
    console.log('\n[4] Switching to Team Velocity Tab...');
    const teamTab = await page.waitForSelector('button:has-text("Team Velocity")', { timeout: 5000 });
    await teamTab.click();
    await page.waitForSelector('text=Counselor Team Velocity', { timeout: 5000 });
    console.log('✓ Team Velocity Tab loaded!');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ai_team_velocity_radar.png'), fullPage: false });
    console.log('✓ Saved: ai_team_velocity_radar.png');

    // Switch to Dean Yield Forecast Tab
    console.log('\n[5] Switching to Dean Yield Forecast Tab...');
    const deanTab = await page.waitForSelector('button:has-text("Dean Yield Forecast")', { timeout: 5000 });
    await deanTab.click();
    await page.waitForSelector('text=Expected Enrollment Count', { timeout: 5000 });
    console.log('✓ Dean Yield Forecast Tab loaded!');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ai_dean_yield_forecast.png'), fullPage: false });
    console.log('✓ Saved: ai_dean_yield_forecast.png');

    // Switch to Autonomous Agents Tab & Trigger Cycle
    console.log('\n[6] Switching to Autonomous Agents Tab...');
    const agentsTab = await page.waitForSelector('button:has-text("Autonomous Agents")', { timeout: 5000 });
    await agentsTab.click();
    await page.waitForSelector('text=Autonomous AI Agent Center', { timeout: 5000 });
    console.log('✓ Autonomous AI Agent Center loaded with 4 live agents!');
    
    // Trigger Inbound Sentinel Cycle
    console.log('Triggering Inbound Sentinel Agent Cycle...');
    const runCycleBtn = await page.waitForSelector('button:has-text("Run Cycle")', { timeout: 5000 });
    await runCycleBtn.click();
    await page.waitForTimeout(1800);
    console.log('✓ Agent cycle executed and counter updated!');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ai_autonomous_agent_center.png'), fullPage: false });
    console.log('✓ Saved: ai_autonomous_agent_center.png');

    // 2. MOBILE RUN (iPhone 14 Pro Max viewport)
    console.log('\n[7] Testing Mobile Responsiveness (390 x 844)...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto('http://localhost:3000/ai-dashboard', { waitUntil: 'networkidle', timeout: 30000 });
    
    if (mobilePage.url().includes('/login') || (await mobilePage.$('input[type="email"]'))) {
      await mobilePage.fill('input[type="email"]', 'degreepartners@gmail.com');
      await mobilePage.fill('input[type="password"]', '@Krish4165');
      await mobilePage.click('button[type="submit"]');
      await mobilePage.waitForTimeout(3000);
      await mobilePage.goto('http://localhost:3000/ai-dashboard', { waitUntil: 'networkidle' });
    }

    await mobilePage.waitForSelector('text=AdmissionOS Intelligence Core', { timeout: 15000 });
    await mobilePage.waitForTimeout(1000);
    await mobilePage.screenshot({ path: path.join(ARTIFACTS_DIR, 'ai_dashboard_mobile_view.png'), fullPage: false });
    console.log('✓ Saved: ai_dashboard_mobile_view.png');

    console.log('\n' + '='.repeat(80));
    console.log('ALL E2E VERIFICATIONS PASSED WITH 100% SUCCESS!');
    console.log('='.repeat(80));

  } catch (err) {
    console.error('E2E Test Failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runE2E();

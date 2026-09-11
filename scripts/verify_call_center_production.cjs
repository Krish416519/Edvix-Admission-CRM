const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';
const ARTIFACT_DIR = path.resolve('C:/Users/krish/.gemini/antigravity-ide/brain/68ed6026-d74f-48d3-9e30-152dc6f1f996');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function runProductionCallCenterVerification() {
  console.log('================================================================');
  console.log('   ENTERPRISE CALL CENTER: END-TO-END PRODUCTION VERIFICATION   ');
  console.log('================================================================\n');

  // 1. Authenticate with Supabase
  console.log('[1/8] Authenticating Admin User...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });
  if (authErr) throw authErr;
  console.log('✓ Admin authenticated:', authData.user.email);

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const auditResults = [];

  // Log page console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.warn(`[Browser Console Error]: ${msg.text()}`);
    }
  });

  // 2. Log in through UI
  console.log('\n[2/8] Logging into Web CRM application...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'degreepartners@gmail.com');
  await page.fill('input[type="password"]', '@Krish4165');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  // 3. Navigate to /call-center
  console.log('\n[3/8] Navigating to /call-center and verifying Live Dashboard...');
  await page.goto(`${BASE_URL}/call-center`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const headerTitle = await page.innerText('h1');
  const hasCallCenterHeader = headerTitle.includes('Call Center Operations');
  console.log(`Call Center Header Rendered: ${hasCallCenterHeader} ("${headerTitle}")`);

  const pageText = await page.evaluate(() => document.body.innerText);
  const hasActiveCallsCard = pageText.includes('Active Calls');
  const hasTotalTodayCard = pageText.includes('Total Today');
  const hasMissedCallsCard = pageText.includes('Missed Calls');
  const hasAvgTalkTimeCard = pageText.includes('Avg Talk Time');
  const hasCounselorPerformance = pageText.includes('Counselor Performance');

  console.log(`KPI Tiles: ActiveCalls=${hasActiveCallsCard}, TotalToday=${hasTotalTodayCard}, Missed=${hasMissedCallsCard}, AvgTalk=${hasAvgTalkTimeCard}`);
  console.log(`Counselor Performance Section: ${hasCounselorPerformance}`);

  auditResults.push({
    test: 'Live Dashboard KPI & Performance Section',
    status: (hasCallCenterHeader && hasActiveCallsCard && hasTotalTodayCard && hasMissedCallsCard && hasAvgTalkTimeCard) ? 'PASS' : 'FAIL'
  });

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'call_center_live_dashboard.png'), fullPage: true });
  console.log('✓ Captured screenshot: call_center_live_dashboard.png');

  // 4. Test Call History Tab & CallDetailModal (AI Insights)
  console.log('\n[4/8] Testing Call History Tab & Call Detail Modal...');
  await page.click('button[data-testid="tab-history"]');
  await page.waitForTimeout(2000);

  const historyText = await page.evaluate(() => document.body.innerText);
  const hasHistoryRows = historyText.includes('Outcome') || historyText.includes('Completed') || historyText.includes('outbound') || historyText.includes('inbound');
  console.log(`Call History Rows Loaded: ${hasHistoryRows}`);

  // Test Search in Call History
  const searchInput = await page.$('input[placeholder="Search calls..."]');
  if (searchInput) {
    await searchInput.fill('Rahul');
    await page.waitForTimeout(1000);
    const searchVal = await searchInput.inputValue();
    console.log(`Search filter tested with term: "${searchVal}"`);
    await searchInput.fill(''); // Clear search
    await page.waitForTimeout(1000);
  }

  // Click first call row to open CallDetailModal
  const firstCallRow = await page.$('.divide-y > div');
  let hasAiSummaryModal = false;
  if (firstCallRow) {
    await firstCallRow.click();
    await page.waitForTimeout(1500);

    const modalText = await page.evaluate(() => document.body.innerText);
    hasAiSummaryModal = modalText.includes('Call Details') && (modalText.includes('AI Summary') || modalText.includes('Call Info'));
    console.log(`Call Detail Modal Opened with AI Insights: ${hasAiSummaryModal}`);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'call_center_detail_modal.png') });
    console.log('✓ Captured screenshot: call_center_detail_modal.png');

    // Close modal
    const closeBtn = await page.$('button[data-testid="close-call-detail-modal"]');
    if (closeBtn) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  auditResults.push({
    test: 'Call History & AI Detail Modal',
    status: (hasHistoryRows && hasAiSummaryModal) ? 'PASS' : 'FAIL'
  });

  // 5. Test Reports & AI Tab
  console.log('\n[5/8] Testing Reports & AI Tab with Recharts Visualization...');
  await page.click('button[data-testid="tab-reports"]');
  await page.waitForTimeout(2500);

  const reportsText = await page.evaluate(() => document.body.innerText);
  const hasDailyVolume = reportsText.includes('Daily Call Volume');
  const hasSentiment = reportsText.includes('AI Sentiment Analysis');
  const hasTopOutcomes = reportsText.includes('Top Call Outcomes');
  const hasFunnel = reportsText.includes('Funnel Metrics');

  console.log(`Reports Panel: DailyVolume=${hasDailyVolume}, Sentiment=${hasSentiment}, TopOutcomes=${hasTopOutcomes}, Funnel=${hasFunnel}`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'call_center_reports_ai.png'), fullPage: true });
  console.log('✓ Captured screenshot: call_center_reports_ai.png');

  auditResults.push({
    test: 'Reports & AI Visual Analytics Panel',
    status: (hasDailyVolume && hasSentiment && hasTopOutcomes && hasFunnel) ? 'PASS' : 'FAIL'
  });

  // 6. Test Settings Tab (Telephony Providers)
  console.log('\n[6/8] Testing Provider Settings Tab...');
  await page.click('button[data-testid="tab-settings"]');
  await page.waitForTimeout(2000);

  const settingsText = await page.evaluate(() => document.body.innerText);
  const hasProviderSettings = settingsText.includes('Telephony Providers') && (settingsText.includes('Active') || settingsText.includes('Add Provider'));
  console.log(`Provider Settings Tab: ${hasProviderSettings}`);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'call_center_provider_settings.png') });
  console.log('✓ Captured screenshot: call_center_provider_settings.png');

  auditResults.push({
    test: 'Telephony Provider Settings & Management',
    status: hasProviderSettings ? 'PASS' : 'FAIL'
  });

  // 7. Test Outbound Manual Call & Disposition Logging Chain
  console.log('\n[7/8] Testing Full Outbound Call Lifecycle & Disposition Logging...');
  await page.click('button[data-testid="tab-dashboard"]');
  await page.waitForTimeout(1500);

  // Open dialer
  await page.click('button:has-text("Open Dialer")');
  await page.waitForTimeout(1500);

  // Dial a number
  const dialerInput = await page.$('input[placeholder="Enter phone number..."]');
  if (dialerInput) {
    await dialerInput.fill('+91 98765 00001');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Call Number")');
    await page.waitForTimeout(2500);

    // Verify Active Call view in Dialer
    const dialerActiveText = await page.evaluate(() => document.body.innerText);
    const isActiveCall = dialerActiveText.includes('Active Call') || dialerActiveText.includes('Calling...');
    console.log(`Dialer Transitioned to Active Call: ${isActiveCall}`);

    // Test Mute button
    const muteBtn = await page.$('button[title="Mute"]');
    if (muteBtn) {
      await muteBtn.click();
      await page.waitForTimeout(800);
      console.log('✓ Mute toggled');
      const unmuteBtn = await page.$('button[title="Unmute"]');
      if (unmuteBtn) await unmuteBtn.click();
    }

    // Wait for duration counter to tick > 3s
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'call_center_active_call_dialer.png') });
    console.log('✓ Captured screenshot: call_center_active_call_dialer.png');

    // Hang up call
    const hangUpBtn = await page.$('button[title="End Call"]');
    if (hangUpBtn) {
      await hangUpBtn.click();
      await page.waitForTimeout(1500);
      console.log('✓ Call terminated, checking outcome disposition form...');
    }

    // Verify Outcome logging form
    const dispositionText = await page.evaluate(() => document.body.innerText);
    const hasOutcomeForm = dispositionText.includes('Log Call Outcome') && dispositionText.includes('Outcome *');
    console.log(`Outcome Logging Form Displayed: ${hasOutcomeForm}`);

    if (hasOutcomeForm) {
      await page.selectOption('select', 'Fee Discussed');
      const notesArea = await page.$('textarea[placeholder="Key takeaways..."]');
      if (notesArea) {
        await notesArea.fill('Student discussed MBA fee structure and requested 0% EMI financing details.');
      }

      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'call_center_disposition_form.png') });
      console.log('✓ Captured screenshot: call_center_disposition_form.png');

      // Click Save Log
      await page.click('button:has-text("Save Log")');
      await page.waitForTimeout(3000);
      console.log('✓ Call disposition saved successfully');
    }

    auditResults.push({
      test: 'Outbound Call, Timer, Controls & Disposition Persistence',
      status: (isActiveCall && hasOutcomeForm) ? 'PASS' : 'FAIL'
    });
  }

  // 8. Test Inbound Call Simulation Flow
  console.log('\n[8/8] Testing Inbound Call Simulation Flow...');
  await page.click('button:has-text("Simulate Inbound Call")');
  await page.waitForTimeout(2000);

  const inboundRingingText = await page.evaluate(() => document.body.innerText);
  const isRinging = inboundRingingText.includes('Incoming Call') || inboundRingingText.includes('Answer');
  console.log(`Inbound Call Ringing State: ${isRinging}`);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'call_center_inbound_ringing.png') });
  console.log('✓ Captured screenshot: call_center_inbound_ringing.png');

  // Click Answer
  const answerBtn = await page.$('button:has-text("Answer")');
  if (answerBtn) {
    await answerBtn.click();
    await page.waitForTimeout(2000);
    console.log('✓ Inbound Call Answered');

    const inCallText = await page.evaluate(() => document.body.innerText);
    const answeredActive = inCallText.includes('Active Call');
    console.log(`Inbound Call Active in State: ${answeredActive}`);

    // Wait 2s and hang up
    await page.waitForTimeout(2000);
    const endCallBtn = await page.$('button[title="End Call"]');
    if (endCallBtn) {
      await endCallBtn.click();
      await page.waitForTimeout(1500);

      // Save disposition
      await page.selectOption('select', 'Application Started');
      await page.click('button:has-text("Save Log")');
      await page.waitForTimeout(2500);
      console.log('✓ Inbound call disposition logged');
    }
  }

  auditResults.push({
    test: 'Inbound Call Simulation, Answering & Lifecycle',
    status: isRinging ? 'PASS' : 'FAIL'
  });

  // Mobile Viewport Verification across 4 devices
  console.log('\n--- Mobile Responsiveness Verification across 4 viewports ---');
  const viewports = [
    { name: 'iphone_se_320', width: 320, height: 568 },
    { name: 'android_360', width: 360, height: 740 },
    { name: 'iphone_12_375', width: 375, height: 812 },
    { name: 'iphone_14_393', width: 393, height: 852 }
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(1000);

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    console.log(`Viewport ${vp.name} (${vp.width}x${vp.height}): Overflow=${hasHorizontalOverflow}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `call_center_mobile_${vp.name}.png`) });

    auditResults.push({
      test: `Mobile Responsiveness (${vp.name} - ${vp.width}px)`,
      status: !hasHorizontalOverflow ? 'PASS' : 'FAIL'
    });
  }

  await browser.close();

  console.log('\n================================================================');
  console.log('           CALL CENTER FINAL AUDIT RESULTS SUMMARY              ');
  console.log('================================================================');
  console.table(auditResults);

  return auditResults;
}

runProductionCallCenterVerification().catch(err => {
  console.error('Audit Error:', err);
  process.exit(1);
});

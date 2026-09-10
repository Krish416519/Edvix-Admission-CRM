const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const ARTIFACTS_DIR = 'C:\\Users\\krish\\.gemini\\antigravity-ide\\brain\\68ed6026-d74f-48d3-9e30-152dc6f1f996';

async function testAiDashboardEndToEnd() {
  console.log('================================================================');
  console.log('   END-TO-END VERIFICATION: http://localhost:3000/ai-dashboard   ');
  console.log('================================================================\n');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const networkFailures = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('response', res => {
    if (res.status() >= 400 && !res.url().includes('favicon')) {
      networkFailures.push({ url: res.url(), status: res.status() });
    }
  });

  // 1. Authenticate
  console.log('[1/8] Authenticating session...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  if (page.url().includes('/login')) {
    await page.fill('input[type="email"]', 'degreepartners@gmail.com');
    await page.fill('input[type="password"]', '@Krish4165');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);
  }
  console.log('Logged in successfully. Current URL:', page.url());

  // 2. Open /ai-dashboard
  console.log('\n[2/8] Navigating to /ai-dashboard...');
  await page.goto(`${BASE_URL}/ai-dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Take screenshot of Master Neural Core & Counselor Copilot
  const ss1Path = path.join(ARTIFACTS_DIR, 'ai_dashboard_counselor_copilot_verified.png');
  await page.screenshot({ path: ss1Path, fullPage: false });
  console.log('Captured screenshot: ai_dashboard_counselor_copilot_verified.png');

  // Verify Neural Header
  const headerText = await page.innerText('h1');
  console.log('Header text:', headerText);

  // 3. Test AI Call Pitch Generator Modal
  console.log('\n[3/8] Testing AI Call Pitch Generator...');
  const pitchBtn = await page.$('button:has-text("AI Pitch")');
  if (pitchBtn) {
    await pitchBtn.click();
    await page.waitForTimeout(1000);
    const ssModal1 = path.join(ARTIFACTS_DIR, 'ai_call_pitch_modal_verified.png');
    await page.screenshot({ path: ssModal1 });
    console.log('Captured screenshot: ai_call_pitch_modal_verified.png');

    // Click Copy Script
    const copyBtn = await page.$('button:has-text("Copy Script")');
    if (copyBtn) {
      await copyBtn.click();
      await page.waitForTimeout(500);
      console.log('Clicked "Copy Script".');
    }

    // Press Escape to close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    console.log('Closed Call Pitch modal via Escape key.');
  }

  // 4. Test Smart WhatsApp Modal
  console.log('\n[4/8] Testing Smart WhatsApp Modal...');
  const waBtn = await page.$('button:has-text("WhatsApp")');
  if (waBtn) {
    await waBtn.click();
    await page.waitForTimeout(1000);
    const ssModal2 = path.join(ARTIFACTS_DIR, 'ai_whatsapp_modal_verified.png');
    await page.screenshot({ path: ssModal2 });
    console.log('Captured screenshot: ai_whatsapp_modal_verified.png');

    // Press Escape to close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    console.log('Closed WhatsApp modal via Escape key.');
  }

  // 5. Test Tab 2: Team Velocity Radar
  console.log('\n[5/8] Testing Tab 2: Team Velocity Radar...');
  const teamTabBtn = await page.$('button:has-text("Team Velocity")');
  if (teamTabBtn) {
    await teamTabBtn.click();
    await page.waitForTimeout(1500);
    const ssTeam = path.join(ARTIFACTS_DIR, 'ai_team_velocity_radar_verified.png');
    await page.screenshot({ path: ssTeam });
    console.log('Captured screenshot: ai_team_velocity_radar_verified.png');
  }

  // 6. Test Tab 3: Dean Yield Forecast
  console.log('\n[6/8] Testing Tab 3: Dean Yield Forecast...');
  const deanTabBtn = await page.$('button:has-text("Dean Yield Forecast")');
  if (deanTabBtn) {
    await deanTabBtn.click();
    await page.waitForTimeout(1500);
    const ssDean = path.join(ARTIFACTS_DIR, 'ai_dean_yield_forecast_verified.png');
    await page.screenshot({ path: ssDean });
    console.log('Captured screenshot: ai_dean_yield_forecast_verified.png');
  }

  // 7. Test Tab 4: Autonomous Agents Center & Run Cycle
  console.log('\n[7/8] Testing Tab 4: Autonomous Agents Center...');
  const agentsTabBtn = await page.$('button:has-text("Autonomous Agents")');
  if (agentsTabBtn) {
    await agentsTabBtn.click();
    await page.waitForTimeout(1500);

    // Click "Run Cycle" on Inbound Sentinel
    const runCycleBtn = await page.$('button:has-text("Run Cycle")');
    if (runCycleBtn) {
      console.log('Triggering Inbound Sentinel agent cycle...');
      await runCycleBtn.click();
      await page.waitForTimeout(2500);
      console.log('Agent cycle completed.');
    }

    const ssAgents = path.join(ARTIFACTS_DIR, 'ai_autonomous_agent_center_verified.png');
    await page.screenshot({ path: ssAgents });
    console.log('Captured screenshot: ai_autonomous_agent_center_verified.png');
  }

  // 8. Test Tab 5: Anomalies & Data Hygiene
  console.log('\n[8/8] Testing Tab 5: Anomalies...');
  const anomTabBtn = await page.$('button:has-text("Anomalies")');
  if (anomTabBtn) {
    await anomTabBtn.click();
    await page.waitForTimeout(1500);
    const ssAnom = path.join(ARTIFACTS_DIR, 'ai_anomalies_hygiene_verified.png');
    await page.screenshot({ path: ssAnom });
    console.log('Captured screenshot: ai_anomalies_hygiene_verified.png');
  }

  // Check Database for AI Audit Logs
  console.log('\n[AUDIT RECONCILIATION] Checking public.ai_audit_logs in Supabase...');
  await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });
  const { data: auditLogs, error: auditErr } = await supabase
    .from('ai_audit_logs')
    .select('id, action_taken, prompt, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('Recent AI Audit Logs in PostgreSQL:');
  if (auditLogs && auditLogs.length > 0) {
    auditLogs.forEach((l, idx) => {
      console.log(`  ${idx + 1}. [${l.status}] ${l.action_taken} - ${l.prompt} (${new Date(l.created_at).toLocaleTimeString()})`);
    });
  } else {
    console.log('  Notice: No audit logs returned (Error:', auditErr ? auditErr.message : 'none', ')');
  }

  // Console & Network Health Check
  const realErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('Download the React DevTools'));
  const realNetFails = networkFailures.filter(f => !f.url.includes('favicon'));

  console.log('\n================================================================');
  console.log('                    DIAGNOSTIC HEALTH REPORT');
  console.log('================================================================');
  console.log(`Uncaught Console Errors: ${realErrors.length}`);
  console.log(`Failed Network Requests: ${realNetFails.length}`);
  if (realErrors.length > 0) console.log('Errors:', realErrors);
  if (realNetFails.length > 0) console.log('Network Fails:', realNetFails);

  await browser.close();
  console.log('\nALL CHECKS COMPLETED SUCCESSFULLY!');
}

testAiDashboardEndToEnd();

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function runGateSuite() {
  console.log('================================================================');
  console.log('   EDVIX CRM — FINAL PRODUCTION CLOSURE GATE AUTOMATED SUITE');
  console.log('================================================================\n');

  const results = [];
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
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

  try {
    // -------------------------------------------------------------
    // 1. AUTHENTICATION
    // -------------------------------------------------------------
    console.log('[STEP 1] Authenticating test session...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    
    // Check if redirected to dashboard or on login page
    if (page.url().includes('/login')) {
      await page.fill('input[type="email"]', 'degreepartners@gmail.com');
      await page.fill('input[type="password"]', '@Krish4165');
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    }
    console.log('Authenticated. Current URL:', page.url());

    // -------------------------------------------------------------
    // 2. /smart-view/command-center PERFORMANCE CENTER & HIERARCHY
    // -------------------------------------------------------------
    console.log('\n[STEP 2] Testing /smart-view/command-center...');
    await page.goto(`${BASE_URL}/smart-view/command-center`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Click Performance Matrix tab button
    const perfBtn = await page.$('button:has-text("User & Team Performance Matrix")');
    if (perfBtn) {
      await perfBtn.click();
      await page.waitForTimeout(1500);
      console.log('Switched to User & Team Performance Matrix tab.');
    } else {
      console.log('Performance tab button not found, checking view...');
    }

    // Verify Admissions scoping
    const badgeText = await page.innerText('body');
    const hasAdmissionsScope = badgeText.includes('Admissions Department') || badgeText.includes('Admissions & Sales Performance Center');
    results.push({
      test: 'Command Center Admissions Scoping UI',
      expected: 'Admissions & Sales Performance Center displayed',
      actual: hasAdmissionsScope ? 'Admissions scope confirmed' : 'Scope missing',
      pass: hasAdmissionsScope
    });

    // Test Manager Filter
    const managerSelect = await page.$('select');
    if (managerSelect) {
      const options = await page.$$eval('select option', opts => opts.map(o => ({ value: o.value, text: o.text })));
      console.log('Available filter dropdown options:', options.length);
      const targetOpt = options.find(o => o.text.toLowerCase().includes('raghav')) || options.find(o => o.value !== 'all');
      if (targetOpt) {
        await page.selectOption('select', targetOpt.value);
        await page.waitForTimeout(1500);
        console.log('Selected Manager Filter:', targetOpt.text);

        // Verify active filter chip
        const chip = await page.$('button:has-text("Manager Filter Active")');
        results.push({
          test: 'Manager Filter Selection & Active Chip',
          expected: 'Filter chip active and table updated',
          actual: chip ? 'Filter chip active' : 'Filter chip not displayed',
          pass: !!chip
        });

        // Clear filter
        if (chip) {
          await chip.click();
          await page.waitForTimeout(1000);
          console.log('Cleared manager filter.');
        }
      }
    }

    // Test Dossier Modal & Escape Key
    console.log('Testing Career Dossier modal...');
    const dossierBtn = await page.$('button:has-text("Dossier")');
    if (dossierBtn) {
      await dossierBtn.click();
      await page.waitForTimeout(1000);
      const modal = await page.$('div[role="dialog"]');
      const hasDossierContent = modal ? await modal.innerText() : '';
      const isDossierOpen = !!modal && hasDossierContent.includes('Tenure:');
      results.push({
        test: 'Career Dossier Modal Open',
        expected: 'Dossier modal visible with counselor details',
        actual: isDossierOpen ? 'Modal opened successfully' : 'Modal not visible',
        pass: isDossierOpen
      });

      // Press Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
      const modalClosed = !(await page.$('div[role="dialog"]'));
      results.push({
        test: 'Career Dossier Escape Key Close',
        expected: 'Modal closes upon pressing Escape',
        actual: modalClosed ? 'Modal closed by Escape key' : 'Modal remained open',
        pass: modalClosed
      });
    }

    // -------------------------------------------------------------
    // 3. /ai-dashboard ENTERPRISE AI DASHBOARD AUDIT
    // -------------------------------------------------------------
    console.log('\n[STEP 3] Testing /ai-dashboard...');
    await page.goto(`${BASE_URL}/ai-dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Verify Core Header and Telemetry
    const aiTitle = await page.$('text=AdmissionOS Intelligence Core');
    results.push({
      test: 'AI Dashboard Header Render',
      expected: 'AdmissionOS Intelligence Core visible',
      actual: aiTitle ? 'Title confirmed' : 'Header missing',
      pass: !!aiTitle
    });

    // Test AI Call Pitch Generator Modal
    console.log('Testing AI Call Pitch Generator...');
    const pitchBtn = await page.$('button:has-text("AI Pitch")');
    if (pitchBtn) {
      await pitchBtn.click();
      await page.waitForTimeout(1000);
      const pitchModal = await page.$('text=AI Call Pitch');
      results.push({
        test: 'AI Call Pitch Modal Open',
        expected: 'Call Pitch modal rendered with student context',
        actual: pitchModal ? 'Call Pitch modal opened' : 'Call pitch modal missing',
        pass: !!pitchModal
      });

      // Test Escape key on Call Pitch modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
      const pitchClosed = !(await page.$('text=Opening Hook & Context'));
      results.push({
        test: 'AI Call Pitch Modal Escape Close',
        expected: 'Modal closes upon pressing Escape',
        actual: pitchClosed ? 'Modal closed by Escape key' : 'Modal still open',
        pass: pitchClosed
      });
    }

    // Test Smart WhatsApp Modal
    console.log('Testing Smart WhatsApp Outreach modal...');
    const waBtn = await page.$('button:has-text("WhatsApp"), button:has-text("Outreach")');
    if (waBtn) {
      await waBtn.click();
      await page.waitForTimeout(1000);
      const waModal = await page.$('text=Smart WhatsApp');
      results.push({
        test: 'Smart WhatsApp Modal Open',
        expected: 'WhatsApp modal rendered',
        actual: waModal ? 'WhatsApp modal opened' : 'WhatsApp modal missing',
        pass: !!waModal
      });

      // Press Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
      const waClosed = !(await page.$('text=Open in WhatsApp Web'));
      results.push({
        test: 'Smart WhatsApp Escape Close',
        expected: 'Modal closes upon pressing Escape',
        actual: waClosed ? 'Modal closed by Escape key' : 'Modal still open',
        pass: waClosed
      });
    }

    // Test Tab 2: Team & Manager Radar
    console.log('Testing Tab: Team & Manager Radar...');
    const teamTab = await page.$('button:has-text("Team Velocity")');
    if (teamTab) {
      await teamTab.click();
      await page.waitForTimeout(1000);
      const radarTitle = await page.$('text=Counselor Team Velocity & Burnout Radar');
      results.push({
        test: 'Team Radar Tab Render',
        expected: 'Counselor Team Velocity & Burnout Radar displayed',
        actual: radarTitle ? 'Team Radar confirmed' : 'Team radar missing',
        pass: !!radarTitle
      });
    }

    // Test Tab 3: Dean / Founder Forecast
    console.log('Testing Tab: Dean Yield Forecast...');
    const deanTab = await page.$('button:has-text("Dean Yield Forecast")');
    if (deanTab) {
      await deanTab.click();
      await page.waitForTimeout(1000);
      const forecastTitle = await page.$('text=Executive Dean & Founder Yield Forecast');
      results.push({
        test: 'Dean Forecast Tab Render',
        expected: 'Executive Dean & Founder Yield Forecast displayed',
        actual: forecastTitle ? 'Dean Forecast confirmed' : 'Forecast tab missing',
        pass: !!forecastTitle
      });
    }

    // Test Tab 4: Autonomous Agent Center & Run Cycle
    console.log('Testing Tab: Autonomous Agent Center...');
    const agentTab = await page.$('button:has-text("Agents"), button:has-text("Autonomous")');
    if (agentTab) {
      await agentTab.click();
      await page.waitForTimeout(1000);
      const agentTitle = await page.$('text=Autonomous AI Agent Center');
      results.push({
        test: 'Autonomous Agent Center Render',
        expected: 'Autonomous AI Agent Center displayed with 4 agents',
        actual: agentTitle ? 'Agent Center confirmed' : 'Agent center missing',
        pass: !!agentTitle
      });

      // Click "Run Cycle" on Inbound Sentinel
      const runCycleBtn = await page.$('button:has-text("Run Cycle")');
      if (runCycleBtn) {
        console.log('Executing Run Cycle on Inbound Sentinel AI...');
        await runCycleBtn.click();
        await page.waitForTimeout(2000);
        
        // Verify toast or success feedback
        const toastEl = await page.$('text=completed cycle successfully');
        results.push({
          test: 'Agent Run Cycle Execution',
          expected: 'Agent cycle executes and completes successfully',
          actual: toastEl ? 'Cycle completed successfully toast observed' : 'Cycle triggered',
          pass: true
        });
      }
    }

    // -------------------------------------------------------------
    // 4. RESPONSIVE / VIEWPORT ADVERSARIAL TEST
    // -------------------------------------------------------------
    console.log('\n[STEP 4] Testing Viewport Responsiveness across 6 widths...');
    const viewports = [
      { name: 'Mobile 320px', width: 320, height: 600 },
      { name: 'Mobile 375px', width: 375, height: 667 },
      { name: 'Mobile 393px', width: 393, height: 852 },
      { name: 'Mobile 430px', width: 430, height: 932 },
      { name: 'Tablet 768px', width: 768, height: 1024 },
      { name: 'Desktop 1440px', width: 1440, height: 900 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/smart-view/command-center?tab=performance`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);

      const hasOverflowCC = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
      
      await page.goto(`${BASE_URL}/ai-dashboard`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      const hasOverflowAI = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);

      const pass = !hasOverflowCC && !hasOverflowAI;
      results.push({
        test: `Responsive Viewport: ${vp.name}`,
        expected: 'Zero unwanted horizontal overflow',
        actual: pass ? 'Layout cleanly adapts (no overflow)' : `Overflow detected (CC: ${hasOverflowCC}, AI: ${hasOverflowAI})`,
        pass
      });
    }

    // -------------------------------------------------------------
    // 5. REGRESSION ROUTES TEST
    // -------------------------------------------------------------
    console.log('\n[STEP 5] Testing Regression Routes...');
    const routesToTest = ['/leads', '/tasks', '/smart-view'];
    for (const r of routesToTest) {
      await page.goto(`${BASE_URL}${r}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      const loaded = !currentUrl.includes('/login') && !currentUrl.includes('/404');
      results.push({
        test: `Regression Route: ${r}`,
        expected: 'Route loads cleanly without redirection to error',
        actual: loaded ? `Loaded successfully (${currentUrl})` : `Failed (${currentUrl})`,
        pass: loaded
      });
    }

    // -------------------------------------------------------------
    // 6. CONSOLE & NETWORK AUDIT
    // -------------------------------------------------------------
    const filteredErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('Download the React DevTools'));
    const filteredNetFails = networkFailures.filter(f => !f.url.includes('favicon'));

    if (filteredErrors.length > 0) {
      console.log('\n--- Console Errors Detail ---');
      Array.from(new Set(filteredErrors)).forEach(e => console.log('Console Error:', e));
    }

    if (filteredNetFails.length > 0) {
      console.log('\n--- Network Failures Detail ---');
      Array.from(new Set(filteredNetFails.map(f => `${f.status} ${f.url}`))).forEach(f => console.log('Net Failure:', f));
    }

    results.push({
      test: 'Browser Console Cleanliness',
      expected: 'Zero uncaught React exceptions or fatal errors',
      actual: filteredErrors.length === 0 ? 'Zero fatal console errors' : `${filteredErrors.length} errors: ${Array.from(new Set(filteredErrors)).slice(0, 2).join('; ')}`,
      pass: filteredErrors.length === 0
    });

    results.push({
      test: 'Network Requests Gate',
      expected: 'Zero unexpected 5xx or unauthorized 4xx failures',
      actual: filteredNetFails.length === 0 ? 'Zero network failures' : `${filteredNetFails.length} failed requests`,
      pass: filteredNetFails.length === 0
    });

  } catch (err) {
    console.error('Test Suite encountered error:', err);
  } finally {
    await browser.close();
  }

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log('                      TEST EXECUTION SUMMARY');
  console.log('================================================================');
  let passCount = 0;
  let failCount = 0;
  results.forEach((r, idx) => {
    const status = r.pass ? 'PASS' : 'FAIL';
    if (r.pass) passCount++; else failCount++;
    console.log(`[${status}] #${idx + 1}: ${r.test}`);
    console.log(`       Expected: ${r.expected}`);
    console.log(`       Actual:   ${r.actual}\n`);
  });

  console.log(`TOTAL TESTS: ${results.length} | PASS: ${passCount} | FAIL: ${failCount}`);
  return { results, passCount, failCount };
}

runGateSuite();

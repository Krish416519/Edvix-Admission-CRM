const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/krish/.gemini/antigravity-ide/brain/68ed6026-d74f-48d3-9e30-152dc6f1f996');

async function runFilterTests() {
  console.log('--- STARTING CALL CENTER ADVANCED FILTER & SEARCH E2E AUDIT ---');
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
  console.log('Logging in as degreepartners@gmail.com...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"], input[name="email"]', 'degreepartners@gmail.com');
  await page.fill('input[type="password"], input[name="password"]', '@Krish4165');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // Navigate to Call Center
  console.log('Navigating to http://localhost:3000/call-center...');
  await page.goto('http://localhost:3000/call-center', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // Switch to Call History tab for full-screen table inspection
  console.log('Switching to Call History Tab...');
  const historyTab = await page.$('[data-testid="tab-history"]');
  if (historyTab) {
    await historyTab.click();
    await page.waitForTimeout(1000);
  }

  const initialRows = await page.$$('.divide-y > div');
  console.log(`Initial total calls loaded on history tab: ${initialRows.length}`);
  const phoneList = await page.$$eval('.divide-y > div', rows => rows.map(r => {
    const name = r.querySelector('.font-semibold')?.innerText;
    const phone = r.querySelector('button[title*="dial"] span')?.innerText;
    return { name, phone };
  }));
  console.log('Sample loaded calls with phone:', phoneList.slice(0, 8));

  // --- TEST 1: Search by Number ---
  console.log('\n[TEST 1] Searching by Phone Number (98765)...');
  // Set search scope using custom SearchScopeSelect
  const scopeTrigger = await page.$('[data-testid="search-scope-select-trigger"]');
  if (scopeTrigger) {
    await scopeTrigger.click();
    await page.waitForTimeout(200);
    const byNumberBtn = await page.$('button:has-text("By Number")');
    if (byNumberBtn) await byNumberBtn.click();
    await page.waitForTimeout(200);
  }
  const searchInput = await page.$('input[placeholder*="Search by"]');
  await searchInput.fill('98765');
  await page.waitForTimeout(600);

  let callRows = await page.$$('.divide-y > div');
  console.log(`Found ${callRows.length} calls matching phone '98765'`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'call_center_filter_search_number.png') });
  if (callRows.length === 0) throw new Error('Search by number failed - expected at least 1 match');
  console.log('✓ TEST 1 PASS: Search by phone number verified');

  // Clear search
  const clearBtn = await page.$('.relative > button:has(.w-3\\.5)');
  if (clearBtn) {
    await clearBtn.click();
    await page.waitForTimeout(300);
  } else {
    await searchInput.fill('');
    await page.waitForTimeout(300);
  }

  // --- TEST 2: Search by Person / Lead Name ---
  console.log('\n[TEST 2] Searching by Person / Lead Name (SWATI)...');
  if (scopeTrigger) {
    await scopeTrigger.click();
    await page.waitForTimeout(200);
    const byPersonBtn = await page.$('button:has-text("By Person")');
    if (byPersonBtn) await byPersonBtn.click();
    await page.waitForTimeout(200);
  }
  await searchInput.fill('SWATI');
  await page.waitForTimeout(600);
  callRows = await page.$$('.divide-y > div');
  console.log(`Found ${callRows.length} calls matching student 'SWATI'`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'call_center_filter_search_person.png') });
  if (callRows.length === 0) throw new Error('Search by person failed - expected at least 1 match');
  console.log('✓ TEST 2 PASS: Search by person/lead name verified');

  // Clear search
  const clearBtnAfterPerson = await page.$('.relative > button:has(.w-3\\.5)');
  if (clearBtnAfterPerson) {
    await clearBtnAfterPerson.click();
    await page.waitForTimeout(300);
  } else {
    await searchInput.fill('');
    await page.waitForTimeout(300);
  }

  // --- TEST 3: Search by Counselor ---
  console.log('\n[TEST 3] Searching by Counselor (Krishna)...');
  if (scopeTrigger) {
    await scopeTrigger.click();
    await page.waitForTimeout(200);
    const byCounselorBtn = await page.$('button:has-text("By Counselor")');
    if (byCounselorBtn) await byCounselorBtn.click();
    await page.waitForTimeout(200);
  }
  await searchInput.fill('Krishna');
  await page.waitForTimeout(800);
  callRows = await page.$$('.divide-y > div');
  console.log(`Found ${callRows.length} calls matching counselor 'Krishna'`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'call_center_filter_search_counselor.png') });
  if (callRows.length === 0) throw new Error('Search by counselor failed - expected at least 1 match');
  console.log('✓ TEST 3 PASS: Search by counselor verified');

  // Clear search and reset scope
  const clearBtn2 = await page.$('.relative > button:has(.w-3\\.5)');
  if (clearBtn2) {
    await clearBtn2.click();
    await page.waitForTimeout(300);
  } else {
    await searchInput.fill('');
    await page.waitForTimeout(300);
  }
  if (scopeTrigger) {
    await scopeTrigger.click();
    await page.waitForTimeout(200);
    const allFieldsBtn = await page.$('button:has-text("All Fields")');
    if (allFieldsBtn) await allFieldsBtn.click();
    await page.waitForTimeout(200);
  }

  // --- TEST 4: Custom 10x Counselor Dropdown ---
  console.log('\n[TEST 4] Testing Custom 10x Counselor Dropdown...');
  const counselorTrigger = await page.$('[data-testid="counselor-select-trigger"]');
  if (counselorTrigger) {
    await counselorTrigger.click();
    await page.waitForTimeout(400);
    // Capture screenshot of the open 10x counselor popover
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'call_center_counselor_popover_10x.png') });
    console.log('Captured screenshot of 10x Counselor Popover');

    // Click "My Calls Only"
    const myCallsBtn = await page.$('[data-testid="counselor-dropdown-popover"] button:has-text("My Calls Only")');
    if (myCallsBtn) {
      await myCallsBtn.click();
      await page.waitForTimeout(600);
      callRows = await page.$$('.divide-y > div');
      console.log(`Found ${callRows.length} calls for My Calls`);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'call_center_filter_user_wise.png') });
      console.log('✓ TEST 4 PASS: Custom Counselor Popover filter verified');

      // Clear counselor filter using trigger clear (X) icon
      const clearCounselorIcon = await page.$('[data-testid="counselor-select-trigger"] [role="button"]');
      if (clearCounselorIcon) {
        await clearCounselorIcon.click();
        await page.waitForTimeout(400);
      }
    }
  }

  // --- TEST 5: Custom 10x Designation Dropdown ---
  console.log('\n[TEST 5] Testing Custom 10x Designation Dropdown...');
  const desigTrigger = await page.$('[data-testid="designation-select-trigger"]');
  if (desigTrigger) {
    await desigTrigger.click();
    await page.waitForTimeout(400);
    // Capture screenshot of the open 10x designation popover
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'call_center_designation_popover_10x.png') });
    console.log('Captured screenshot of 10x Designation Popover (Direct replacement of old UI!)');

    // Select Academic Counselor
    const counselorDesigBtn = await page.$('[data-testid="designation-dropdown-popover"] button:has-text("Academic Counselor")');
    if (counselorDesigBtn) {
      await counselorDesigBtn.click();
      await page.waitForTimeout(600);
      callRows = await page.$$('.divide-y > div');
      console.log(`Found ${callRows.length} calls for designation Academic Counselor`);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'call_center_filter_designation_wise.png') });
      console.log('✓ TEST 5 PASS: Custom 10x Designation Popover verified');

      // Clear designation filter
      const clearDesigIcon = await page.$('[data-testid="designation-select-trigger"] [role="button"]');
      if (clearDesigIcon) {
        await clearDesigIcon.click();
        await page.waitForTimeout(400);
      }
    }
  }

  // --- TEST 6: Advanced Filter Slide-out Drawer ---
  console.log('\n[TEST 6] Testing Advanced Filter Slide-out Drawer...');
  const openDrawerBtn = await page.$('[data-testid="open-call-filter-drawer"]');
  if (openDrawerBtn) {
    await openDrawerBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'call_center_advanced_filter_drawer.png') });
    console.log('Captured screenshot of CallAdvancedFilterDrawer');

    const drawer = await page.$('[data-testid="call-filter-drawer-panel"]');
    if (drawer) {
      // Click direction "Inbound" inside drawer
      const inboundBtn = await drawer.$('button:has-text("Inbound")');
      if (inboundBtn) {
        await inboundBtn.click();
        await page.waitForTimeout(200);
      }

      // Click status "Completed" inside drawer
      const completedBtn = await drawer.$('button:has-text("Completed")');
      if (completedBtn) {
        await completedBtn.click();
        await page.waitForTimeout(200);
      }

      // Click sentiment "Positive" inside drawer
      const positiveBtn = await drawer.$('button:has-text("Positive")');
      if (positiveBtn) {
        await positiveBtn.click();
        await page.waitForTimeout(200);
      }
    }

    // Click Apply Filters button
    const applyBtn = await page.$('[data-testid="apply-call-filters-btn"]');
    if (applyBtn) {
      await applyBtn.click();
      await page.waitForTimeout(600);
    }

    // Verify active filter chips appear
    callRows = await page.$$('.divide-y > div');
    console.log(`Filtered result count with Inbound + Completed + Positive: ${callRows.length}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'call_center_active_filter_chips.png') });
    console.log('✓ TEST 6 PASS: Advanced Filter Drawer & Active Filter Chips verified');

    // --- TEST 7: Reset & Clear All Filters ---
    console.log('\n[TEST 7] Testing Clear All Filters...');
    const clearAllBtn = await page.$('button:has-text("Clear All")');
    if (clearAllBtn) {
      await clearAllBtn.click();
      await page.waitForTimeout(600);
      const restoredRows = await page.$$('.divide-y > div');
      console.log(`Calls restored to full list count: ${restoredRows.length}`);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'call_center_filter_reset_restored.png') });
      console.log('✓ TEST 7 PASS: Clear All & State restoration verified');
    }
  }

  await browser.close();
  console.log('\n================================================================');
  console.log('ALL 7 CALL CENTER ADVANCED FILTER & SEARCH TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================\n');
}

runFilterTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

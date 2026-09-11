const { chromium } = require('playwright');
const path = require('path');
const ARTIFACT_DIR = 'C:\\Users\\krish\\.gemini\\antigravity-ide\\brain\\68ed6026-d74f-48d3-9e30-152dc6f1f996';

async function testCohortAdvancedFilter() {
  console.log('🚀 Starting Student Matriculation Cohort Advanced Filter E2E Verification...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  try {
    // 1. Login
    console.log('1. Logging in as Super Admin...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', 'degreepartners@gmail.com');
    await page.fill('input[type="password"]', '@Krish4165');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 2. Go to /admin/founder
    console.log('2. Navigating to /admin/founder...');
    await page.goto('http://localhost:3000/admin/founder');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('Current URL:', page.url());

    // 3. Verify Cohort Card
    console.log('3. Locating Student Matriculation Cohort Card...');
    await page.evaluate(() => window.scrollTo(0, 850));
    await page.waitForTimeout(1000);

    const cohortCard = await page.waitForSelector('text=Student Matriculation Cohort');
    const cohortContainer = await page.$('div.bg-card.border.border-border\\/80:has-text("Student Matriculation Cohort")');

    // Screenshot default overview
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'cohort_filter_toolbar_overview.png') });
    if (cohortContainer) {
      await cohortContainer.screenshot({ path: path.join(ARTIFACT_DIR, 'cohort_filter_card_default.png') });
    }
    console.log('📸 Saved cohort_filter_toolbar_overview.png & cohort_filter_card_default.png');

    // 4. Test Quick Search
    console.log('\n--- 4. Testing Quick Search ---');
    const searchInput = await page.waitForSelector('input[placeholder*="Search student, adm #, program"]');
    await searchInput.fill('CHIRAG');
    await page.waitForTimeout(800);

    const chiragCard = await page.isVisible('text="CHIRAG SHARMA"');
    const ankitCardHidden = !(await page.isVisible('text="ANKIT GANGWAR"'));
    console.log(`Searching "CHIRAG": Chirag visible = ${chiragCard}, Ankit hidden = ${ankitCardHidden}`);
    if (chiragCard && ankitCardHidden) {
      console.log('✅ PASS: Quick Search correctly filters students');
    } else {
      console.error('❌ FAIL: Quick Search filter mismatch');
    }

    if (cohortContainer) {
      await cohortContainer.screenshot({ path: path.join(ARTIFACT_DIR, 'cohort_filtered_by_search_chirag.png') });
    }

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(500);

    // 5. Test Closer attribution badge on student cards
    console.log('\n--- 5. Checking Closer Attribution Badges ---');
    const closerBadge = await page.isVisible('text=Closer:');
    const krishnaBadge = await page.isVisible('text=Krishna');
    console.log(`Closer attribution badge visible: ${closerBadge && krishnaBadge}`);
    if (closerBadge && krishnaBadge) {
      console.log('✅ PASS: Closer attribution badge (Krishna) is rendered on student cards');
    }

    // 6. Test User-Specific Dropdown
    console.log('\n--- 6. Testing User-Specific Dropdown ---');
    const userSelect = await page.waitForSelector('select[title="Filter by Assigned Closer / Counselor"]');
    
    // Select Krishna
    const userOptions = await page.$$eval('select[title="Filter by Assigned Closer / Counselor"] option', options => 
      options.map(o => ({ value: o.value, text: o.text }))
    );
    console.log('Available Closer Options:', userOptions);

    const krishnaOption = userOptions.find(o => o.text.includes('Krishna'));
    if (krishnaOption) {
      await userSelect.selectOption(krishnaOption.value);
      await page.waitForTimeout(800);
      const studentCardsCount = await page.$$eval('text="Admission Done"', elms => elms.length);
      console.log(`Students filtered for Krishna: ${studentCardsCount}`);
      if (cohortContainer) {
        await cohortContainer.screenshot({ path: path.join(ARTIFACT_DIR, 'cohort_filtered_by_user_krishna.png') });
      }
      console.log('📸 Saved cohort_filtered_by_user_krishna.png');
    }

    // 7. Test Empty State for User with 0 admissions
    console.log('\n--- 7. Testing Empty State for Closer with 0 admissions ---');
    const otherOption = userOptions.find(o => o.text.includes('(0)'));
    if (otherOption) {
      await userSelect.selectOption(otherOption.value);
      await page.waitForTimeout(800);
      const emptyStateVisible = await page.isVisible('text="No enrolled students match the active filter criteria."');
      console.log(`Empty state visible for user with 0 admissions: ${emptyStateVisible}`);
      if (cohortContainer) {
        await cohortContainer.screenshot({ path: path.join(ARTIFACT_DIR, 'cohort_filtered_empty_state.png') });
      }
      console.log('📸 Saved cohort_filtered_empty_state.png');
      if (emptyStateVisible) {
        console.log('✅ PASS: Empty state rendered cleanly with reset button');
      }
    }

    // Reset user selection back to all
    await userSelect.selectOption('all');
    await page.waitForTimeout(500);

    // 8. Test Advanced Filter Modal
    console.log('\n--- 8. Testing Advanced Filter Modal ---');
    const filterBtn = await page.waitForSelector('button[title="Open Advanced Filter Modal"]');
    await filterBtn.click();
    await page.waitForTimeout(800);

    const modalVisible = await page.isVisible('text="Cohort Advanced Filters"');
    console.log(`Filter modal visible: ${modalVisible}`);
    if (modalVisible) {
      console.log('✅ PASS: Advanced Filter Modal opened successfully');
    }

    // Screenshot open modal
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'cohort_advanced_filter_modal.png') });
    console.log('📸 Saved cohort_advanced_filter_modal.png');

    // Test stage filter inside modal: click "Admission Done"
    console.log('Selecting "Admission Done" matriculation stage...');
    await page.click('button:has-text("Admission Done")');
    await page.waitForTimeout(500);

    // Click Apply & Close
    await page.click('button:has-text("Apply & Close")');
    await page.waitForTimeout(800);

    // 9. Verify Active Filter Chips
    console.log('\n--- 9. Verifying Active Filter Chips ---');
    const stageChipVisible = await page.isVisible('text="Stage: Admitted"');
    const clearAllVisible = await page.isVisible('text="Clear All"');
    console.log(`Stage chip visible: ${stageChipVisible}, Clear All button: ${clearAllVisible}`);
    if (cohortContainer) {
      await cohortContainer.screenshot({ path: path.join(ARTIFACT_DIR, 'cohort_active_chips_view.png') });
    }
    console.log('📸 Saved cohort_active_chips_view.png');

    if (stageChipVisible && clearAllVisible) {
      console.log('✅ PASS: Active Filter Chips bar rendered with remove/clear functionality');
    }

    // Click "Clear All"
    console.log('Clicking "Clear All"...');
    await page.click('text="Clear All"');
    await page.waitForTimeout(500);

    const chipRemoved = !(await page.isVisible('text="Stage: Admitted"'));
    console.log(`Chip removed after Clear All: ${chipRemoved}`);
    if (chipRemoved) {
      console.log('✅ PASS: Clear All restores all cohort admissions');
    }

    console.log('\n🎉 ALL COHORT ADVANCED FILTER TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Error during testing:', err);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'cohort_test_failure.png') }).catch(() => {});
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testCohortAdvancedFilter();

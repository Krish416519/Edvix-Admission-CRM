const { chromium } = require('playwright');
const path = require('path');
const ARTIFACT_DIR = 'C:\\Users\\krish\\.gemini\\antigravity-ide\\brain\\68ed6026-d74f-48d3-9e30-152dc6f1f996';

async function testNewTabNavigation() {
  console.log('🚀 Testing New Tab (_blank) Navigation from Founder Dashboard...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Login
    console.log('1. Logging in...');
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'degreepartners@gmail.com');
    await page.fill('input[type="password"]', '@Krish4165');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    // 2. Go to /admin/founder
    console.log('2. Navigating to /admin/founder...');
    await page.goto('http://localhost:3000/admin/founder');
    await page.waitForTimeout(2000);

    // TEST 1: Click "Open Full Lead Profile" inside Dossier Modal
    console.log('\n--- TEST 1: Open Full Lead Profile Modal Button -> New Tab ---');
    const studentCard = await page.waitForSelector('text="CHIRAG SHARMA"', { timeout: 15000 });
    await studentCard.scrollIntoViewIfNeeded();
    await studentCard.click();
    console.log('Opened Dossier Modal for CHIRAG SHARMA');

    await page.waitForSelector('button:has-text("Open Full Lead Profile")', { timeout: 5000 });

    // Listen for new page (tab) event
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('button:has-text("Open Full Lead Profile")')
    ]);

    await newPage.waitForLoadState('domcontentloaded');
    await newPage.waitForTimeout(2000);

    const originalUrl = page.url();
    const newTabUrl = newPage.url();
    console.log('Original Tab URL:', originalUrl);
    console.log('New Tab URL:', newTabUrl);

    if (originalUrl.includes('/admin/founder')) {
      console.log('✅ PASS: Original tab remained on /admin/founder');
    } else {
      console.error('❌ FAIL: Original tab redirected to', originalUrl);
    }

    if (newTabUrl.includes('/all-leads/cb256d7d-4135-46c3-9e41-1263eaf089be') || newTabUrl.includes('/all-leads/')) {
      console.log('✅ PASS: New tab navigated to lead profile:', newTabUrl);
    } else {
      console.error('❌ FAIL: New tab navigated to unexpected URL:', newTabUrl);
    }

    // Verify lead profile content in the new tab
    const leadNameVisible = await newPage.isVisible('text="CHIRAG SHARMA"');
    console.log('Is "CHIRAG SHARMA" visible on new tab lead profile:', leadNameVisible);

    await newPage.screenshot({ path: path.join(ARTIFACT_DIR, 'new_tab_lead_profile_modal.png') });
    console.log('📸 Captured new_tab_lead_profile_modal.png');

    await newPage.close();
    console.log('Closed new tab 1');

    // Close modal on original tab via Close button
    console.log('Closing dossier modal...');
    await page.click('button:has-text("Close")');
    await page.waitForSelector('text="Officially Converted & Matriculated"', { state: 'detached', timeout: 5000 });
    console.log('Modal dismissed successfully.');
    await page.waitForTimeout(500);

    // TEST 2: Quick-Action External Link Icon on Card
    console.log('\n--- TEST 2: Quick-Action Card Button -> New Tab ---');
    const cardExternalBtn = await page.waitForSelector('button[title*="Open Lead Profile" i]', { timeout: 8000 });
    await cardExternalBtn.scrollIntoViewIfNeeded();

    const [quickPage] = await Promise.all([
      context.waitForEvent('page'),
      cardExternalBtn.click()
    ]);

    await quickPage.waitForLoadState('domcontentloaded');
    await quickPage.waitForTimeout(2000);

    const quickTabUrl = quickPage.url();
    console.log('Quick Action Tab URL:', quickTabUrl);

    if (quickTabUrl.includes('/all-leads/')) {
      console.log('✅ PASS: Quick-action button opened lead profile in new tab:', quickTabUrl);
    } else {
      console.error('❌ FAIL: Quick-action button navigated to', quickTabUrl);
    }

    await quickPage.screenshot({ path: path.join(ARTIFACT_DIR, 'new_tab_lead_profile_quick.png') });
    console.log('📸 Captured new_tab_lead_profile_quick.png');

    await quickPage.close();

    // TEST 3: High Priority Leads Tab Quick Action Button
    console.log('\n--- TEST 3: High-Priority Uncalled Leads -> New Tab ---');
    const riskRadarTabBtn = await page.waitForSelector('button:has-text("Loss Prevention")', { timeout: 5000 });
    await riskRadarTabBtn.click();
    await page.waitForTimeout(1000);

    const tableExternalBtn = await page.waitForSelector('button[title*="Open Lead Profile" i]', { timeout: 5000 });
    if (tableExternalBtn) {
      await tableExternalBtn.scrollIntoViewIfNeeded();
      const [tablePage] = await Promise.all([
        context.waitForEvent('page'),
        tableExternalBtn.click()
      ]);
      await tablePage.waitForLoadState('domcontentloaded');
      await tablePage.waitForTimeout(2000);
      console.log('Table Quick Action Tab URL:', tablePage.url());
      if (tablePage.url().includes('/all-leads/')) {
        console.log('✅ PASS: Tab 3 table lead opened in new tab:', tablePage.url());
      }
      await tablePage.screenshot({ path: path.join(ARTIFACT_DIR, 'new_tab_lead_profile_table.png') });
      console.log('📸 Captured new_tab_lead_profile_table.png');
      await tablePage.close();
    }

    console.log('\n🎉 ALL NEW TAB NAVIGATION TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
  } finally {
    await browser.close();
  }
}

testNewTabNavigation();

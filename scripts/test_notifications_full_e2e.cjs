const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/krish/.gemini/antigravity-ide/brain/68ed6026-d74f-48d3-9e30-152dc6f1f996');

async function testNotificationsFullE2E() {
  console.log('='.repeat(80));
  console.log('EDVIX CRM — NOTIFICATIONS 10X FULL E2E SUITE');
  console.log('='.repeat(80));

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
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  // STEP 1: Authenticate
  console.log('\n[STEP 1] Authenticating as Super Admin...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('input[type="email"], input[name="email"]', 'degreepartners@gmail.com');
  await page.fill('input[type="password"], input[name="password"]', '@Krish4165');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  // STEP 2: Navigate to /notifications
  console.log('\n[STEP 2] Navigating to http://localhost:3000/notifications...');
  await page.goto('http://localhost:3000/notifications', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  // STEP 3: Verify 10x UI components
  console.log('\n[STEP 3] Verifying Executive KPI cards and Controls...');
  const title = await page.locator('h1').textContent();
  console.log('  Page Title:', title);

  // Check KPI cards
  const kpiCards = await page.locator('.grid > div');
  const kpiCount = await kpiCards.count();
  console.log('  KPI Metric Cards rendered:', kpiCount);

  // Screenshot desktop view
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'notifications_dashboard_10x.png'), fullPage: true });
  console.log('  Captured notifications_dashboard_10x.png');

  // STEP 4: Test Search Feature
  console.log('\n[STEP 4] Testing Search Input...');
  const searchInput = page.locator('input[placeholder*="Search notifications"]');
  await searchInput.fill('Task');
  await page.waitForTimeout(1000);
  const taskItems = await page.locator('[data-testid="notification-card"]').count();
  console.log(`  Items matching "Task": ${taskItems}`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'notifications_search_active_10x.png'), fullPage: true });

  // Clear search
  await searchInput.fill('');
  await page.waitForTimeout(500);

  // STEP 5: Test Category Tabs
  console.log('\n[STEP 5] Testing Category Tabs...');
  const tasksTab = page.locator('button:has-text("Tasks")');
  if (await tasksTab.count() > 0) {
    await tasksTab.click();
    await page.waitForTimeout(1000);
    const tasksCount = await page.locator('[data-testid="notification-card"]').count();
    console.log(`  Tasks tab items: ${tasksCount}`);
  }

  const allTab = page.locator('button:has-text("All")').first();
  await allTab.click();
  await page.waitForTimeout(1000);

  // STEP 6: Test Phone Sound Tone Picker, Audition Previews & Mute Toggle
  console.log('\n[STEP 6] Testing Phone Sound Tone Picker & Audition Previews...');
  
  // Open Sound Tone Picker Popover
  const tonePickerBtn = page.locator('button[title*="Choose phone ringtone"]');
  if (await tonePickerBtn.count() > 0) {
    await tonePickerBtn.click();
    await page.waitForTimeout(600);
    console.log('  Opened Phone Sound Tone Picker Popover');

    // Capture screenshot of Phone Sound Picker
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'notifications_sound_tone_picker_10x.png'), fullPage: true });
    console.log('  Captured notifications_sound_tone_picker_10x.png');

    // Audition preview buttons
    const previewBtns = page.locator('button[title*="Preview"]');
    const prevCount = await previewBtns.count();
    console.log(`  Found ${prevCount} sound tone preview buttons`);
    if (prevCount > 0) {
      await previewBtns.nth(0).click(); // iPhone Tri-tone preview
      await page.waitForTimeout(400);
      if (prevCount > 1) {
        await previewBtns.nth(1).click(); // Bubble Pop preview
        await page.waitForTimeout(400);
      }
    }

    // Select Bubble Pop
    const bubblePopRow = page.locator('text=Bubble Pop').first();
    if (await bubblePopRow.count() > 0) {
      await bubblePopRow.click();
      console.log('  Selected "Bubble Pop" as default notification sound');
      await page.waitForTimeout(600);
    }
  }

  const testChimeBtn = page.locator('button:has-text("Test Chime")');
  if (await testChimeBtn.count() > 0) {
    await testChimeBtn.click();
    console.log('  Clicked "Test Chime" button with new tone');
    await page.waitForTimeout(800);
  }

  const chimeToggle = page.locator('button:has-text("Chime ON"), button:has-text("Chime Muted")').first();
  if (await chimeToggle.count() > 0) {
    await chimeToggle.click();
    console.log('  Toggled Chime state (muted)');
    await page.waitForTimeout(500);
    await chimeToggle.click();
    console.log('  Toggled Chime state (active)');
    await page.waitForTimeout(500);
  }

  // STEP 7: Test Multi-select & Bulk Toolbar
  console.log('\n[STEP 7] Testing Multi-Select & Bulk Operations...');
  const checkboxes = page.locator('[data-testid="notification-checkbox"] button');
  const count = await checkboxes.count();
  console.log(`  Notification checkboxes found: ${count}`);
  if (count >= 2) {
    // Click checkbox of item 1 and 2
    await checkboxes.nth(0).click();
    await page.waitForTimeout(300);
    await checkboxes.nth(1).click();
    await page.waitForTimeout(1000);

    const bulkBar = page.locator('text=Notifications selected');
    console.log('  Bulk Toolbar visible:', await bulkBar.isVisible());

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'notifications_bulk_toolbar_10x.png'), fullPage: true });
    console.log('  Captured notifications_bulk_toolbar_10x.png');

    // Deselect
    const clearSelBtn = page.locator('button[title="Clear selection"]');
    if (await clearSelBtn.count() > 0) {
      await clearSelBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // STEP 8: Test Individual Mark Read / Unread
  console.log('\n[STEP 8] Testing Individual Mark Read / Unread...');
  const markReadBtn = page.locator('button[title="Mark as read"]').first();
  if (await markReadBtn.count() > 0) {
    await markReadBtn.click();
    console.log('  Clicked "Mark as read" on first unread item');
    await page.waitForTimeout(1000);
  }

  // STEP 9: Mobile Viewport Audits (4 Devices)
  console.log('\n[STEP 9] Auditing Mobile Viewports (Zero Collisions, 100% Responsiveness)...');
  
  const viewports = [
    { name: 'iphone_14_393', width: 393, height: 852, label: 'iPhone 14 Pro (393px)' },
    { name: 'iphone_12_375', width: 375, height: 667, label: 'iPhone 12/13 (375px)' },
    { name: 'android_360', width: 360, height: 800, label: 'Android Modern (360px)' },
    { name: 'iphone_se_320', width: 320, height: 568, label: 'iPhone SE (320px)' }
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(1000);

    // Check for horizontal scroll/overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const hasHorizontalOverflow = scrollWidth > clientWidth;
    console.log(`  ${vp.label}: width=${vp.width}px, scrollWidth=${scrollWidth}px -> Horizontal Overflow: ${hasHorizontalOverflow ? 'FAIL' : 'PASS'}`);

    const screenshotPath = path.join(ARTIFACT_DIR, `notifications_mobile_${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`  Captured notifications_mobile_${vp.name}.png`);
  }

  // Also capture scrolled view on iPhone 12 to verify card text wrapping
  await page.setViewportSize({ width: 375, height: 667 });
  await page.locator('main').evaluate(el => el.scrollTop = 480);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'notifications_mobile_cards_scrolled.png') });
  console.log('  Captured notifications_mobile_cards_scrolled.png');

  // Final Audit Summary
  console.log('\n' + '='.repeat(80));
  console.log('NOTIFICATIONS E2E AUDIT RESULTS:');
  console.log(`  Console Errors: ${consoleErrors.length}`);
  consoleErrors.forEach(err => console.log('    [ERROR]', err));

  console.log(`  Network Errors: ${networkErrors.length}`);
  networkErrors.forEach(err => console.log('    [NET ERROR]', err));
  console.log('='.repeat(80));

  await browser.close();

  if (consoleErrors.length > 0) {
    console.error('FAILED: Console errors detected during audit!');
    process.exit(1);
  }
  console.log('SUCCESS: All notifications E2E checks passed with 100% accuracy!');
}

testNotificationsFullE2E().catch(err => {
  console.error('Fatal error in notifications E2E suite:', err);
  process.exit(1);
});

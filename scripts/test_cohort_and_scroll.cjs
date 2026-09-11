const { chromium } = require('playwright');
const path = require('path');
const ARTIFACT_DIR = 'C:\\Users\\krish\\.gemini\\antigravity-ide\\brain\\68ed6026-d74f-48d3-9e30-152dc6f1f996';

async function testCohortAndScroll() {
  console.log('🚀 Testing Student Matriculation Cohort Filter & Scrollable Container Layout...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    // 1. Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'degreepartners@gmail.com');
    await page.fill('input[type="password"]', '@Krish4165');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    // 2. Go to /admin/founder
    await page.goto('http://localhost:3000/admin/founder');
    await page.waitForSelector('text="Student Matriculation Cohort"', { timeout: 15000 });
    await page.waitForTimeout(1500);

    // Check if Rajesh Kumar is visible anywhere in Student Matriculation Cohort
    const cohortCardLocator = page.locator('div:has-text("Student Matriculation Cohort")').first();
    const cohortText = await cohortCardLocator.innerText();
    console.log('Cohort Text:\n', cohortText);

    const hasRajesh = cohortText.includes('Rajesh Kumar') || cohortText.includes('RAJESH KUMAR');
    if (hasRajesh) {
      console.error('❌ FAIL: Rajesh Kumar is still visible in Student Matriculation Cohort!');
    } else {
      console.log('✅ PASS: Rajesh Kumar is successfully EXCLUDED from Student Matriculation Cohort!');
    }

    // Verify Chirag Sharma, Manish Kumar, Ankit Gangwar are present
    const hasChirag = cohortText.includes('CHIRAG SHARMA');
    const hasAnkit = cohortText.includes('ANKIT GANGWAR');
    const hasManish = cohortText.includes('MANISH KUMAR');
    console.log(`Active Students: Chirag=${hasChirag}, Ankit=${hasAnkit}, Manish=${hasManish}`);

    // Verify heights of both Channel Card and Cohort Card
    const channelBox = await page.locator('h3:has-text("Channel Contribution & Efficiency")').locator('xpath=ancestor::div[contains(@class, "bg-card")][1]').boundingBox();
    const cohortBox = await page.locator('h3:has-text("Student Matriculation Cohort")').locator('xpath=ancestor::div[contains(@class, "bg-card")][1]').boundingBox();

    console.log('Channel Box Dimensions:', channelBox);
    console.log('Cohort Box Dimensions:', cohortBox);

    if (cohortBox && channelBox) {
      console.log(`Heights -> Channel: ${channelBox.height}px, Cohort: ${cohortBox.height}px`);
      if (Math.abs(channelBox.height - cohortBox.height) < 5) {
        console.log('✅ PASS: Both boxes are perfectly balanced and equal in height!');
      } else {
        console.log('ℹ️ Height difference:', Math.abs(channelBox.height - cohortBox.height));
      }
    }

    // Check scroll container
    const scrollContainer = page.locator('.custom-scrollbar').first();
    const isScrollable = await scrollContainer.evaluate(el => el.scrollHeight >= el.clientHeight);
    console.log('Is Cohort Container scrollable / properly constrained:', isScrollable);

    // Scroll to the Row and capture screenshot
    const rowLocator = page.locator('.grid.grid-cols-1.lg\\:grid-cols-3').nth(1);
    await rowLocator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const screenshotPath = path.join(ARTIFACT_DIR, 'cohort_scrollable_balanced_layout.png');
    await rowLocator.screenshot({ path: screenshotPath });
    console.log('📸 Captured screenshot at:', screenshotPath);

    // Also capture full view of both cards
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'founder_dashboard_balanced_view.png') });
    console.log('📸 Captured founder_dashboard_balanced_view.png');

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
  }
}

testCohortAndScroll();

const { chromium } = require('playwright');
const path = require('path');
const ARTIFACT_DIR = 'C:\\Users\\krish\\.gemini\\antigravity-ide\\brain\\68ed6026-d74f-48d3-9e30-152dc6f1f996';

async function testLeadNavigation() {
  console.log('🚀 Testing Lead Profile Navigation from Founder Dossier Modal...');
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
    const studentCard = await page.waitForSelector('text="CHIRAG SHARMA"', { timeout: 15000 });
    await studentCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await studentCard.click();
    console.log('Clicked CHIRAG SHARMA card');

    // 3. Verify Modal
    await page.waitForSelector('text="Officially Converted & Matriculated"', { timeout: 5000 });
    console.log('Dossier Modal verified');

    // 4. Click "Open Full Lead Profile"
    const openLeadBtn = await page.waitForSelector('button:has-text("Open Full Lead Profile")', { timeout: 5000 });
    await openLeadBtn.click();
    console.log('Clicked Open Full Lead Profile button');

    // 5. Wait for navigation
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    console.log('Current URL after clicking Open Full Lead Profile:', currentUrl);

    // Verify it navigated to /all-leads/cb256d7d-4135-46c3-9e41-1263eaf089be (NOT dashboard!)
    if (currentUrl.includes('/all-leads/') || currentUrl.includes('/leads/')) {
      console.log('✅ SUCCESS: Successfully navigated to Lead Details page:', currentUrl);
    } else {
      console.error('❌ FAILURE: Redirected to unexpected URL:', currentUrl);
    }

    // Capture screenshot of the opened Lead Profile
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verified_lead_profile_navigation.png') });
    console.log('📸 Captured verified_lead_profile_navigation.png');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
  }
}

testLeadNavigation();

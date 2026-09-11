const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/krish/.gemini/antigravity-ide/brain/68ed6026-d74f-48d3-9e30-152dc6f1f996');

async function testMobile() {
  console.log('Testing mobile viewports for Call Center Filter Bar & Drawer...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const viewports = [
    { name: 'iphone_se_320', width: 320, height: 568 },
    { name: 'android_360', width: 360, height: 800 },
    { name: 'iphone_12_375', width: 375, height: 812 },
    { name: 'iphone_14_393', width: 393, height: 852 }
  ];

  for (const vp of viewports) {
    console.log(`Checking ${vp.name} (${vp.width}x${vp.height})...`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"], input[name="email"]', 'degreepartners@gmail.com');
    await page.fill('input[type="password"], input[name="password"]', '@Krish4165');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    await page.goto('http://localhost:3000/call-center', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    console.log(`[${vp.name}] scrollWidth: ${scrollWidth}, clientWidth: ${clientWidth}`);

    if (scrollWidth > clientWidth + 2) {
      console.error(`Horizontal overflow detected in ${vp.name}! scrollWidth: ${scrollWidth}, clientWidth: ${clientWidth}`);
      process.exit(1);
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, `call_center_filter_mobile_${vp.name}.png`) });
    await context.close();
  }

  await browser.close();
  console.log('All mobile viewports verified cleanly with 0 horizontal overflow!');
}

testMobile().catch(err => {
  console.error(err);
  process.exit(1);
});

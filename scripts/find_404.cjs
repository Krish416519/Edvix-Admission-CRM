const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  page.on('response', res => {
    if (res.status() === 404) {
      console.log('404 URL:', res.url());
    }
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Console Error msg:', msg.text(), msg.location());
    }
  });
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'degreepartners@gmail.com');
  await page.fill('input[type="password"]', '@Krish4165');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await page.goto('http://localhost:3000/smart-view/command-center');
  await page.waitForTimeout(2000);
  await page.goto('http://localhost:3000/ai-dashboard');
  await page.waitForTimeout(2000);
  await browser.close();
})();

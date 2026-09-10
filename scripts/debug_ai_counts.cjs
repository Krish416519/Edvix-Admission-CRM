const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'degreepartners@gmail.com');
  await page.fill('input[type="password"]', '@Krish4165');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  await page.goto('http://localhost:3000/ai-dashboard');
  await page.waitForTimeout(2500);
  
  const text = await page.evaluate(() => document.body.innerText);
  const matches = text.match(/(\d+)\s+Students/g);
  console.log('Matches for Students:', matches);
  
  const h2Text = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('h2')).map(h => h.innerText);
    return el;
  });
  console.log('h2 headers:', h2Text);

  const displayLeadsCount = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span'));
    const target = spans.find(s => s.innerText.includes('Students') && s.className.includes('rounded-full'));
    return target ? target.innerText : 'not found';
  });
  console.log('Target badge text:', displayLeadsCount);

  await browser.close();
}
test().catch(console.error);

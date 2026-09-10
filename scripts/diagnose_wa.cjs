const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'degreepartners@gmail.com');
  await page.fill('input[type="password"]', '@Krish4165');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log('After login URL:', page.url());

  await page.goto('http://localhost:3000/whatsapp');
  await page.waitForTimeout(3000);
  console.log('After /whatsapp URL:', page.url());
  const headings = await page.evaluate(() => Array.from(document.querySelectorAll('h1, h2, h3')).map(h => ({ tag: h.tagName, text: h.innerText })));
  console.log('Headings:', headings);
  const textareas = await page.evaluate(() => document.querySelectorAll('textarea').length);
  console.log('Textareas count:', textareas);
  const buttons = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map(b => b.innerText).filter(Boolean));
  console.log('Buttons:', buttons.slice(0, 10));
  await browser.close();
}

test().catch(console.error);

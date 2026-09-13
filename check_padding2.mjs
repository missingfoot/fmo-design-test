import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1500, height: 900 });
await page.goto('http://localhost:5184/');
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/app_padding.png' });
await browser.close();

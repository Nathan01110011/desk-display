import { chromium } from '/tmp/pi-preview/node_modules/playwright/index.mjs';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.getByRole('button', { name: 'Settings', exact: true }).waitFor({ timeout: 120000 });
await page.getByRole('button', { name: 'Settings', exact: true }).click();
await page.getByText('Screensaver', { exact: true }).waitFor();
await mkdir('screensaver-screenshots', { recursive: true });

async function capture(name) {
  await page.getByRole('button', { name: 'Preview selected screensaver' }).click();
  await page.locator('[data-screensaver]').waitFor({ timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'screensaver-screenshots/' + name + '.png', animations: 'disabled' });
  await page.locator('[data-screensaver]').click({ position: { x: 15, y: 15 } });
  await page.locator('[data-screensaver]').waitFor({ state: 'detached' });
}

await page.getByRole('button', { name: 'Analog Clock' }).click();
for (const theme of ['Clockwork', 'Orbital', 'Station', 'Chronograph']) {
  await page.getByRole('button', { name: new RegExp('^' + theme) }).click();
  await capture('analog-' + theme.toLowerCase());
}

await page.getByRole('button', { name: 'Split-flap Board' }).click();
await capture('flapboard-carousel');
await page.getByRole('button', { name: 'Show all rows' }).click();
await capture('flapboard-all-locations');

await browser.close();
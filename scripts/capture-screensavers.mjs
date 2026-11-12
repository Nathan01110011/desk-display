import { chromium } from '/tmp/pi-preview/node_modules/playwright/index.mjs';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, timezoneId: 'America/Chicago' });
await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.getByRole('button', { name: 'Settings', exact: true }).waitFor({ timeout: 120000 });
await page.getByRole('button', { name: 'Settings', exact: true }).click();
await page.getByText('Screensaver', { exact: true }).waitFor();
await mkdir('screensaver-screenshots', { recursive: true });

async function capture(name) {
  await page.getByRole('button', { name: 'Preview selected screensaver' }).click();
  await page.locator('[data-screensaver]').waitFor({ timeout: 20000 });
  await page.waitForTimeout(1400);
  if (name.startsWith('analog-')) {
    const miniClocks = page.locator('svg[aria-label^="Analog clock for "]');
    if (await miniClocks.count() !== 3) throw new Error('Expected three secondary analog clocks');
    const stack = page.locator('[data-world-clock-stack="right"]');
    if (await stack.count() !== 1) throw new Error('Secondary clocks must share a right-side column');
    const main = await page.locator('svg[aria-label^="Analog clock at "]').boundingBox();
    const secondary = await miniClocks.evaluateAll(nodes => nodes.map(node => {
      const { x, y, width, height } = node.getBoundingClientRect();
      return { x, y, width, height };
    }));
    if (!main || secondary.some((box, index) =>
      box.x < main.x + main.width - 1 ||
      box.width < 118 ||
      box.y + box.height > 800 ||
      (index > 0 && box.y <= secondary[index - 1].y)
    )) {
      throw new Error('Mini analog clocks must be larger, vertically stacked and right of main dial: ' + JSON.stringify({ main, secondary }));
    }
  }
  if (name.startsWith('flapboard-')) {
    const names = page.locator('[data-flap-role="location"]');
    const times = page.locator('[data-flap-role="time"]');
    if (await names.count() !== 3 || await times.count() !== 3) {
      throw new Error('Station board must render a flip-tile location and time for every configured clock');
    }
    const labels = await names.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-flap-value')));
    if (labels.filter(name => name === 'Belfast').length !== 1 || labels.includes('LOCAL TIME')) {
      throw new Error('Station board must display configured Belfast once and must not invent a local-time row: ' + labels.join(', '));
    }
    const nameBox = await names.first().boundingBox();
    const timeBox = await times.first().boundingBox();
    if (!nameBox || !timeBox || nameBox.x >= timeBox.x) {
      throw new Error('Location columns must be to the left of time columns');
    }
  }
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
await page.getByRole('button', { name: 'Station board' }).click();
await capture('flapboard-all-locations');
await page.getByRole('button', { name: 'Rotate board rows' }).click();
await capture('flapboard-carousel');

await browser.close();
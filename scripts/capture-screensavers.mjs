import { chromium } from '/tmp/pi-preview/node_modules/playwright/index.mjs';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, timezoneId: 'America/Chicago' });
await page.route('**/api/spotify/now-playing', route => route.fulfill({
  json: {
    isPlaying: true,
    title: 'Screensaver test track',
    artist: 'Test artist',
    album: 'Test album',
    albumImageUrl: '',
    progressMs: 62000,
    durationMs: 200000,
  },
}));
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
  if (name.startsWith('analog-') || name === 'big-clock') {
    const music = page.locator('[data-screensaver-now-playing]');
    await music.waitFor();
    await music.getByText('Screensaver test track', { exact: true }).waitFor();
    if (await music.locator('button').count()) throw new Error('Clock music preview must not include controls');
  }
  if (name.startsWith('ambient-')) {
    const scene = page.locator('[data-screensaver] canvas');
    const result = await scene.evaluate(canvas => {
      const bounds = canvas.getBoundingClientRect();
      const parent = canvas.parentElement.getBoundingClientRect();
      const context = canvas.getContext('2d');
      const sample = context?.getImageData(Math.floor(canvas.width * 0.43), Math.floor(canvas.height * 0.57), 1, 1).data;
      return {
        dimensions: [canvas.width, canvas.height],
        layoutDimensions: [canvas.clientWidth, canvas.clientHeight],
        layout: canvas.parentElement.getAttribute('data-ambient-layout'),
        fillsScreen: Math.abs(bounds.width - parent.width) < 2 && Math.abs(bounds.height - parent.height) < 2,
        sample: sample ? [...sample] : null,
      };
    });
    if (!result.fillsScreen || result.layout !== 'landscape' ||
        result.dimensions.join(',') !== '1280,800' || result.layoutDimensions.join(',') !== '1280,800' || !result.sample ||
        result.sample.slice(0, 3).every(value => value === 0)) {
      throw new Error('Ambient artwork must render coloured pixels across the full display: ' + JSON.stringify(result));
    }
    if (name.endsWith('clean')) {
      if (await page.locator('[data-ambient-overlay="none"] [data-screensaver-now-playing]').count() ||
          await page.locator('[data-ambient-overlay="none"] time').count()) {
        throw new Error('Clean art mode should hide all information overlays');
      }
    } else {
      await page.locator('[data-ambient-overlay="full"] time').first().waitFor();
      await page.locator('[data-screensaver-now-playing]').getByText('Screensaver test track').waitFor();
      if (await page.locator('[data-screensaver-now-playing] button').count()) {
        throw new Error('Ambient music card must be view-only');
      }
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

await page.getByRole('button', { name: 'Big Clock' }).click();
await capture('big-clock');

// Each ambient animation must run in a production browser, not just typecheck.
for (const [label, slug] of [
  ['Lava Lamp', 'lava'],
  ['Aurora', 'aurora'],
  ['Koi Pond', 'koi'],
  ['Oscilloscope', 'oscilloscope'],
  ['Deep Space', 'space'],
]) {
  await page.getByRole('button', { name: label, exact: true }).click();
  await capture('ambient-' + slug);
}
await page.getByRole('button', { name: 'Lava Lamp', exact: true }).click();
await page.getByRole('button', { name: 'Clean art', exact: false }).click();
await capture('ambient-lava-clean');
await page.getByRole('button', { name: /^Dashboard Time, song, meetings$/ }).click();

await browser.close();
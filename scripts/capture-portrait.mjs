import { chromium } from '/tmp/pi-portrait-preview/node_modules/playwright/index.mjs';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, timezoneId: 'America/Chicago' });
const now = Date.now();
const event = { summary: 'Portrait layout calendar review', start: new Date(now + 3600000).toISOString(), end: new Date(now + 7200000).toISOString(), isAllDay: false };
const forecast = Array.from({ length: 40 }, (_, i) => {
  const day = new Date(now + i * 3 * 3600000);
  return {
    date: day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    time: day.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    temp: 73 + (i % 7),
    condition: 'Clear',
    icon: '01d',
  };
});
const weather = { temp: 74, condition: 'Clear', location: 'Austin', icon: '01d', timezone: -21600, unit: 'F', forecast };
await page.route('**/api/calendar?range=all', route => route.fulfill({ json: [event] }));
await page.route('**/api/personal-calendar?*', route => route.fulfill({ json: [] }));
await page.route('**/api/weather*', route => route.fulfill({ json: weather }));
await page.route('**/api/sports', route => route.fulfill({ json: [] }));
await mkdir('portrait-screenshots', { recursive: true });

async function portraitShot(name) {
  const image = await page.screenshot({ animations: 'disabled' });
  // Chromium and the OS are LANDSCAPE. Rotate the screenshot for human review,
  // exactly as if someone physically stood the Pi display on its edge.
  await sharp(image).rotate(90).png().toFile('portrait-screenshots/' + name + '.png');
}
async function backHome() {
  await page.getByRole('button', { name: 'Back to dashboard', exact: true }).first().click();
  await page.getByRole('button', { name: 'Settings', exact: true }).waitFor({ timeout: 25000 });
}
async function enter(name) {
  await page.getByRole('button', { name, exact: true }).click();
}

try {
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await enter('Settings');
  await page.getByText('Display orientation', { exact: true }).waitFor();
  await page.screenshot({ path: 'portrait-screenshots/landscape-settings.png', animations: 'disabled' });

  await enter('Rotate left');
  await page.locator('main[data-display-orientation="portrait-left"]').waitFor();
  const logical = await page.locator('main').evaluate(el => ({
    width: el.offsetWidth,
    height: el.offsetHeight,
    rotation: getComputedStyle(el).transform,
    viewport: [window.innerWidth, window.innerHeight],
  }));
  if (logical.width !== 800 || logical.height !== 1280 || logical.viewport[0] !== 1280 || logical.viewport[1] !== 800 || logical.rotation === 'none') {
    throw new Error('Portrait must rotate the app, NOT the OS/Chromium viewport: ' + JSON.stringify(logical));
  }
  await portraitShot('portrait-settings');
  await backHome();
  await page.getByText('Portrait layout calendar review').waitFor({ timeout: 15000 });
  await portraitShot('portrait-home');

  await enter('Calendar');
  await page.locator('[data-calendar-orientation="portrait"]').waitFor();
  await portraitShot('portrait-calendar');
  await backHome();

  await enter('Weather');
  await page.locator('[data-weather-layout="portrait"]').waitFor();
  await portraitShot('portrait-weather');
  await backHome();

  await enter('Sports');
  await page.getByText('Match centre').waitFor();
  await portraitShot('portrait-sports');
  await backHome();

  await enter('Settings');
  await enter('Analog Clock');
  await enter('Preview selected screensaver');
  await page.locator('[data-screensaver="analog"]').waitFor();
  await portraitShot('portrait-analog');
  await page.locator('[data-screensaver]').click({ position: { x: 20, y: 20 } });
  await page.locator('[data-screensaver]').waitFor({ state: 'detached' });

  await enter('Split-flap Board');
  await enter('Preview selected screensaver');
  await page.locator('[data-screensaver="flapboard"]').waitFor();
  await portraitShot('portrait-flapboard');
  await page.locator('[data-screensaver]').click({ position: { x: 20, y: 20 } });
  await page.locator('[data-screensaver]').waitFor({ state: 'detached' });

  await enter('Rotate right');
  await page.locator('main[data-display-orientation="portrait-right"]').waitFor();
  await enter('Landscape');
  await page.locator('main[data-display-orientation="landscape"]').waitFor();
  // Verify emergency non-persistent override for a sideways/touch-unusable display.
  await enter('Rotate left');
  await page.goto('http://127.0.0.1:3000/?layout=landscape', { waitUntil: 'domcontentloaded' });
  await page.locator('main[data-display-orientation="landscape"]').waitFor({ timeout: 20000 });
} finally {
  await browser.close();
}

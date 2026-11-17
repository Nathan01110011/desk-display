import { chromium } from '/tmp/pi-portrait-preview/node_modules/playwright/index.mjs';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, timezoneId: 'America/Chicago' });
const now = Date.now();
const events = [
  { summary: 'Current security sync', start: new Date(now - 600000).toISOString(), end: new Date(now + 1800000).toISOString(), isAllDay: false },
  { summary: 'Portrait layout calendar review', start: new Date(now + 3600000).toISOString(), end: new Date(now + 5400000).toISOString(), isAllDay: false },
  { summary: 'Security engineering standup', start: new Date(now + 7200000).toISOString(), end: new Date(now + 9000000).toISOString(), isAllDay: false },
  { summary: 'Threat hunting sync', start: new Date(now + 10800000).toISOString(), end: new Date(now + 12600000).toISOString(), isAllDay: false },
  { summary: 'Afternoon review', start: new Date(now + 14400000).toISOString(), end: new Date(now + 16200000).toISOString(), isAllDay: false },
];
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
let musicEnabled = false;
const music = {
  isPlaying: true,
  title: "It's All Coming Back to Me Now",
  artist: 'Meat Loaf, Marion Raven',
  album: 'Test album',
  albumImageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="160"%3E%3Crect width="160" height="160" fill="%23345b7e"/%3E%3C/svg%3E',
  progressMs: 86000,
  durationMs: 156000,
};
await page.route('**/api/spotify/now-playing', route => route.fulfill({
  json: musicEnabled ? music : { ...music, isPlaying: false, title: '' },
}));
await page.route('**/api/calendar?range=all', route => route.fulfill({ json: events }));
await page.route('**/api/personal-calendar?*', route => route.fulfill({ json: [] }));
await page.route('**/api/weather*', route => route.fulfill({ json: weather }));
await page.route('**/api/sports', route => route.fulfill({ json: [] }));
await mkdir('portrait-screenshots', { recursive: true });

async function assertScreensaverNowAndLater() {
  const bar = page.locator('[data-screensaver-meeting-reminders]');
  await bar.waitFor();
  const states = await bar.locator('[data-meeting-state]').evaluateAll(nodes =>
    nodes.map(node => node.getAttribute('data-meeting-state')));
  if (states.join(',') !== 'now,later') {
    throw new Error('Screensaver must show both NOW and LATER when both exist: ' + JSON.stringify(states));
  }
  await bar.getByText('Current security sync', { exact: true }).waitFor();
  await bar.getByText('Portrait layout calendar review', { exact: true }).waitFor();
  const bounds = await bar.evaluate(element => {
    const outer = element.getBoundingClientRect();
    const inner = [...element.querySelectorAll('[data-meeting-state]')]
      .map(el => el.getBoundingClientRect());
    return {
      bar: { top: outer.top, bottom: outer.bottom, left: outer.left, right: outer.right },
      items: inner.map(r => ({ top: r.top, bottom: r.bottom, left: r.left, right: r.right })),
    };
  });
  if (bounds.items.some(r =>
    r.top < bounds.bar.top - 2 || r.bottom > bounds.bar.bottom + 2 ||
    r.left < bounds.bar.left - 2 || r.right > bounds.bar.right + 2)) {
    throw new Error('Screensaver meeting reminders must fit within their strip: ' + JSON.stringify(bounds));
  }
}

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
  const agenda = await page.locator('[data-portrait-agenda="expanded"]').evaluate(element => {
    const scroll = element.querySelector('.overflow-y-auto');
    if (!scroll) return null;
    const viewport = scroll.getBoundingClientRect();
    const visibleCards = [...scroll.children].filter(child => {
      const rect = child.getBoundingClientRect();
      return rect.left >= viewport.left - 2 && rect.right <= viewport.right + 2
        && rect.top >= viewport.top - 2 && rect.bottom <= viewport.bottom + 2;
    }).length;
    return { usedHeight: element.offsetHeight, screenHeight: element.closest('main').offsetHeight, visibleCards };
  });
  if (!agenda || agenda.usedHeight < agenda.screenHeight * 0.5 || agenda.visibleCards < 3) {
    throw new Error('Portrait agenda must use spare screen height and show at least three events without scrolling: ' + JSON.stringify(agenda));
  }
  await portraitShot('portrait-home');

  // The home agenda expands when nothing is active, then gives back space
  // when music appears. Verify the player, launcher and dashboard never overlap.
  musicEnabled = true;
  await page.getByText("It's All Coming Back to Me Now", { exact: true }).waitFor({ timeout: 15000 });
  await page.locator('[data-portrait-agenda="with-hero"]').waitFor();
  await page.waitForTimeout(600);
  const layout = await page.evaluate(() => {
    const get = selector => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const area = (a, b) => !a || !b ? Infinity :
      Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
      Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const calendar = document.querySelector('[data-portrait-agenda="with-hero"]');
    const frame = get('main');
    const player = get('[data-spotify-layout="portrait"]');
    const launcher = get('[data-app-launcher="portrait"]');
    const controls = get('[data-spotify-layout="portrait"] button');
    const title = document.querySelector('[data-spotify-layout="portrait"] h3');
    const artist = document.querySelector('[data-spotify-layout="portrait"] p');
    const timestamps = document.querySelector('[data-spotify-layout="portrait"] .font-mono');
    const font = node => node ? Number.parseFloat(getComputedStyle(node).fontSize) : 0;
    const within = child => {
      const rect = child?.getBoundingClientRect();
      const box = document.querySelector('[data-spotify-layout="portrait"]')?.getBoundingClientRect();
      return !!rect && !!box && rect.left >= box.left - 2 && rect.right <= box.right + 2
        && rect.top >= box.top - 2 && rect.bottom <= box.bottom + 2;
    };
    const buttons = [...document.querySelectorAll('[data-app-launcher="portrait"] button')].map(e => e.getBoundingClientRect());
    const inFrame = item => item && frame && item.left >= frame.left - 2 && item.right <= frame.right + 2
      && item.top >= frame.top - 2 && item.bottom <= frame.bottom + 2;
    return {
      calendarHeight: calendar?.offsetHeight ?? 0,
      logicalHeight: document.querySelector('main')?.offsetHeight ?? 0,
      player, launcher, controls,
      titleSize: font(title), artistSize: font(artist), timestampSize: font(timestamps),
      titleFits: within(title), artistFits: within(artist),
      intersects: area(player, launcher),
      fitsFrame: inFrame(player) && inFrame(launcher) && inFrame(controls),
      buttonsFit: buttons.every(b => frame && b.left >= frame.left - 2 && b.right <= frame.right + 2 && b.top >= frame.top - 2 && b.bottom <= frame.bottom + 2),
    };
  });
  if (layout.calendarHeight < layout.logicalHeight * 0.35
      || layout.calendarHeight > layout.logicalHeight * 0.5
      || layout.intersects > 1 || !layout.fitsFrame || !layout.buttonsFit
      || layout.titleSize < 25 || layout.artistSize < 16 || layout.timestampSize < 14
      || !layout.titleFits || !layout.artistFits) {
    throw new Error('Music player overlaps launcher or clips off-screen in portrait: ' + JSON.stringify(layout));
  }
  await portraitShot('portrait-home-music');

  await enter('Calendar');
  await page.locator('[data-calendar-orientation="portrait"]').waitFor();
  await portraitShot('portrait-calendar');
  await backHome();

  await enter('Weather');
  await page.locator('[data-weather-layout="portrait"]').waitFor();
  await portraitShot('portrait-weather');
  await backHome();

  await enter('Sports');
  await page.getByRole('heading', { name: 'Match centre', exact: true }).waitFor();
  await portraitShot('portrait-sports');
  await backHome();

  await enter('Settings');
  await enter('Apps & weather');
  await page.getByText('Auto-locate', { exact: true }).click();
  await page.locator('.on-screen-keyboard').waitFor();
  await page.waitForTimeout(400); // Wait for the keyboard's zoom-in animation to finish before measuring keys.
  const keyboard = await page.locator('.on-screen-keyboard').evaluate(node => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    buttons: [...node.querySelectorAll('.keyboard-row button')].map(el => {
      return { width: el.offsetWidth, height: el.offsetHeight };
    }),
  }));
  if (keyboard.scrollWidth > keyboard.clientWidth + 1 || keyboard.buttons.some(button => button.width < 30)) {
    throw new Error('Keyboard overflows or has untouchably small keys: ' + JSON.stringify(keyboard));
  }
  await page.waitForTimeout(200);
  await portraitShot('portrait-keyboard');
  await page.getByRole('button', { name: 'Back to previous screen' }).click();
  await enter('Display');
  await enter('Analog Clock');
  await enter('Preview selected screensaver');
  await page.locator('[data-screensaver="analog"]').waitFor();
  await assertScreensaverNowAndLater();
  await page.waitForTimeout(1000);
  await portraitShot('portrait-analog');
  await page.locator('[data-screensaver]').click({ position: { x: 20, y: 20 } });
  await page.locator('[data-screensaver]').waitFor({ state: 'detached' });

  await enter('Split-flap Board');
  await enter('Preview selected screensaver');
  await page.locator('[data-screensaver="flapboard"]').waitFor();
  await assertScreensaverNowAndLater();
  await page.waitForTimeout(1400);
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

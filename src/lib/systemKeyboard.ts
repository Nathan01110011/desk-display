import { spawn, spawnSync } from 'child_process';
import { existsSync } from 'fs';

interface KeyboardCandidate {
  name: string;
  path: string;
  args: string[];
}

export interface KeyboardControlResult {
  success: boolean;
  keyboard?: string;
  error?: string;
}

const KEYBOARD_CANDIDATES: KeyboardCandidate[] = [
  { name: 'wvkbd-mobintl', path: '/usr/bin/wvkbd-mobintl', args: [] },
  { name: 'wvkbd', path: '/usr/bin/wvkbd', args: [] },
  { name: 'squeekboard', path: '/usr/bin/squeekboard', args: [] },
  { name: 'onboard', path: '/usr/bin/onboard', args: [] },
  { name: 'matchbox-keyboard', path: '/usr/bin/matchbox-keyboard', args: [] },
];

function keyboardEnvironment(): NodeJS.ProcessEnv {
  const uid = typeof process.getuid === 'function' ? process.getuid() : undefined;

  return {
    ...process.env,
    DISPLAY: process.env.DISPLAY || ':0',
    WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY || 'wayland-0',
    XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR || (uid !== undefined ? `/run/user/${uid}` : undefined),
  };
}

export function disableOnScreenKeyboard(): KeyboardControlResult {
  if (process.platform !== 'linux') {
    return { success: false, error: 'System keyboard control is only available on Linux.' };
  }

  for (const candidate of KEYBOARD_CANDIDATES) {
    spawnSync('pkill', ['-x', candidate.name], { stdio: 'ignore' });
  }

  return { success: true };
}

export function enableOnScreenKeyboard(): KeyboardControlResult {
  if (process.platform !== 'linux') {
    return { success: false, error: 'System keyboard control is only available on Linux.' };
  }

  const candidate = KEYBOARD_CANDIDATES.find((item) => existsSync(item.path));
  if (!candidate) {
    return {
      success: false,
      error: 'No supported on-screen keyboard is installed. Tried wvkbd, squeekboard, onboard, and matchbox-keyboard.',
    };
  }

  disableOnScreenKeyboard();

  try {
    const child = spawn(candidate.path, candidate.args, {
      detached: true,
      stdio: 'ignore',
      env: keyboardEnvironment(),
    });
    child.unref();

    console.info(`[System Keyboard] Started ${candidate.name} for external authentication.`);
    return { success: true, keyboard: candidate.name };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[System Keyboard] Failed to start ${candidate.name}:`, error);
    return { success: false, error: message };
  }
}

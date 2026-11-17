import { spawn, spawnSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import path from 'path';

interface KeyboardCandidate {
  name: string;
  args: string[];
  display: 'wayland' | 'x11' | 'either';
}

interface DesktopSession {
  env: NodeJS.ProcessEnv;
  description: string;
}

export interface KeyboardControlResult {
  success: boolean;
  keyboard?: string;
  session?: string;
  error?: string;
}

const KEYBOARD_CANDIDATES: KeyboardCandidate[] = [
  { name: 'wvkbd-mobintl', args: [], display: 'wayland' },
  { name: 'wvkbd', args: [], display: 'wayland' },
  { name: 'squeekboard', args: [], display: 'wayland' },
  { name: 'onboard', args: [], display: 'either' },
  { name: 'matchbox-keyboard', args: [], display: 'x11' },
];

function findWaylandSession(): DesktopSession | null {
  try {
    for (const uidDir of readdirSync('/run/user')) {
      if (!/^\d+$/.test(uidDir)) continue;
      const runtimeDir = path.join('/run/user', uidDir);
      const sockets = readdirSync(/* turbopackIgnore: true */ runtimeDir).filter((entry) => /^wayland-\d+$/.test(entry));
      for (const socket of sockets) {
        const socketPath = path.join(runtimeDir, socket);
        try {
          if (!statSync(/* turbopackIgnore: true */ socketPath).isSocket()) continue;
        } catch {
          continue;
        }

        return {
          env: {
            ...process.env,
            XDG_RUNTIME_DIR: runtimeDir,
            WAYLAND_DISPLAY: socket,
            DISPLAY: process.env.DISPLAY || ':0',
          },
          description: `${runtimeDir}/${socket}`,
        };
      }
    }
  } catch {
    // Fall through to X11 / inherited environment.
  }

  return null;
}

function findX11Session(): DesktopSession | null {
  if (!existsSync('/tmp/.X11-unix/X0') && !process.env.DISPLAY) return null;

  return {
    env: {
      ...process.env,
      DISPLAY: process.env.DISPLAY || ':0',
    },
    description: process.env.DISPLAY || ':0',
  };
}

function inheritedSession(): DesktopSession {
  return {
    env: { ...process.env },
    description: 'inherited process environment',
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

// Turbopack's output-file tracer treats variable child_process executable paths as
// dynamic dependencies and can end up tracing the entire project. These are fixed
// system binaries, so keep the executable literal at each spawn call site.
// These paths are fixed Linux binaries, not project dependencies. Keep each
// filesystem check literal to avoid unnecessarily tracing the project root.
function isKeyboardInstalled(candidate: KeyboardCandidate) {
  switch (candidate.name) {
    case 'wvkbd-mobintl': return existsSync('/usr/bin/wvkbd-mobintl');
    case 'wvkbd': return existsSync('/usr/bin/wvkbd');
    case 'squeekboard': return existsSync('/usr/bin/squeekboard');
    case 'onboard': return existsSync('/usr/bin/onboard');
    case 'matchbox-keyboard': return existsSync('/usr/bin/matchbox-keyboard');
    default: return false;
  }
}

function spawnKeyboard(candidate: KeyboardCandidate, session: DesktopSession) {
  const options = { detached: true, stdio: 'ignore' as const, env: session.env };
  switch (candidate.name) {
    case 'wvkbd-mobintl': return spawn('/usr/bin/wvkbd-mobintl', candidate.args, options);
    case 'wvkbd': return spawn('/usr/bin/wvkbd', candidate.args, options);
    case 'squeekboard': return spawn('/usr/bin/squeekboard', candidate.args, options);
    case 'onboard': return spawn('/usr/bin/onboard', candidate.args, options);
    case 'matchbox-keyboard': return spawn('/usr/bin/matchbox-keyboard', candidate.args, options);
    default: throw new Error('Unsupported on-screen keyboard: ' + candidate.name);
  }
}

async function tryStart(candidate: KeyboardCandidate, session: DesktopSession): Promise<KeyboardControlResult> {
  try {
    const child = spawnKeyboard(candidate, session);

    await new Promise((resolve) => setTimeout(resolve, 500));

    if (child.exitCode !== null) {
      return {
        success: false,
        error: `${candidate.name} exited immediately in ${session.description}.`,
      };
    }

    child.unref();
    console.info(`[System Keyboard] Started ${candidate.name} in ${session.description}.`);
    return { success: true, keyboard: candidate.name, session: session.description };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function enableOnScreenKeyboard(): Promise<KeyboardControlResult> {
  if (process.platform !== 'linux') {
    return { success: false, error: 'System keyboard control is only available on Linux.' };
  }

  const installed = KEYBOARD_CANDIDATES.filter(isKeyboardInstalled);
  if (installed.length === 0) {
    return {
      success: false,
      error: 'No supported on-screen keyboard is installed. Tried wvkbd, squeekboard, onboard, and matchbox-keyboard.',
    };
  }

  disableOnScreenKeyboard();

  const wayland = findWaylandSession();
  const x11 = findX11Session();
  const inherited = inheritedSession();
  const failures: string[] = [];

  for (const candidate of installed) {
    const sessions: DesktopSession[] = [];
    if ((candidate.display === 'wayland' || candidate.display === 'either') && wayland) sessions.push(wayland);
    if ((candidate.display === 'x11' || candidate.display === 'either') && x11) sessions.push(x11);
    if (sessions.length === 0) sessions.push(inherited);

    for (const session of sessions) {
      const result = await tryStart(candidate, session);
      if (result.success) return result;
      failures.push(result.error || `${candidate.name} failed in ${session.description}`);
    }
  }

  const error = `Installed keyboard(s) could not attach to the desktop session: ${failures.join(' | ')}`;
  console.error(`[System Keyboard] ${error}`);
  return { success: false, error };
}

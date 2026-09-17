import { spawn, spawnSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import path from 'path';

interface KeyboardCandidate {
  name: string;
  path: string;
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
  { name: 'wvkbd-mobintl', path: '/usr/bin/wvkbd-mobintl', args: [], display: 'wayland' },
  { name: 'wvkbd', path: '/usr/bin/wvkbd', args: [], display: 'wayland' },
  { name: 'squeekboard', path: '/usr/bin/squeekboard', args: [], display: 'wayland' },
  { name: 'onboard', path: '/usr/bin/onboard', args: [], display: 'either' },
  { name: 'matchbox-keyboard', path: '/usr/bin/matchbox-keyboard', args: [], display: 'x11' },
];

function findWaylandSession(): DesktopSession | null {
  try {
    for (const uidDir of readdirSync('/run/user')) {
      if (!/^\d+$/.test(uidDir)) continue;
      const runtimeDir = path.join('/run/user', uidDir);
      const sockets = readdirSync(runtimeDir).filter((entry) => /^wayland-\d+$/.test(entry));
      for (const socket of sockets) {
        const socketPath = path.join(runtimeDir, socket);
        try {
          if (!statSync(socketPath).isSocket()) continue;
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

async function tryStart(candidate: KeyboardCandidate, session: DesktopSession): Promise<KeyboardControlResult> {
  try {
    const child = spawn(candidate.path, candidate.args, {
      detached: true,
      stdio: 'ignore',
      env: session.env,
    });

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

  const installed = KEYBOARD_CANDIDATES.filter((candidate) => existsSync(candidate.path));
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

import { spawn } from 'child_process';
import { readdirSync, statSync } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

function desktopEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };

  try {
    for (const uidDir of readdirSync('/run/user')) {
      if (!/^\d+$/.test(uidDir)) continue;
      const runtimeDir = path.join('/run/user', uidDir);
      const socket = readdirSync(runtimeDir).find((entry) => {
        if (!/^wayland-\d+$/.test(entry)) return false;
        try {
          return statSync(path.join(runtimeDir, entry)).isSocket();
        } catch {
          return false;
        }
      });

      if (socket) {
        env.XDG_RUNTIME_DIR = runtimeDir;
        env.WAYLAND_DISPLAY = socket;
        env.DISPLAY = env.DISPLAY || ':0';
        break;
      }
    }
  } catch {
    // Fall back to the process environment. The launcher will fail visibly if
    // there is no graphical session available.
  }

  return env;
}

export async function POST() {
  if (process.platform !== 'linux') {
    return NextResponse.json(
      { success: false, error: 'Spotify kiosk authentication is only available on Linux.' },
      { status: 400 },
    );
  }

  const script = path.join(process.cwd(), 'scripts', 'spotify-auth.sh');

  try {
    const child = spawn('/bin/bash', [script], {
      cwd: process.cwd(),
      detached: true,
      stdio: 'ignore',
      env: desktopEnvironment(),
    });

    child.unref();

    return NextResponse.json({
      success: true,
      message: 'Closing kiosk and opening Spotify authentication in a normal window.',
    }, { status: 202 });
  } catch (error) {
    console.error('[Spotify] Failed to launch authentication window:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to launch Spotify authentication.',
      },
      { status: 500 },
    );
  }
}

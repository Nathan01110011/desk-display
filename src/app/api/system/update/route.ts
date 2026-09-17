import { spawn } from 'child_process';
import { closeSync, openSync } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function POST() {
  if (process.platform !== 'linux') {
    return NextResponse.json({ success: false, error: 'Updates can only be applied on the Linux kiosk.' }, { status: 400 });
  }

  const projectDir = process.cwd();
  const deployScript = path.join(projectDir, 'scripts', 'deploy.sh');
  const logPath = path.join(projectDir, '.update-build.log');

  try {
    const logFd = openSync(logPath, 'a');
    const child = spawn('/bin/bash', [deployScript], {
      cwd: projectDir,
      detached: true,
      stdio: ['ignore', logFd, logFd],
      env: process.env,
    });

    child.unref();
    closeSync(logFd);

    return NextResponse.json({
      success: true,
      message: 'Update started. The kiosk will close during the build and relaunch when deployment completes.',
    });
  } catch (error) {
    console.error('Failed to start self-update:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to start update.' },
      { status: 500 },
    );
  }
}

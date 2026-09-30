import { NextResponse } from 'next/server';
import { exec } from 'child_process';

export async function POST() {
  // Only allow this if we are running on Linux (Raspberry Pi)
  if (process.platform === 'linux') {
    exec('pkill -f chromium', (error) => {
      if (error) console.error('Failed to kill chromium:', error);
    });
    return NextResponse.json({ success: true });
  }
  
  return NextResponse.json({ success: false, error: 'Not on Linux' }, { status: 400 });
}

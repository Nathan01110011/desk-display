import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const SETTINGS_PATH = path.join(process.cwd(), '.dashboard-settings.json');

function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error("Failed to read settings file", e);
  }
  return null;
}

export async function GET() {
  const settings = readSettings();
  return NextResponse.json(settings || {});
}

export async function POST(req: Request) {
  try {
    const newSettings = await req.json();
    const currentSettings = readSettings() || {};
    
    const updated = { ...currentSettings, ...newSettings };
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(updated, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
  }
}

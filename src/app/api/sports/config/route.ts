import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { normalizeSportsConfig, SPORTS_LEAGUE_PRESETS } from '@/lib/sportsConfig';
import { SportsConfig } from '@/types';

const SETTINGS_PATH = path.join(process.cwd(), '.dashboard-settings.json');

function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to read settings file', e);
  }
  return {};
}

export async function GET() {
  const settings = readSettings();
  const config = normalizeSportsConfig(settings.sportsConfig);
  const leaguePresets = [...SPORTS_LEAGUE_PRESETS, ...config.leagues].filter((league, index, leagues) => (
    leagues.findIndex(item => item.sport === league.sport && item.id === league.id) === index
  )).sort((a, b) => {
    const presetA = SPORTS_LEAGUE_PRESETS.findIndex(item => item.sport === a.sport && item.id === a.id);
    const presetB = SPORTS_LEAGUE_PRESETS.findIndex(item => item.sport === b.sport && item.id === b.id);
    if (presetA !== -1 || presetB !== -1) return (presetA === -1 ? 999 : presetA) - (presetB === -1 ? 999 : presetB);
    return `${a.sport}:${a.name}`.localeCompare(`${b.sport}:${b.name}`);
  });

  return NextResponse.json({
    config,
    leaguePresets,
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<SportsConfig>;
    const settings = readSettings();
    const sportsConfig = normalizeSportsConfig(body);

    fs.writeFileSync(SETTINGS_PATH, JSON.stringify({ ...settings, sportsConfig }, null, 2));

    return NextResponse.json({ success: true, config: sportsConfig });
  } catch (e) {
    console.error('Failed to save sports settings', e);
    return NextResponse.json({ success: false, error: 'Failed to save sports settings' }, { status: 500 });
  }
}

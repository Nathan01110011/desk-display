import { NextResponse } from 'next/server';
import { SportMatch } from '@/types';

// In-memory cache
let cache: { data: SportMatch[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const LEAGUES = [
  { sport: 'soccer', id: 'eng.1' }, // Premier League
  { sport: 'soccer', id: 'nir.1' }, // NIFL
  { sport: 'soccer', id: 'uefa.nations' }, // UEFA Nations League
  { sport: 'soccer', id: 'fifa.friendly' }, // Friendlies
  { sport: 'rugby', id: '270559' }, // URC
  { sport: 'rugby', id: 'intl' }, // Rugby Internationals
];

const TARGET_TEAMS = [
  'Manchester United',
  'Ballymena United',
  'Northern Ireland',
  'Ulster',
  'Ireland'
];

async function fetchLeagueScoreboard(sport: string, leagueId: string): Promise<SportMatch[]> {
  try {
    const standardUrl = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${leagueId}/scoreboard`;
    
    const res = await fetch(standardUrl, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();

    const matches: SportMatch[] = [];

    data.events?.forEach((event: { id: string; competitions: { competitors: { homeAway: string; team: { displayName: string; shortDisplayName?: string; logo: string }; score: string }[] }[]; status: { type: { detail: string; state: string } }; date: string }) => {
      const competition = event.competitions[0];
      const home = competition.competitors.find((c: { homeAway: string }) => c.homeAway === 'home')!;
      const away = competition.competitors.find((c: { homeAway: string }) => c.homeAway === 'away')!;

      const isTarget = TARGET_TEAMS.some(team => 
        home.team.displayName.includes(team) || 
        away.team.displayName.includes(team) ||
        home.team.shortDisplayName?.includes(team) ||
        away.team.shortDisplayName?.includes(team)
      );

      if (isTarget) {
        matches.push({
          id: event.id,
          sport: sport as 'soccer' | 'rugby',
          league: data.leagues?.[0]?.name || 'League',
          homeTeam: {
            name: home.team.displayName,
            logo: home.team.logo,
            score: home.score
          },
          awayTeam: {
            name: away.team.displayName,
            logo: away.team.logo,
            score: away.score
          },
          clock: event.status.type.detail,
          status: event.status.type.state.toUpperCase() as 'PRE' | 'IN' | 'POST',
          startTime: event.date
        });
      }
    });

    return matches;
  } catch (e) {
    console.error(`Failed to fetch ${sport} ${leagueId}:`, e);
    return [];
  }
}

export async function GET() {
  const now = Date.now();

  if (cache && now - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const allMatches = await Promise.all(
      LEAGUES.map(l => fetchLeagueScoreboard(l.sport, l.id))
    );

    const flattened = allMatches.flat();
    
    // Sort by status (Live first) then by start time
    const sorted = flattened.sort((a, b) => {
      if (a.status === 'IN' && b.status !== 'IN') return -1;
      if (a.status !== 'IN' && b.status === 'IN') return 1;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    cache = { data: sorted, timestamp: now };
    return NextResponse.json(sorted);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}

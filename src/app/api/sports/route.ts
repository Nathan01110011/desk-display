import { NextResponse } from 'next/server';
import { SportMatch } from '@/types';

// In-memory cache
let cache: { data: SportMatch[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Parse environment variables
const SPORTS_LEAGUES_ENV = process.env.SPORTS_LEAGUES || '';
const SPORTS_TEAMS_ENV = process.env.SPORTS_TEAMS || '';

const LEAGUES = SPORTS_LEAGUES_ENV.split(',').filter(Boolean).map(item => {
  const [sport, id] = item.split(':');
  return { sport, id };
});

const TARGET_TEAMS = SPORTS_TEAMS_ENV.split(',').filter(Boolean).map(t => t.trim());

async function fetchLeagueScoreboard(sport: string, leagueId: string, date: string): Promise<SportMatch[]> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${leagueId}/scoreboard?dates=${date}`;
    
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();

    const matches: SportMatch[] = [];

    data.events?.forEach((event: any) => {
      const competition = event.competitions[0];
      const home = competition.competitors.find((c: any) => c.homeAway === 'home');
      const away = competition.competitors.find((c: any) => c.homeAway === 'away');

      if (!home || !away) return;

      const homeName = home.team.displayName || '';
      const awayName = away.team.displayName || '';
      const homeShort = home.team.shortDisplayName || '';
      const awayShort = away.team.shortDisplayName || '';

      const isTarget = TARGET_TEAMS.some(team => 
        homeName.toLowerCase().includes(team.toLowerCase()) || 
        awayName.toLowerCase().includes(team.toLowerCase()) ||
        homeShort.toLowerCase().includes(team.toLowerCase()) ||
        awayShort.toLowerCase().includes(team.toLowerCase())
      );

      if (isTarget) {
        const getScore = (competitor: any) => {
          if (competitor.score !== undefined && competitor.score !== null && competitor.score !== '') {
            return competitor.score.toString();
          }
          if (competitor.displayScore !== undefined) {
            return competitor.displayScore.toString();
          }
          if (competitor.linescores && competitor.linescores.length > 0) {
            return competitor.linescores.reduce((total: number, line: any) => total + (line.value || 0), 0).toString();
          }
          return '0';
        };

        matches.push({
          id: event.id,
          sport: sport as 'soccer' | 'rugby',
          league: data.leagues?.[0]?.name || 'League',
          homeTeam: {
            name: homeName,
            logo: home.team.logo,
            score: getScore(home)
          },
          awayTeam: {
            name: awayName,
            logo: away.team.logo,
            score: getScore(away)
          },
          clock: event.status.type.detail,
          status: event.status.type.state.toUpperCase() as 'PRE' | 'IN' | 'POST',
          startTime: event.date
        });
      }
    });

    return matches;
  } catch (e) {
    return [];
  }
}

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export async function GET() {
  const now = Date.now();

  if (cache && now - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  // Fallback if env vars aren't set
  if (LEAGUES.length === 0 || TARGET_TEAMS.length === 0) {
    return NextResponse.json([]);
  }

  try {
    const today = new Date();
    const dates = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(formatDate(d));
    }

    const fetchPromises: Promise<SportMatch[]>[] = [];
    dates.forEach(date => {
      LEAGUES.forEach(league => {
        fetchPromises.push(fetchLeagueScoreboard(league.sport, league.id, date));
      });
    });

    const allResults = await Promise.all(fetchPromises);
    const flattened = allResults.flat();
    
    const uniqueMap = new Map<string, SportMatch>();
    flattened.forEach(m => {
      uniqueMap.set(m.id, m);
    });
    const unique = Array.from(uniqueMap.values());

    const sorted = unique.sort((a, b) => {
      if (a.status === 'IN' && b.status !== 'IN') return -1;
      if (a.status !== 'IN' && b.status === 'IN') return 1;
      if (a.status === 'PRE' && b.status === 'POST') return -1;
      if (a.status === 'POST' && b.status === 'PRE') return 1;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    cache = { data: sorted, timestamp: now };
    return NextResponse.json(sorted);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { normalizeSportsConfig } from '@/lib/sportsConfig';
import { SportMatch, SportsConfig, SportTeamConfig } from '@/types';

const SETTINGS_PATH = path.join(process.cwd(), '.dashboard-settings.json');

let cache: { data: SportMatch[]; timestamp: number; key: string } | null = null;
const CACHE_TTL = 5 * 60 * 1000;
const ESPN_FETCH_TIMEOUT_MS = 8000;
const ESPN_FETCH_CONCURRENCY = 6;
const FETCH_WARNING_COOLDOWN_MS = 10 * 60 * 1000;
const fetchWarnings = new Map<string, number>();

function readSavedSportsConfig(): Partial<SportsConfig> | null {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) return null;
    const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    return settings.sportsConfig || null;
  } catch (e) {
    console.error('Failed to read sports settings', e);
    return null;
  }
}

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function getLogo(team: EspnTeam) {
  return team.logo || team.logos?.find(logo => logo.rel?.includes('default'))?.href || team.logos?.[0]?.href || '';
}

function getScore(competitor: EspnCompetitor) {
  if (competitor.score !== undefined && competitor.score !== null && competitor.score !== '') {
    return competitor.score.toString();
  }
  if (competitor.displayScore !== undefined) {
    return competitor.displayScore.toString();
  }
  if (competitor.linescores && competitor.linescores.length > 0) {
    return competitor.linescores.reduce((total, line) => total + (line.value || 0), 0).toString();
  }
  return '0';
}

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function teamMatches(
  competitor: EspnCompetitor,
  league: SportsConfig['leagues'][number],
  targets: SportTeamConfig[]
) {
  const team = competitor.team;
  const values = [
    team.id,
    team.uid,
    team.displayName,
    team.name,
    team.shortDisplayName,
    team.abbreviation,
    team.location,
  ].filter((value): value is string => Boolean(value));

  return targets.some(target => {
    if (target.sport && target.sport !== league.sport) return false;
    if (target.leagueId && target.leagueId !== league.id) return false;

    if (target.id && values.includes(target.id)) return true;
    const targetNames = [target.name, target.shortName, ...(target.aliases || [])].filter((value): value is string => Boolean(value));
    return targetNames.some(name => values.some(value => compact(value).includes(compact(name))));
  });
}

async function fetchLeagueScoreboard(
  league: SportsConfig['leagues'][number],
  date: string,
  teams: SportTeamConfig[]
): Promise<SportMatch[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ESPN_FETCH_TIMEOUT_MS);

  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${league.sport}/${league.id}/scoreboard?dates=${date}`;
    const res = await fetch(url, { next: { revalidate: 60 }, signal: controller.signal });
    if (!res.ok) return [];

    const data = (await res.json()) as EspnScoreboard;
    const matches: SportMatch[] = [];

    data.events?.forEach(event => {
      const competition = event.competitions?.[0];
      const home = competition?.competitors?.find(competitor => competitor.homeAway === 'home');
      const away = competition?.competitors?.find(competitor => competitor.homeAway === 'away');

      if (!competition || !home || !away) return;
      if (!teamMatches(home, league, teams) && !teamMatches(away, league, teams)) return;

      matches.push({
        id: `${league.sport}:${league.id}:${event.id}`,
        sport: league.sport,
        league: data.leagues?.[0]?.name || league.name,
        homeTeam: {
          id: home.team.id,
          name: home.team.displayName || home.team.name || '',
          shortName: home.team.shortDisplayName,
          logo: getLogo(home.team),
          score: getScore(home),
          winner: home.winner,
        },
        awayTeam: {
          id: away.team.id,
          name: away.team.displayName || away.team.name || '',
          shortName: away.team.shortDisplayName,
          logo: getLogo(away.team),
          score: getScore(away),
          winner: away.winner,
        },
        clock: event.status.type.shortDetail || event.status.type.detail,
        detail: event.status.type.detail,
        status: event.status.type.state.toUpperCase() as 'PRE' | 'IN' | 'POST',
        startTime: event.date,
        venue: competition.venue?.fullName,
      });
    });

    return matches;
  } catch (e) {
    logSportsFetchWarning(league, date, e);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function getFetchErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const cause = error.cause;
    if (cause instanceof Error) return `${error.message}: ${cause.message}`;
    return error.message;
  }
  return String(error);
}

function logSportsFetchWarning(league: SportsConfig['leagues'][number], date: string, error: unknown) {
  const key = `${league.sport}:${league.id}:${date}`;
  const now = Date.now();
  const lastWarning = fetchWarnings.get(key) || 0;

  if (now - lastWarning < FETCH_WARNING_COOLDOWN_MS) return;

  fetchWarnings.set(key, now);
  console.warn(`Sports fetch skipped ${league.sport}:${league.id} on ${date}: ${getFetchErrorMessage(error)}`);
}

async function runLimited<T>(tasks: (() => Promise<T>)[], concurrency: number) {
  const results: T[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await tasks[index]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

function sortMatches(a: SportMatch, b: SportMatch) {
  if (a.status === 'IN' && b.status !== 'IN') return -1;
  if (a.status !== 'IN' && b.status === 'IN') return 1;
  if (a.status === 'PRE' && b.status === 'POST') return -1;
  if (a.status === 'POST' && b.status === 'PRE') return 1;
  return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
}

export async function GET() {
  const config = normalizeSportsConfig(readSavedSportsConfig());
  const cacheKey = JSON.stringify(config);
  const now = Date.now();

  if (cache && cache.key === cacheKey && now - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  if (config.leagues.length === 0 || config.teams.length === 0) {
    return NextResponse.json([]);
  }

  try {
    const today = new Date();
    const dates = [];
    for (let i = -config.daysBack; i <= config.daysAhead; i += 1) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(formatDate(d));
    }

    const allResults = await runLimited(
      dates.flatMap(date => config.leagues.map(league => () => fetchLeagueScoreboard(league, date, config.teams))),
      ESPN_FETCH_CONCURRENCY
    );
    const unique = Array.from(new Map(allResults.flat().map(match => [match.id, match])).values()).sort(sortMatches);

    cache = { data: unique, timestamp: now, key: cacheKey };
    return NextResponse.json(unique);
  } catch (e) {
    console.error('Sports route failed', e);
    return NextResponse.json([], { status: 500 });
  }
}

interface EspnLogo {
  href: string;
  rel?: string[];
}

interface EspnTeam {
  id?: string;
  uid?: string;
  abbreviation?: string;
  displayName?: string;
  name?: string;
  shortDisplayName?: string;
  location?: string;
  logo?: string;
  logos?: EspnLogo[];
}

interface EspnCompetitor {
  homeAway: string;
  team: EspnTeam;
  score?: string | number;
  displayScore?: string | number;
  linescores?: { value: number }[];
  winner?: boolean;
}

interface EspnCompetition {
  competitors?: EspnCompetitor[];
  venue?: { fullName?: string };
}

interface EspnScoreboard {
  leagues?: { name?: string }[];
  events?: {
    id: string;
    date: string;
    competitions?: EspnCompetition[];
    status: {
      type: {
        detail: string;
        shortDetail?: string;
        state: string;
      };
    };
  }[];
}

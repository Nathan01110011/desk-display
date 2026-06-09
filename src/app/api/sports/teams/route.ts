import { NextResponse } from 'next/server';
import { getLeagueKey, normalizeSportsConfig, SPORTS_LEAGUE_PRESETS } from '@/lib/sportsConfig';
import { SportKind, SportTeamSearchResult } from '@/types';

function getLogo(team: EspnTeam) {
  return team.logo || team.logos?.find(logo => logo.rel?.includes('default'))?.href || team.logos?.[0]?.href || '';
}

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function fetchTeamsForLeague(leagueKey: string): Promise<SportTeamSearchResult[]> {
  const league = SPORTS_LEAGUE_PRESETS.find(item => getLeagueKey(item) === leagueKey) || parseLeagueKey(leagueKey);
  if (!league) return [];

  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${league.sport}/${league.id}/teams`, {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as EspnTeamsResponse;
    const teams = data.sports?.flatMap(sport => sport.leagues?.flatMap(item => item.teams || []) || []) || [];

    return teams.map(({ team }) => ({
      id: team.id,
      name: team.displayName || team.name || '',
      shortName: team.shortDisplayName,
      logo: getLogo(team),
      leagueId: league.id,
      sport: league.sport,
      leagueName: league.name,
      aliases: [team.abbreviation, team.nickname, team.location].filter((value): value is string => Boolean(value)),
    })).filter(team => team.name);
  } catch (e) {
    console.error(`Team search failed for ${leagueKey}`, e);
    return [];
  }
}

function parseLeagueKey(leagueKey: string) {
  const [sport, id] = leagueKey.split(':');
  if (!sport || !id || !['soccer', 'rugby', 'football'].includes(sport)) return null;
  return {
    sport: sport as SportKind,
    id,
    name: id.toUpperCase(),
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = compact(url.searchParams.get('q') || '');
  const config = normalizeSportsConfig(null);
  const leagueKeys = url.searchParams.get('league')
    ? [url.searchParams.get('league') || '']
    : config.leagues.map(getLeagueKey);

  if (!query) return NextResponse.json([]);

  const allTeams = (await Promise.all(leagueKeys.map(fetchTeamsForLeague))).flat();
  const filtered = allTeams
    .filter(team => {
      const values = [team.name, team.shortName, ...(team.aliases || [])].filter((value): value is string => Boolean(value));
      return values.some(value => compact(value).includes(query));
    })
    .slice(0, 12);

  return NextResponse.json(filtered);
}

interface EspnLogo {
  href: string;
  rel?: string[];
}

interface EspnTeam {
  id?: string;
  abbreviation?: string;
  displayName?: string;
  name?: string;
  nickname?: string;
  shortDisplayName?: string;
  location?: string;
  logo?: string;
  logos?: EspnLogo[];
}

interface EspnTeamsResponse {
  sports?: {
    leagues?: {
      teams?: { team: EspnTeam }[];
    }[];
  }[];
}

import { SportsConfig, SportKind, SportLeagueConfig, SportTeamConfig } from '@/types';

export const SPORTS_LEAGUE_PRESETS: SportLeagueConfig[] = [
  { sport: 'soccer', id: 'eng.1', name: 'Premier League' },
  { sport: 'soccer', id: 'sco.1', name: 'Scottish Premiership' },
  { sport: 'soccer', id: 'uefa.champions', name: 'Champions League' },
  { sport: 'football', id: 'nfl', name: 'NFL' },
  { sport: 'rugby', id: '270557', name: 'United Rugby Championship' },
  { sport: 'rugby', id: '267979', name: 'Gallagher Premiership' },
  { sport: 'rugby', id: '180659', name: 'Six Nations' },
  { sport: 'rugby', id: '289234', name: 'International Test Match' },
  { sport: 'rugby', id: '244293', name: 'The Rugby Championship' },
  { sport: 'rugby', id: '164205', name: 'Rugby World Cup' },
  { sport: 'rugby', id: '268565', name: 'British & Irish Lions Tour' },
  { sport: 'rugby', id: '17567', name: 'Nations Championship' },
  { sport: 'rugby', id: '289237', name: "Women's Rugby World Cup" },
];

const DEPRECATED_ESPN_LEAGUE_KEYS = new Set(['rugby:242', 'rugby:intl']);

export const DEFAULT_SPORTS_CONFIG: SportsConfig = {
  leagues: SPORTS_LEAGUE_PRESETS.slice(0, 4),
  teams: [],
  daysBack: 3,
  daysAhead: 7,
};

function parseLeague(raw: string): SportLeagueConfig | null {
  const [sport, id] = raw.trim().split(':');
  if (!sport || !id) return null;
  if (!['soccer', 'rugby', 'football'].includes(sport)) return null;
  if (DEPRECATED_ESPN_LEAGUE_KEYS.has(`${sport}:${id}`)) return null;

  const preset = SPORTS_LEAGUE_PRESETS.find(item => item.sport === sport && item.id === id);
  return {
    sport: sport as SportKind,
    id,
    name: preset?.name || id.toUpperCase(),
  };
}

function uniqueLeagues(leagues: SportLeagueConfig[]) {
  const seen = new Set<string>();
  return leagues.filter(league => {
    const key = `${league.sport}:${league.id}`;
    if (DEPRECATED_ESPN_LEAGUE_KEYS.has(key)) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(league => {
    const preset = SPORTS_LEAGUE_PRESETS.find(item => item.sport === league.sport && item.id === league.id);
    return preset || league;
  });
}

function uniqueTeams(teams: SportTeamConfig[]) {
  const seen = new Set<string>();
  return teams.filter(team => {
    const key = `${team.sport || ''}:${team.leagueId || ''}:${team.id || team.name}`.toLowerCase();
    if (!team.name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getEnvSportsConfig(): SportsConfig {
  const leagues = (process.env.SPORTS_LEAGUES || '')
    .split(',')
    .map(parseLeague)
    .filter((league): league is SportLeagueConfig => league !== null);

  const teams = (process.env.SPORTS_TEAMS || '')
    .split(',')
    .map(name => name.trim())
    .filter(Boolean)
    .map(name => ({ name }));

  return {
    ...DEFAULT_SPORTS_CONFIG,
    leagues: leagues.length > 0 ? uniqueLeagues(leagues) : DEFAULT_SPORTS_CONFIG.leagues,
    teams,
  };
}

export function normalizeSportsConfig(config: Partial<SportsConfig> | null | undefined): SportsConfig {
  const envConfig = getEnvSportsConfig();
  const merged = {
    ...envConfig,
    ...config,
  };

  return {
    leagues: uniqueLeagues((merged.leagues || []).filter(Boolean)),
    teams: uniqueTeams((merged.teams || []).filter(Boolean)),
    daysBack: Math.max(0, Math.min(14, Number(merged.daysBack ?? envConfig.daysBack) || envConfig.daysBack)),
    daysAhead: Math.max(1, Math.min(30, Number(merged.daysAhead ?? envConfig.daysAhead) || envConfig.daysAhead)),
  };
}

export function getLeagueKey(league: SportLeagueConfig) {
  return `${league.sport}:${league.id}`;
}

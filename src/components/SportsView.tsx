import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Check, ChevronDown, Clock, Plus, RefreshCw, Search, Settings2, Trash2, Trophy } from 'lucide-react';
import { SportLeagueConfig, SportMatch, SportsConfig, SportTeamConfig, SportTeamSearchResult } from '@/types';
import { OnScreenKeyboard } from './OnScreenKeyboard';

interface SportsViewProps {
  matches: SportMatch[];
  loading?: boolean;
  onRefresh?: () => void;
  onClose: () => void;
}

function formatMatchDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatKickoff(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function getLeagueKey(league: SportLeagueConfig) {
  return `${league.sport}:${league.id}`;
}

function getTeamKey(team: SportTeamConfig) {
  return `${team.sport || 'any'}:${team.leagueId || 'any'}:${team.id || team.name}`.toLowerCase();
}

function getTeamGroupKey(team: SportTeamConfig) {
  return `${team.sport || 'any'}:${team.id || team.name}`.toLowerCase();
}

function getSportLabel(sport?: SportLeagueConfig['sport']) {
  if (sport === 'football') return 'NFL';
  if (sport === 'rugby') return 'Rugby';
  if (sport === 'soccer') return 'Soccer';
  return 'Any sport';
}

function getStatusLabel(match: SportMatch) {
  if (match.status === 'PRE') return `${formatMatchDate(match.startTime)} ${formatKickoff(match.startTime)}`;
  if (match.status === 'POST') return `Final ${formatMatchDate(match.startTime)}`;
  return match.clock || 'Live';
}

function getMatchTone(match: SportMatch) {
  if (match.status === 'IN') return 'border-red-500/30 bg-red-500/10';
  if (match.status === 'POST') return 'border-white/10 bg-white/[0.035]';
  return 'border-blue-500/20 bg-blue-500/10';
}

function ranges(config: SportsConfig | null, field: 'daysBack' | 'daysAhead', delta: number) {
  if (!config) return null;
  const limit = field === 'daysBack' ? 14 : 30;
  const minimum = field === 'daysBack' ? 0 : 1;
  return { ...config, [field]: Math.max(minimum, Math.min(limit, config[field] + delta)) };
}

export function SportsView({ matches, loading = false, onRefresh }: SportsViewProps) {
  const [mode, setMode] = useState<'scores' | 'teams'>('scores');
  const [config, setConfig] = useState<SportsConfig | null>(null);
  const [leaguePresets, setLeaguePresets] = useState<SportLeagueConfig[]>([]);
  const [selectedLeague, setSelectedLeague] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SportTeamSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);

  const liveCount = matches.filter(match => match.status === 'IN').length;
  const upcomingCount = matches.filter(match => match.status === 'PRE').length;
  const completedCount = matches.filter(match => match.status === 'POST').length;

  const groupedMatches = useMemo(() => {
    return matches.reduce<Record<string, SportMatch[]>>((groups, match) => {
      const key = formatMatchDate(match.startTime);
      groups[key] = [...(groups[key] || []), match];
      return groups;
    }, {});
  }, [matches]);

  const groupedTeams = useMemo(() => {
    if (!config) return [];

    const sports = new Map<string, {
      key: string;
      label: string;
      teams: Map<string, {
        key: string;
        name: string;
        shortName?: string;
        logo?: string;
        teams: SportTeamConfig[];
      }>;
    }>();

    config.teams.forEach(team => {
      const sportKey = team.sport || 'any';
      const sportGroup = sports.get(sportKey) || {
        key: sportKey,
        label: getSportLabel(team.sport),
        teams: new Map(),
      };
      const teamGroupKey = getTeamGroupKey(team);
      const teamGroup = sportGroup.teams.get(teamGroupKey) || {
        key: teamGroupKey,
        name: team.name,
        shortName: team.shortName,
        logo: team.logo,
        teams: [],
      };

      teamGroup.name = teamGroup.name.length <= team.name.length ? teamGroup.name : team.name;
      teamGroup.shortName ||= team.shortName;
      teamGroup.logo ||= team.logo;
      teamGroup.teams.push(team);
      sportGroup.teams.set(teamGroupKey, teamGroup);
      sports.set(sportKey, sportGroup);
    });

    const sportOrder = ['soccer', 'rugby', 'football', 'any'];
    return Array.from(sports.values())
      .sort((a, b) => sportOrder.indexOf(a.key) - sportOrder.indexOf(b.key))
      .map(sport => ({
        ...sport,
        teams: Array.from(sport.teams.values()).sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [config]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/sports/config');
        if (!res.ok) return;
        const data = await res.json();
        setConfig(data.config);
        setLeaguePresets(data.leaguePresets);
        setSelectedLeague(getLeagueKey(data.config.leagues[0] || data.leaguePresets[0]));
      } catch (e) {
        console.error('Failed to load sports config', e);
      }
    };

    loadConfig();
  }, []);

  useEffect(() => {
    if (!query.trim() || !selectedLeague) {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setSearching(true);
        const res = await fetch(`/api/sports/teams?q=${encodeURIComponent(query)}&league=${encodeURIComponent(selectedLeague)}`);
        setResults(res.ok ? await res.json() : []);
      } catch (e) {
        console.error('Failed to search teams', e);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query, selectedLeague]);

  const saveConfig = async (nextConfig: SportsConfig | null) => {
    if (!nextConfig) return;
    setConfig(nextConfig);
    const res = await fetch('/api/sports/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextConfig),
    });
    if (res.ok) {
      const data = await res.json();
      setConfig(data.config);
      onRefresh?.();
    }
  };

  const getTeamLeagueLabel = (team: SportTeamConfig) => {
    const league = leaguePresets.find(item => item.sport === team.sport && item.id === team.leagueId);
    return league?.name || team.leagueName || getSportLabel(team.sport);
  };

  const toggleLeague = (league: SportLeagueConfig) => {
    if (!config) return;
    const key = getLeagueKey(league);
    const isActive = config.leagues.some(item => getLeagueKey(item) === key);
    const leagues = isActive
      ? config.leagues.filter(item => getLeagueKey(item) !== key)
      : [...config.leagues, league];

    saveConfig({ ...config, leagues });
    setSelectedLeague(key);
  };

  const addTeam = (team: SportTeamConfig) => {
    if (!config) return;
    const teamKey = getTeamKey(team);
    const exists = config.teams.some(item => getTeamKey(item) === teamKey);
    if (exists) return;
    saveConfig({ ...config, teams: [...config.teams, team] });
    setQuery('');
    setResults([]);
  };

  const removeTeam = (team: SportTeamConfig) => {
    if (!config) return;
    const teamKey = getTeamKey(team);
    saveConfig({
      ...config,
      teams: config.teams.filter(item => getTeamKey(item) !== teamKey),
    });
  };

  return (
    <motion.div
      key="sports-view"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full h-full flex flex-col gap-5"
    >
      <div className="flex items-center justify-between gap-4 pr-24">
        <div className="flex items-center gap-4 text-white/30 font-bold uppercase tracking-[0.3em] text-sm">
          <Trophy size={20} /> Sports
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-white/[0.04] border border-white/10 p-1">
          <button
            onPointerDown={() => setMode('scores')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'scores' ? 'bg-white text-black' : 'text-white/40'}`}
          >
            Scores
          </button>
          <button
            onPointerDown={() => setMode('teams')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'teams' ? 'bg-white text-black' : 'text-white/40'}`}
          >
            Teams
          </button>
        </div>
      </div>

      {mode === 'scores' ? (
        <div className="min-h-0 flex-1 grid grid-rows-[auto_1fr] gap-5">
          <div className="grid grid-cols-4 gap-3">
            {[
              ['Live', liveCount.toString(), 'text-red-400'],
              ['Upcoming', upcomingCount.toString(), 'text-blue-300'],
              ['Finals', completedCount.toString(), 'text-white/50'],
            ].map(([label, value, tone]) => (
              <div key={label} className="rounded-2xl bg-white/[0.035] border border-white/10 px-5 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">{label}</p>
                <p className={`text-3xl font-black tabular-nums ${tone}`}>{value}</p>
              </div>
            ))}
            <button
              onPointerDown={onRefresh}
              className="rounded-2xl bg-white/[0.035] border border-white/10 px-5 py-4 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
            >
              <RefreshCw size={22} className={loading ? 'animate-spin text-blue-300' : 'text-white/50'} />
              <span className="text-sm font-black uppercase tracking-widest text-white/50">Refresh</span>
            </button>
          </div>

          <div className="min-h-0 overflow-y-auto pr-2 scrollbar-hide space-y-5">
            {matches.length > 0 ? (
              Object.entries(groupedMatches).map(([dateLabel, dateMatches]) => (
                <section key={dateLabel} className="space-y-3">
                  <div className="flex items-center gap-2 text-white/25 font-black uppercase tracking-[0.2em] text-[10px]">
                    <CalendarDays size={14} /> {dateLabel}
                  </div>
                  {dateMatches.map(match => (
                    <div key={match.id} className={`border rounded-2xl p-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4 ${getMatchTone(match)}`}>
                      <TeamSide team={match.homeTeam} align="right" />
                      <div className="min-w-[10rem] text-center">
                        {match.status === 'PRE' ? (
                          <>
                            <p className="text-3xl font-black tabular-nums">{formatKickoff(match.startTime)}</p>
                            <p className="text-[10px] text-white/35 font-black uppercase tracking-widest mt-1">{match.league}</p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-center gap-3">
                              <span className={`text-5xl font-black tabular-nums ${match.homeTeam.winner ? 'text-green-300' : ''}`}>{match.homeTeam.score}</span>
                              <span className="text-xl text-white/20">-</span>
                              <span className={`text-5xl font-black tabular-nums ${match.awayTeam.winner ? 'text-green-300' : ''}`}>{match.awayTeam.score}</span>
                            </div>
                            <p className={`text-[10px] font-black uppercase tracking-widest mt-2 ${match.status === 'IN' ? 'text-red-300 animate-pulse' : 'text-white/35'}`}>
                              {getStatusLabel(match)}
                            </p>
                          </>
                        )}
                        {match.venue && <p className="text-[10px] text-white/25 font-bold truncate mt-2 max-w-[12rem]">{match.venue}</p>}
                      </div>
                      <TeamSide team={match.awayTeam} align="left" />
                    </div>
                  ))}
                </section>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-20 opacity-25">
                <Trophy size={80} />
                <p className="text-xl font-bold uppercase tracking-widest mt-4">No tracked matches</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 grid grid-cols-[minmax(0,1fr)_minmax(22rem,0.75fr)] gap-5">
          <div className="min-h-0 overflow-y-auto pr-2 scrollbar-hide space-y-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 space-y-4">
              <div className="flex items-center gap-3 text-white/70">
                <Settings2 size={20} />
                <h3 className="text-lg font-black">Tracked Teams</h3>
              </div>
              <div className="space-y-3">
                {groupedTeams.length ? groupedTeams.map(sport => (
                  <section key={sport.key} className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/25">{sport.label}</p>
                    <div className="space-y-3">
                      {sport.teams.map(teamGroup => (
                        <div key={teamGroup.key} className="rounded-2xl bg-black/20 border border-white/5 p-3 space-y-3">
                          <div className="flex items-center gap-3">
                            {teamGroup.logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={teamGroup.logo} alt="" className="size-10 object-contain shrink-0" />
                            ) : (
                              <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20"><Trophy size={18} /></div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-black truncate">{teamGroup.shortName || teamGroup.name}</p>
                              {teamGroup.shortName && teamGroup.shortName !== teamGroup.name && (
                                <p className="text-[10px] uppercase tracking-widest text-white/25 truncate">{teamGroup.name}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 pl-[3.25rem]">
                            {teamGroup.teams
                              .slice()
                              .sort((a, b) => getTeamLeagueLabel(a).localeCompare(getTeamLeagueLabel(b)))
                              .map(team => (
                                <div key={getTeamKey(team)} className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/10 py-1.5 pl-3 pr-1.5">
                                  <span className="max-w-[11rem] truncate text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{getTeamLeagueLabel(team)}</span>
                                  <button onPointerDown={() => removeTeam(team)} className="size-7 rounded-lg bg-red-500/10 text-red-300/80 border border-red-500/15 flex items-center justify-center active:scale-90 transition-all">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )) : (
                  <p className="text-white/30 font-bold py-8 text-center">Add teams to start tracking fixtures and scores.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 space-y-4">
              <h3 className="text-lg font-black text-white/70">Leagues</h3>
              <div className="grid grid-cols-2 gap-3">
                {leaguePresets.map(league => {
                  const active = config?.leagues.some(item => getLeagueKey(item) === getLeagueKey(league));
                  return (
                    <button
                      key={getLeagueKey(league)}
                      onPointerDown={() => toggleLeague(league)}
                      className={`rounded-2xl border p-4 text-left active:scale-[0.98] transition-all ${active ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-white/50'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-black leading-tight">{league.name}</span>
                        {active && <Check size={18} strokeWidth={4} />}
                      </div>
                      <p className={`text-[10px] uppercase tracking-widest mt-1 ${active ? 'text-black/40' : 'text-white/25'}`}>{getSportLabel(league.sport)}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto scrollbar-hide space-y-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 space-y-4">
              <div className="flex items-center gap-3 text-white/70">
                <Search size={20} />
                <h3 className="text-lg font-black">Add Team</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="relative">
                  <select
                    value={selectedLeague}
                    onChange={event => setSelectedLeague(event.target.value)}
                    className="w-full appearance-none bg-black/40 border border-white/10 rounded-xl py-3 pl-3 pr-12 text-white font-bold"
                  >
                    {leaguePresets.map(league => (
                      <option key={getLeagueKey(league)} value={getLeagueKey(league)}>{league.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/35" />
                </div>
                <button
                  onPointerDown={() => setShowKeyboard(true)}
                  className="w-full min-h-12 rounded-xl bg-black/30 border border-white/10 p-3 text-left text-white/80 font-bold active:scale-[0.98] transition-all"
                >
                  {query || <span className="text-white/25">Search team name</span>}
                </button>
              </div>

              <div className="space-y-3">
                {searching && <p className="text-white/30 font-bold py-4 text-center">Searching...</p>}
                {!query.trim() && <p className="text-white/30 font-bold py-4 text-center">Search a team in the selected league.</p>}
                {!searching && query.trim() && results.map(team => (
                  <button
                    key={`${team.sport}:${team.leagueId}:${team.id || team.name}`}
                    onPointerDown={() => addTeam(team)}
                    className="w-full flex items-center gap-3 rounded-2xl bg-black/20 border border-white/5 p-3 text-left active:scale-[0.98] transition-all"
                  >
                    {team.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={team.logo} alt="" className="size-11 object-contain shrink-0" />
                    ) : (
                      <div className="size-11 rounded-xl bg-white/5 flex items-center justify-center text-white/20"><Trophy size={18} /></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-black truncate">{team.name}</p>
                      <p className="text-[10px] uppercase tracking-widest text-white/25">{team.leagueName}</p>
                    </div>
                    <Plus size={20} className="text-blue-300" />
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 space-y-4">
              <div className="flex items-center gap-3 text-white/70">
                <Clock size={20} />
                <h3 className="text-lg font-black">Window</h3>
              </div>
              <RangeStepper label="Past Days" value={config?.daysBack || 0} onMinus={() => saveConfig(ranges(config, 'daysBack', -1))} onPlus={() => saveConfig(ranges(config, 'daysBack', 1))} />
              <RangeStepper label="Future Days" value={config?.daysAhead || 0} onMinus={() => saveConfig(ranges(config, 'daysAhead', -1))} onPlus={() => saveConfig(ranges(config, 'daysAhead', 1))} />
            </div>
          </div>
        </div>
      )}

      {showKeyboard && (
        <OnScreenKeyboard
          value={query}
          onChange={setQuery}
          onClose={() => setShowKeyboard(false)}
          onSubmit={() => setShowKeyboard(false)}
        />
      )}
    </motion.div>
  );
}

function TeamSide({ team, align }: { team: SportMatch['homeTeam']; align: 'left' | 'right' }) {
  return (
    <div className={`min-w-0 flex items-center gap-4 ${align === 'right' ? 'justify-end' : ''}`}>
      {align === 'right' && (
        <div className="text-right min-w-0">
          <p className="text-xl font-black leading-tight truncate">{team.shortName || team.name}</p>
          <p className="text-[10px] uppercase tracking-widest text-white/25 truncate">{team.name}</p>
        </div>
      )}
      {team.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo} alt="" className="size-14 object-contain shrink-0" />
      ) : (
        <div className="size-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 shrink-0"><Trophy size={22} /></div>
      )}
      {align === 'left' && (
        <div className="text-left min-w-0">
          <p className="text-xl font-black leading-tight truncate">{team.shortName || team.name}</p>
          <p className="text-[10px] uppercase tracking-widest text-white/25 truncate">{team.name}</p>
        </div>
      )}
    </div>
  );
}

function RangeStepper({ label, value, onMinus, onPlus }: { label: string; value: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 rounded-2xl bg-black/20 p-2 border border-white/5">
      <button onPointerDown={onMinus} className="size-10 rounded-xl bg-white/5 active:scale-90 transition-all flex items-center justify-center text-xl font-black">-</button>
      <div className="text-center">
        <div className="text-2xl font-black tabular-nums leading-none">{value}</div>
        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/30 mt-1">{label}</div>
      </div>
      <button onPointerDown={onPlus} className="size-10 rounded-xl bg-white/5 active:scale-90 transition-all flex items-center justify-center text-xl font-black">+</button>
    </div>
  );
}

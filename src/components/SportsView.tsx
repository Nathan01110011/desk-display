import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Trophy,
} from "lucide-react";
import {
  SportLeagueConfig,
  SportMatch,
  SportsConfig,
  SportTeamConfig,
  SportTeamSearchResult,
} from "@/types";
import { OnScreenKeyboard } from "./OnScreenKeyboard";

interface SportsViewProps {
  matches: SportMatch[];
  loading?: boolean;
  onRefresh?: () => void;
  onClose: () => void;
}

function formatMatchDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (date.getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  if (diffDays === -1) return "Yesterday";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatKickoff(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getLeagueKey(league: SportLeagueConfig) {
  return `${league.sport}:${league.id}`;
}

function getTeamKey(team: SportTeamConfig) {
  return `${team.sport || "any"}:${team.leagueId || "any"}:${team.id || team.name}`.toLowerCase();
}

function getTeamGroupKey(team: SportTeamConfig) {
  return `${team.sport || "any"}:${team.id || team.name}`.toLowerCase();
}

function getSportLabel(sport?: SportLeagueConfig["sport"]) {
  if (sport === "football") return "NFL";
  if (sport === "rugby") return "Rugby";
  if (sport === "soccer") return "Soccer";
  return "Any sport";
}

function getStatusLabel(match: SportMatch) {
  if (match.status === "PRE")
    return `${formatMatchDate(match.startTime)} ${formatKickoff(match.startTime)}`;
  if (match.status === "POST")
    return `Final ${formatMatchDate(match.startTime)}`;
  return match.clock || "Live";
}

function ranges(
  config: SportsConfig | null,
  field: "daysBack" | "daysAhead",
  delta: number,
) {
  if (!config) return null;
  const limit = field === "daysBack" ? 14 : 30;
  const minimum = field === "daysBack" ? 0 : 1;
  return {
    ...config,
    [field]: Math.max(minimum, Math.min(limit, config[field] + delta)),
  };
}

export function SportsView({
  matches,
  loading = false,
  onRefresh,
}: SportsViewProps) {
  const [mode, setMode] = useState<"scores" | "teams">("scores");
  const [config, setConfig] = useState<SportsConfig | null>(null);
  const [leaguePresets, setLeaguePresets] = useState<SportLeagueConfig[]>([]);
  const [selectedLeague, setSelectedLeague] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SportTeamSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);

  const [filter, setFilter] = useState<"all" | SportMatch["status"]>("all");
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [teamTab, setTeamTab] = useState<"clubs" | "leagues">("clubs");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const liveCount = matches.filter((match) => match.status === "IN").length;
  const upcomingCount = matches.filter(
    (match) => match.status === "PRE",
  ).length;
  const completedCount = matches.filter(
    (match) => match.status === "POST",
  ).length;

  const visibleMatches = useMemo(
    () =>
      matches
        .filter((match) => filter === "all" || match.status === filter)
        .slice()
        .sort((a, b) => {
          const priority = { IN: 0, PRE: 1, POST: 2 };
          return (
            priority[a.status] - priority[b.status] ||
            (a.status === "POST"
              ? Date.parse(b.startTime) - Date.parse(a.startTime)
              : Date.parse(a.startTime) - Date.parse(b.startTime))
          );
        }),
    [matches, filter],
  );
  const featured =
    visibleMatches.find((match) => match.id === selectedMatch) ??
    visibleMatches[0];

  const groupedTeams = useMemo(() => {
    if (!config) return [];

    const sports = new Map<
      string,
      {
        key: string;
        label: string;
        teams: Map<
          string,
          {
            key: string;
            name: string;
            shortName?: string;
            logo?: string;
            teams: SportTeamConfig[];
          }
        >;
      }
    >();

    config.teams.forEach((team) => {
      const sportKey = team.sport || "any";
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

      teamGroup.name =
        teamGroup.name.length <= team.name.length ? teamGroup.name : team.name;
      teamGroup.shortName ||= team.shortName;
      teamGroup.logo ||= team.logo;
      teamGroup.teams.push(team);
      sportGroup.teams.set(teamGroupKey, teamGroup);
      sports.set(sportKey, sportGroup);
    });

    const sportOrder = ["soccer", "rugby", "football", "any"];
    return Array.from(sports.values())
      .sort((a, b) => sportOrder.indexOf(a.key) - sportOrder.indexOf(b.key))
      .map((sport) => ({
        ...sport,
        teams: Array.from(sport.teams.values()).sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      }));
  }, [config]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch("/api/sports/config");
        if (!res.ok) throw new Error("Could not load sports settings.");
        const data = await res.json();
        setConfig(data.config);
        setLeaguePresets(data.leaguePresets);
        const firstLeague = data.config.leagues[0] || data.leaguePresets[0];
        setSelectedLeague(firstLeague ? getLeagueKey(firstLeague) : "");
      } catch (e) {
        console.error("Failed to load sports config", e);
        setError("Could not load tracking settings. Reopen Sports to retry.");
      }
    };

    loadConfig();
  }, []);

  useEffect(() => {
    if (!query.trim() || !selectedLeague) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setSearching(true);
        const res = await fetch(
          `/api/sports/teams?q=${encodeURIComponent(query)}&league=${encodeURIComponent(selectedLeague)}`,
          { signal: controller.signal },
        );
        const data = res.ok ? await res.json() : [];
        if (!controller.signal.aborted) setResults(data);
      } catch (e) {
        if (!controller.signal.aborted)
          console.error("Failed to search teams", e);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, selectedLeague]);

  const saveConfig = async (nextConfig: SportsConfig | null) => {
    if (!nextConfig || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/sports/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextConfig),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      setConfig(data.config);
      onRefresh?.();
    } catch {
      setError("Could not save tracking settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getTeamLeagueLabel = (team: SportTeamConfig) => {
    const league = leaguePresets.find(
      (item) => item.sport === team.sport && item.id === team.leagueId,
    );
    return league?.name || team.leagueName || getSportLabel(team.sport);
  };

  const toggleLeague = (league: SportLeagueConfig) => {
    if (!config) return;
    const key = getLeagueKey(league);
    const isActive = config.leagues.some((item) => getLeagueKey(item) === key);
    const leagues = isActive
      ? config.leagues.filter((item) => getLeagueKey(item) !== key)
      : [...config.leagues, league];

    saveConfig({ ...config, leagues });
    setSelectedLeague(key);
  };

  const addTeam = (team: SportTeamConfig) => {
    if (!config) return;
    const teamKey = getTeamKey(team);
    const exists = config.teams.some((item) => getTeamKey(item) === teamKey);
    if (exists) return;
    saveConfig({ ...config, teams: [...config.teams, team] });
    setQuery("");
    setResults([]);
    setSearching(false);
  };

  const removeTeam = (team: SportTeamConfig) => {
    if (!config) return;
    const teamKey = getTeamKey(team);
    saveConfig({
      ...config,
      teams: config.teams.filter((item) => getTeamKey(item) !== teamKey),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex h-full min-h-0 w-full flex-col gap-4 text-white"
    >
      <header className="flex shrink-0 items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">
            <Trophy size={16} /> Your sports desk
          </p>
          <h2 className="mt-1 text-3xl font-black tracking-tight">
            {mode === "scores" ? "Match centre" : "Your teams & leagues"}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-2xl border border-white/15 bg-white/5 p-1">
            {(["scores", "teams"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                aria-pressed={mode === tab}
                onClick={() => setMode(tab)}
                className={`min-h-11 rounded-xl px-5 text-sm font-bold transition-colors ${mode === tab ? "bg-emerald-200 text-emerald-950" : "text-white/75 hover:bg-white/10"}`}
              >
                {tab === "scores" ? "Scores" : "Teams"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || !onRefresh}
            aria-label="Refresh sports scores"
            className="flex size-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-emerald-100 disabled:opacity-40"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>
      {error && (
        <p
          role="alert"
          className="shrink-0 rounded-xl border border-red-300/20 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-200"
        >
          {error}
        </p>
      )}
      {mode === "scores" ? (
        <>
          <div className="flex shrink-0 gap-2">
            {(
              [
                ["all", "All matches", matches.length],
                ["IN", "Live", liveCount],
                ["PRE", "Upcoming", upcomingCount],
                ["POST", "Finals", completedCount],
              ] as const
            ).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={`flex min-h-11 items-center gap-3 rounded-xl border px-4 text-sm font-bold ${filter === value ? "border-emerald-200/30 bg-emerald-200/15 text-emerald-100" : "border-white/10 bg-white/5 text-white/75"}`}
              >
                {value === "IN" && (
                  <span className="size-2 rounded-full bg-rose-400" />
                )}
                {label}
                <span className="rounded-md bg-black/20 px-2 py-0.5 tabular-nums">
                  {count}
                </span>
              </button>
            ))}
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] gap-4">
            {featured ? (
              <FeaturedMatch match={featured} />
            ) : (
              <section className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-emerald-200/15 bg-gradient-to-br from-emerald-950 to-neutral-950 p-6 text-center">
                <Trophy size={48} className="text-emerald-200" />
                <h3 className="text-2xl font-black">
                  {loading
                    ? "Loading matches…"
                    : filter === "all"
                      ? "Your match centre awaits"
                      : "No matches in this view"}
                </h3>
                <p className="max-w-xs text-sm leading-relaxed text-emerald-100/75">
                  {filter === "all"
                    ? "Add your teams and leagues to follow their fixtures and results."
                    : "Choose another filter to see the rest of your fixtures."}
                </p>
                {filter === "all" && (
                  <button
                    type="button"
                    onClick={() => setMode("teams")}
                    className="min-h-11 rounded-xl bg-emerald-200 px-5 font-bold text-emerald-950"
                  >
                    Manage teams
                  </button>
                )}
              </section>
            )}
            <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/70">
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
                  Fixtures & results
                </h3>
                <span className="text-xs text-white/65">
                  Tap a match to focus
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 space-y-2">
                {visibleMatches.map((match) => (
                  <button
                    key={match.id}
                    type="button"
                    aria-pressed={featured?.id === match.id}
                    onClick={() => setSelectedMatch(match.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-colors ${featured?.id === match.id ? "border-emerald-200/30 bg-emerald-200/10" : "border-white/5 bg-white/[0.03] hover:bg-white/[0.07]"}`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3 text-xs font-bold">
                      <span className="truncate text-white/65">
                        {match.league} · {formatMatchDate(match.startTime)}
                      </span>
                      <span
                        className={`shrink-0 ${match.status === "IN" ? "text-rose-300" : "text-emerald-100/80"}`}
                      >
                        {match.status === "PRE"
                          ? formatKickoff(match.startTime)
                          : match.status === "IN"
                            ? `Live · ${match.clock || "In play"}`
                            : "Final"}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {[match.homeTeam, match.awayTeam].map((team, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <TeamLogo team={team} className="size-7" />
                          <span
                            className={`min-w-0 flex-1 truncate text-base font-bold ${team.winner ? "text-emerald-200" : "text-white"}`}
                          >
                            {team.name}
                          </span>
                          <span className="text-xl font-black tabular-nums">
                            {match.status === "PRE" ? "—" : team.score || "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
                {!visibleMatches.length && (
                  <p className="p-6 text-center text-white/70">
                    {loading ? "Refreshing fixtures…" : "No fixtures to show."}
                  </p>
                )}
              </div>
            </section>
          </div>
        </>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)] gap-4">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-emerald-200/15 bg-gradient-to-br from-emerald-950/70 to-neutral-950">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 p-4">
              <div className="flex gap-2">
                {(["clubs", "leagues"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTeamTab(tab)}
                    aria-pressed={teamTab === tab}
                    className={`min-h-11 rounded-xl px-4 text-sm font-bold ${teamTab === tab ? "bg-emerald-200 text-emerald-950" : "bg-white/5 text-white/75"}`}
                  >
                    {tab === "clubs" ? "Followed teams" : "Leagues"}
                  </button>
                ))}
              </div>
              <span
                role="status"
                className="text-xs font-bold text-emerald-100/75"
              >
                {saving
                  ? "Saving…"
                  : `${config?.teams.length ?? 0} team subscriptions`}
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-5">
              {!config ? (
                <p className="p-6 text-white/75">
                  {error
                    ? "Tracking settings unavailable."
                    : "Loading tracking settings…"}
                </p>
              ) : teamTab === "clubs" ? (
                groupedTeams.length ? (
                  groupedTeams.map((sport) => (
                    <section key={sport.key}>
                      <h3 className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
                        {sport.label}{" "}
                        <span className="ml-2 text-white/60">
                          {sport.teams.length}
                        </span>
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {sport.teams.map((group) => (
                          <article
                            key={group.key}
                            className="rounded-2xl border border-white/10 bg-white/5 p-4"
                          >
                            <div className="mb-3 flex items-center gap-3">
                              <TeamLogo team={group} className="size-10" />
                              <div className="min-w-0">
                                <h4 className="text-base font-black leading-tight">
                                  {group.name}
                                </h4>
                                {group.shortName &&
                                  group.shortName !== group.name && (
                                    <p className="mt-1 text-xs text-white/65">
                                      {group.shortName}
                                    </p>
                                  )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              {group.teams.map((team) => (
                                <div
                                  key={getTeamKey(team)}
                                  className="flex items-center gap-2 rounded-xl bg-black/20 pl-3"
                                >
                                  <span className="min-w-0 flex-1 text-xs font-bold text-emerald-100/80">
                                    {getTeamLeagueLabel(team)}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => removeTeam(team)}
                                    aria-label={`Stop tracking ${group.name} in ${getTeamLeagueLabel(team)}`}
                                    className="flex size-11 shrink-0 items-center justify-center rounded-xl text-rose-200 hover:bg-rose-400/10 disabled:opacity-40"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <Trophy size={40} className="mx-auto text-emerald-200" />
                    <h3 className="mt-4 text-xl font-black">
                      Build your sports desk
                    </h3>
                    <p className="mt-2 text-sm text-white/75">
                      Find a team in the panel alongside to start following.
                    </p>
                  </div>
                )
              ) : (
                <>
                  <p className="text-sm text-emerald-100/75">
                    Choose which competitions to include in your match feed.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {leaguePresets.map((league) => {
                      const active = config.leagues.some(
                        (item) => getLeagueKey(item) === getLeagueKey(league),
                      );
                      return (
                        <button
                          key={getLeagueKey(league)}
                          type="button"
                          disabled={saving}
                          aria-pressed={active}
                          onClick={() => toggleLeague(league)}
                          className={`min-h-20 rounded-2xl border p-4 text-left disabled:opacity-40 ${active ? "border-emerald-200/35 bg-emerald-200/15" : "border-white/10 bg-white/5"}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-black">{league.name}</span>
                            {active && (
                              <Check
                                size={20}
                                className="shrink-0 text-emerald-200"
                              />
                            )}
                          </div>
                          <p className="mt-2 text-xs font-bold text-white/70">
                            {getSportLabel(league.sport)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </section>
          <div className="flex min-h-0 flex-col gap-4">
            <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/70 p-4">
              <h3 className="mb-3 flex shrink-0 items-center gap-2 text-lg font-black">
                <Search size={20} className="text-emerald-200" /> Find a team
              </h3>
              <div className="shrink-0 space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-white/70">
                    Competition
                  </span>
                  <div className="relative">
                    <select
                      value={selectedLeague}
                      disabled={!config || saving}
                      onChange={(event) => {
                        setSelectedLeague(event.target.value);
                        setResults([]);
                        setSearching(false);
                      }}
                      className="min-h-11 w-full appearance-none rounded-xl border border-white/15 bg-neutral-950 py-3 pl-3 pr-10 text-sm font-bold text-white"
                    >
                      {leaguePresets.map((league) => (
                        <option
                          key={getLeagueKey(league)}
                          value={getLeagueKey(league)}
                        >
                          {league.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={18}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-200"
                    />
                  </div>
                </label>
                <button
                  type="button"
                  disabled={!config}
                  onClick={() => setShowKeyboard(true)}
                  aria-label="Search team name"
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-3 text-left text-sm font-bold"
                >
                  <Search size={18} className="text-emerald-200" />
                  {query || (
                    <span className="text-white/65">Search team name</span>
                  )}
                </button>
              </div>
              <div
                aria-live="polite"
                className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-2"
              >
                {searching ? (
                  <p className="p-4 text-sm text-white/75">Searching…</p>
                ) : !query.trim() ? (
                  <p className="p-4 text-sm leading-relaxed text-white/70">
                    Pick a competition, then search for your club. Teams can be
                    followed in multiple leagues.
                  </p>
                ) : !results.length ? (
                  <p className="p-4 text-sm text-white/75">
                    No teams found. Try a different name or competition.
                  </p>
                ) : (
                  results.map((team) => {
                    const followed = config?.teams.some(
                      (item) => getTeamKey(item) === getTeamKey(team),
                    );
                    return (
                      <button
                        key={getTeamKey(team)}
                        type="button"
                        disabled={saving || followed}
                        onClick={() => addTeam(team)}
                        aria-label={
                          followed
                            ? `${team.name} already followed`
                            : `Follow ${team.name}`
                        }
                        className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left disabled:opacity-60"
                      >
                        <TeamLogo team={team} className="size-9" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black">{team.name}</p>
                          <p className="mt-1 text-xs text-white/65">
                            {team.leagueName}
                          </p>
                        </div>
                        {followed ? (
                          <Check size={20} className="text-emerald-200" />
                        ) : (
                          <Plus size={20} className="text-emerald-200" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </section>
            <section className="shrink-0 rounded-3xl border border-white/10 bg-neutral-900/70 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
                <Clock size={16} /> Fixture window
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <RangeStepper
                  label="Past days"
                  value={config?.daysBack ?? 0}
                  min={0}
                  max={14}
                  disabled={!config || saving}
                  onMinus={() => saveConfig(ranges(config, "daysBack", -1))}
                  onPlus={() => saveConfig(ranges(config, "daysBack", 1))}
                />
                <RangeStepper
                  label="Ahead"
                  value={config?.daysAhead ?? 0}
                  min={1}
                  max={30}
                  disabled={!config || saving}
                  onMinus={() => saveConfig(ranges(config, "daysAhead", -1))}
                  onPlus={() => saveConfig(ranges(config, "daysAhead", 1))}
                />
              </div>
            </section>
          </div>
        </div>
      )}
      {showKeyboard && (
        <OnScreenKeyboard
          value={query}
          onChange={(value) => {
            setQuery(value);
            setResults([]);
            setSearching(false);
          }}
          onClose={() => setShowKeyboard(false)}
          onSubmit={() => setShowKeyboard(false)}
        />
      )}
    </motion.div>
  );
}

function TeamLogo({
  team,
  className,
}: {
  team: { logo?: string; name: string };
  className: string;
}) {
  return team.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={team.logo}
      alt=""
      className={`shrink-0 object-contain ${className}`}
    />
  ) : (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-100 ${className}`}
    >
      <Trophy size={20} />
    </div>
  );
}

function FeaturedMatch({ match }: { match: SportMatch }) {
  return (
    <section className="flex min-h-0 flex-col justify-between overflow-hidden rounded-3xl border border-emerald-200/20 bg-gradient-to-br from-emerald-800/70 via-emerald-950 to-neutral-950 p-6">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
            Match spotlight
          </p>
          <p className="mt-2 text-lg font-bold">{match.league}</p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-black ${match.status === "IN" ? "border-rose-200/30 bg-rose-400/15 text-rose-200" : "border-white/20 bg-white/10 text-emerald-100"}`}
        >
          {match.status === "IN"
            ? "LIVE"
            : match.status === "POST"
              ? "FINAL"
              : "UPCOMING"}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-5 py-4">
        {[match.homeTeam, match.awayTeam].map((team, i) => (
          <div key={i} className="flex items-center gap-4">
            <TeamLogo team={team} className="size-16" />
            <div className="min-w-0 flex-1">
              <p
                className={`text-2xl font-black leading-tight ${team.winner ? "text-emerald-200" : ""}`}
              >
                {team.name}
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-emerald-100/65">
                {i === 0 ? "Home" : "Away"}
              </p>
            </div>
            {match.status !== "PRE" && (
              <p className="text-5xl font-black tabular-nums">
                {team.score || "—"}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="shrink-0 space-y-2 border-t border-emerald-100/15 pt-4">
        <p className="flex items-center gap-2 text-xl font-black">
          <CalendarDays size={20} className="text-emerald-200" />
          {getStatusLabel(match)}
        </p>
        {match.detail && (
          <p className="text-sm font-bold text-emerald-100/80">
            {match.detail}
          </p>
        )}
        {match.venue && (
          <p className="flex items-center gap-2 text-sm text-emerald-100/75">
            <MapPin size={16} className="shrink-0" />
            {match.venue}
          </p>
        )}
        <p className="text-xs text-emerald-100/60">
          {match.status === "PRE"
            ? "Kickoff in your display’s local time"
            : `${formatMatchDate(match.startTime)} · ${formatKickoff(match.startTime)}`}
        </p>
      </div>
    </section>
  );
}

function RangeStepper({
  label,
  value,
  min,
  max,
  disabled,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-2">
      <p className="mb-2 text-center text-xs font-bold text-white/75">
        {label}
      </p>
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={disabled || value <= min}
          onClick={onMinus}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl font-black disabled:opacity-30"
        >
          −
        </button>
        <span className="text-2xl font-black tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={disabled || value >= max}
          onClick={onPlus}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl font-black disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}

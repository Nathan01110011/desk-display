import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, BedDouble, Dumbbell, Flame, Footprints, Heart, TrendingUp, Mountain, Scale, CalendarRange, Droplets } from 'lucide-react';
import { FitbitStats } from '@/types';

interface FitbitViewProps {
  stats: FitbitStats | null;
  loading: boolean;
  onClose: () => void;
}

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
});

function formatHealthDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return shortDateFormatter.format(new Date(year, month - 1, day));
}

function formatWeekday(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return weekdayFormatter.format(new Date(year, month - 1, day));
}

function StatTile({
  icon,
  label,
  value,
  suffix,
  accent,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
  accent: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/5 bg-white/[0.04] p-5 min-h-0 flex flex-col justify-between overflow-hidden">
      <div className={`flex items-center gap-3 ${accent}`}>
        {icon}
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30 truncate">{label}</span>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black tabular-nums text-white/90 leading-none truncate">{value}</span>
          {suffix && <span className="text-sm font-black uppercase tracking-widest text-white/25 shrink-0">{suffix}</span>}
        </div>
        {sublabel && <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/20 truncate">{sublabel}</p>}
      </div>
    </div>
  );
}

function formatSleepDuration(minutes: number) {
  if (!minutes) return '--';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function ExerciseDaysTile({
  history,
}: {
  history: FitbitStats['exerciseHistory'];
}) {
  return (
    <div className="rounded-3xl border border-white/5 bg-white/[0.04] p-5 min-h-0 flex flex-col justify-between overflow-hidden">
      <div className="flex items-center gap-3 text-lime-200/70">
        <Dumbbell size={24} />
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30 truncate">Exercise</span>
      </div>

      <div>
        <div className="grid grid-cols-7 gap-1.5">
          {history.map(day => (
            <div key={day.date} className="flex flex-col items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${day.exercised ? 'bg-lime-300 shadow-[0_0_12px_rgba(190,242,100,0.6)]' : 'bg-white/10'}`} />
              <span className="text-sm font-black uppercase text-white/55 leading-none">{formatWeekday(day.date).slice(0, 1)}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/20 truncate">Last 7 days</p>
      </div>
    </div>
  );
}

export function FitbitView({ stats, loading }: FitbitViewProps) {
  const weightGraph = useMemo(() => {
    const history = [...(stats?.weightHistory || [])].sort((a, b) => a.date.localeCompare(b.date));
    const values = history.map(point => point.weightKg);
    const minValue = values.length ? Math.min(...values) : 0;
    const maxValue = values.length ? Math.max(...values) : 0;
    const rangePadding = Math.max(0.6, (maxValue - minValue) * 0.35);
    const chartMin = Math.max(0, minValue - rangePadding);
    const chartMax = maxValue + rangePadding;
    const chartRange = Math.max(1, chartMax - chartMin);
    const width = 900;
    const height = 360;
    const left = 56;
    const right = 28;
    const top = 28;
    const bottom = 54;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;

    const points = history.map((point, index) => {
      const x = history.length === 1 ? left + plotWidth : left + (plotWidth * index) / (history.length - 1);
      const y = top + plotHeight - ((point.weightKg - chartMin) / chartRange) * plotHeight;
      return { ...point, x, y };
    });

    const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const area = points.length > 0
      ? `${line} L ${points[points.length - 1].x} ${height - bottom} L ${points[0].x} ${height - bottom} Z`
      : '';
    const labels = [chartMax, chartMin + chartRange / 2, chartMin].map(value => Math.round(value * 10) / 10);

    return {
      history,
      latest: history[history.length - 1],
      delta: history.length > 1 ? history[history.length - 1].weightKg - history[0].weightKg : 0,
      width,
      height,
      top,
      bottom,
      left,
      plotWidth,
      points,
      line,
      area,
      labels,
    };
  }, [stats]);

  if (loading && !stats) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-6 opacity-20">
        <Activity size={80} className="animate-pulse" />
        <p className="text-xl font-bold uppercase tracking-widest">Loading Health...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-6 opacity-20">
        <Activity size={80} />
        <p className="text-xl font-bold uppercase tracking-widest text-red-500">Health Error</p>
        <p className="text-sm">Check your Google Health token</p>
      </div>
    );
  }

  const stepProgress = Math.min(100, (stats.steps / stats.stepGoal) * 100);
  const latestWeight = weightGraph.latest?.weightKg;
  const weightDelta = weightGraph.delta;
  const hasWeightHistory = weightGraph.points.length > 0;
  const exerciseHistory = stats.exerciseHistory || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="w-full h-full flex flex-col gap-6"
    >
      <header className="shrink-0 flex items-end justify-between gap-8 pr-24">
        <div className="min-w-0">
          <div className="flex items-center gap-3 text-white/30 font-bold uppercase tracking-[0.3em] text-xs">
            <Activity size={18} /> Google Health
          </div>
          <h2 className="mt-3 text-6xl font-black tracking-tight leading-none">Health</h2>
        </div>

        <div className="text-right">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-white/25">Last synced</p>
          <p className="mt-2 text-2xl font-black text-white/70">
            {new Date(stats.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 grid grid-cols-[minmax(0,1fr)_26rem] gap-6 items-stretch">
        <section className="min-h-0 rounded-[2rem] bg-white/[0.04] border border-white/10 p-7 flex flex-col overflow-hidden">
          <div className="shrink-0 flex items-center justify-between gap-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-white/25">Today</p>
              <p className="mt-2 text-3xl font-black text-white/90">Health summary</p>
            </div>
            <Activity size={34} className="text-sky-300/75" />
          </div>

          <div className="mt-7 grid min-h-0 flex-1 grid-cols-4 grid-rows-2 gap-5">
            <StatTile icon={<Footprints size={24} />} label="Steps" value={stats.steps.toLocaleString()} suffix={`/ ${Math.round(stepProgress)}%`} sublabel={`Goal ${stats.stepGoal.toLocaleString()}`} accent="text-sky-200/70" />
            <StatTile icon={<Mountain size={24} />} label="Floors" value={stats.floors.toLocaleString()} suffix={`/ ${stats.floorGoal}`} accent="text-violet-200/70" />
            <StatTile icon={<Flame size={24} />} label="Calories" value={stats.calories.toLocaleString()} accent="text-orange-200/70" />
            <StatTile icon={<TrendingUp size={24} />} label="Active" value={stats.activeMinutes.toLocaleString()} suffix="min" accent="text-emerald-200/70" />
            <StatTile icon={<Heart size={24} />} label="Resting HR" value={stats.restingHeartRate ? stats.restingHeartRate.toLocaleString() : '--'} suffix="BPM" accent="text-rose-200/70" />
            <StatTile icon={<BedDouble size={24} />} label="Sleep" value={formatSleepDuration(stats.sleepMinutes)} accent="text-indigo-200/70" />
            <ExerciseDaysTile history={exerciseHistory} />
            <StatTile icon={<Droplets size={24} />} label="Blood oxygen" value={stats.bloodOxygen ? stats.bloodOxygen.toLocaleString() : '--'} suffix="%" accent="text-cyan-200/70" />
          </div>
        </section>

        <aside className="min-h-0 flex flex-col gap-5 overflow-hidden">
          <div className="rounded-[2rem] bg-white/[0.04] border border-white/10 p-6 shrink-0">
            <div className="flex items-center gap-4">
              <Scale size={30} className="text-teal-300/80" />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-white/25">Current weight</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black tabular-nums">
                    {latestWeight ? latestWeight.toFixed(1) : '--'}
                  </span>
                  <span className="text-sm font-black uppercase tracking-widest text-white/30">kg</span>
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 h-[24rem] rounded-[2rem] bg-white/[0.04] border border-white/10 p-5 flex flex-col">
            <div className="flex items-center justify-between gap-5 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-3 text-teal-200/60">
                  <CalendarRange size={18} />
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/30">Previous fortnight</p>
                </div>
                <p className="mt-2 text-xl font-black text-white/90">Weight trend</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-2xl font-black tabular-nums ${weightDelta > 0 ? 'text-rose-200' : weightDelta < 0 ? 'text-emerald-200' : 'text-white/70'}`}>
                  {hasWeightHistory && weightGraph.points.length > 1 ? `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)}` : '--'}
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">kg</p>
              </div>
            </div>

            <div className="relative mt-4 flex-1 min-h-0">
              {hasWeightHistory ? (
                <svg viewBox={`0 0 ${weightGraph.width} ${weightGraph.height}`} className="h-full w-full overflow-visible" role="img" aria-label="Weight over the previous fortnight">
                  <defs>
                    <linearGradient id="weightArea" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#5eead4" stopOpacity="0.24" />
                      <stop offset="100%" stopColor="#5eead4" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {weightGraph.labels.map((label, index) => {
                    const y = weightGraph.top + ((weightGraph.height - weightGraph.top - weightGraph.bottom) * index) / 2;
                    return (
                      <g key={label}>
                        <line x1={weightGraph.left} x2={weightGraph.left + weightGraph.plotWidth} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                        <text x="0" y={y + 5} fill="rgba(255,255,255,0.28)" fontSize="18" fontWeight="800">
                          {label}
                        </text>
                      </g>
                    );
                  })}
                  <path d={weightGraph.area} fill="url(#weightArea)" />
                  <path d={weightGraph.line} fill="none" stroke="#5eead4" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                  {weightGraph.points.map((point, index) => (
                    <g key={point.date}>
                      <circle cx={point.x} cy={point.y} r="8" fill="#020617" stroke="#99f6e4" strokeWidth="5" />
                      {(index === 0 || index === weightGraph.points.length - 1 || index % 4 === 0) && (
                        <>
                          <text x={point.x} y={weightGraph.height - 24} textAnchor="middle" fill="rgba(255,255,255,0.42)" fontSize="16" fontWeight="900">
                            {formatWeekday(point.date)}
                          </text>
                          <text x={point.x} y={weightGraph.height - 4} textAnchor="middle" fill="rgba(255,255,255,0.22)" fontSize="13" fontWeight="800">
                            {formatHealthDate(point.date)}
                          </text>
                        </>
                      )}
                    </g>
                  ))}
                </svg>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 text-white/25">
                  <Scale size={48} />
                  <p className="mt-4 text-xs font-black uppercase tracking-[0.24em]">No weight data</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white/[0.04] border border-white/10 p-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-white/25">Fortnight range</p>
              <p className="mt-2 text-lg font-black text-white/70">
                {hasWeightHistory ? `${formatHealthDate(weightGraph.points[0].date)} to ${formatHealthDate(weightGraph.points[weightGraph.points.length - 1].date)}` : '--'}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

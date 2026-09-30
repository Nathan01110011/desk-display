import BackButton from './BackButton';
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, BedDouble, Dumbbell, Flame, Footprints, Heart, TrendingUp, Mountain, Scale, Droplets, RefreshCw, Maximize2, Wind } from 'lucide-react';
import { FitbitStats } from '@/types';
import { healthDateKey, weightRangeStart, weightRanges, WeightRange } from '@/lib/healthWeightRange';

interface FitbitViewProps {
  stats: FitbitStats | null;
  loading: boolean;
  onRefresh: () => void;
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
    <div className="rounded-3xl border border-white/15 bg-white/[0.04] min-h-0 grid grid-rows-[minmax(2.5rem,1fr)_3fr] overflow-hidden @container">
      <div className={`flex items-center gap-3 px-4 py-2 bg-white/10 border-b border-white/15 ${accent}`}>
        {icon}
        <h3 className="text-[13px] font-black uppercase tracking-[0.12em] text-white/90">{label}</h3>
      </div>
      <div className="min-w-0 px-4 py-3 flex flex-col justify-center">
        <div className="grid min-w-0 grid-cols-[minmax(0,auto)_auto] items-baseline justify-start gap-1.5 overflow-hidden">
          <span className="min-w-0 whitespace-nowrap text-[clamp(1.4rem,16cqw,2.1rem)] font-black tabular-nums text-white/90 leading-none tracking-normal">
            {value}
          </span>
          {suffix && <span className="min-w-0 whitespace-nowrap text-[clamp(0.6rem,6cqw,0.8rem)] font-black uppercase tracking-normal text-white/65">{suffix}</span>}
        </div>
        {sublabel && <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/60 truncate">{sublabel}</p>}
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

function formatWeightDelta(delta: number) {
  if (delta === 0) return '0.0';
  const sign = delta > 0 ? '+' : '-';
  const absoluteDelta = Math.abs(delta);
  if (absoluteDelta < 0.05) return `${sign}<0.1`;
  return `${sign}${absoluteDelta.toFixed(1)}`;
}

function formatStepSublabel(stats: FitbitStats) {
  const parts = [];
  if (stats.stepGoal) {
    parts.push(`${stats.stepGoalSource === 'configured' ? 'Configured goal' : 'Goal'} ${stats.stepGoal.toLocaleString()}`);
  } else {
    parts.push('No goal exposed by Health');
  }

  if (stats.stepsLastSampleTime) {
    parts.push(`API ${new Date(stats.stepsLastSampleTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
  }

  return parts.join(' · ');
}

function ExerciseDaysTile({
  history,
}: {
  history: FitbitStats['exerciseHistory'];
}) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/[0.04] min-h-0 grid grid-rows-[minmax(2.5rem,1fr)_3fr] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 bg-white/10 border-b border-white/15 text-lime-200">
        <Dumbbell size={24} />
        <h3 className="text-[13px] font-black uppercase tracking-[0.12em] text-white/90">Exercise</h3>
      </div>

      <div className="px-4 py-3 flex flex-col justify-center">
        <div className="grid grid-cols-7 gap-1.5">
          {history.map(day => (
            <div key={day.date} className="flex flex-col items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${day.exercised ? 'bg-lime-300 shadow-[0_0_12px_rgba(190,242,100,0.6)]' : 'bg-white/10'}`} />
              <span className="text-sm font-black uppercase text-white/55 leading-none">{formatWeekday(day.date).slice(0, 1)}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/60 truncate">Last 7 days</p>
      </div>
    </div>
  );
}

export function FitbitView({ stats, loading, onRefresh }: FitbitViewProps) {
  const [detailView, setDetailView] = useState<'overview' | 'weight' | 'stats'>('overview');
  const [weightRange, setWeightRange] = useState<WeightRange>('90days');
  const [chartElement, setChartElement] = useState<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 900, height: 360 });
  useEffect(() => {
    if (!chartElement) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(1, Math.round(entry.contentRect.width));
      const height = Math.max(1, Math.round(entry.contentRect.height));
      setChartSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
    });
    observer.observe(chartElement);
    return () => observer.disconnect();
  }, [chartElement]);
  const rangeLabel = weightRanges.find(range => range.value === weightRange)?.label;
  const weightGraph = useMemo(() => {
    const today = new Date();
    const startDate = healthDateKey(weightRangeStart(today, weightRange));
    const endDate = healthDateKey(today);
    const history = [...(stats?.weightHistory || [])]
      .filter(point => point.date >= startDate && point.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));
    const values = history.map(point => point.weightKg);
    const minValue = values.length ? Math.min(...values) : 0;
    const maxValue = values.length ? Math.max(...values) : 0;
    const rangePadding = Math.max(0.6, (maxValue - minValue) * 0.35);
    const chartMin = Math.max(0, minValue - rangePadding);
    const chartMax = maxValue + rangePadding;
    const chartRange = Math.max(1, chartMax - chartMin);
    const { width, height } = chartSize;
    const left = 44;
    const right = 24;
    const top = 16;
    const bottom = 42;
    const plotWidth = Math.max(1, width - left - right);
    const plotHeight = Math.max(1, height - top - bottom);

    const dateTime = (date: string) => {
      const [year, month, day] = date.split('-').map(Number);
      return Date.UTC(year, month - 1, day);
    };
    const firstTime = history.length ? dateTime(history[0].date) : 0;
    const timeSpan = history.length > 1 ? dateTime(history[history.length - 1].date) - firstTime : 0;
    const labelCount = Math.min(history.length, Math.max(2, Math.min(8, Math.floor(plotWidth / 100))));
    const labelIndices = new Set(Array.from({ length: labelCount }, (_, index) => Math.round(index * (history.length - 1) / Math.max(1, labelCount - 1))));
    const points = history.map(point => {
      const x = timeSpan === 0 ? left + plotWidth : left + plotWidth * (dateTime(point.date) - firstTime) / timeSpan;
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
      labelIndices,
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
  }, [stats, weightRange, chartSize]);

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

  const stepProgress = stats.stepGoal ? Math.min(100, (stats.steps / stats.stepGoal) * 100) : null;
  const latestWeight = [...(stats.weightHistory || [])].sort((a, b) => b.date.localeCompare(a.date))[0]?.weightKg;
  const weightDelta = weightGraph.delta;
  const hasWeightHistory = weightGraph.points.length > 0;
  const exerciseHistory = stats.exerciseHistory || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="w-full h-full min-h-0 flex flex-col gap-4 overflow-hidden"
    >
      <header className="shrink-0 flex items-end justify-between gap-8">
        <div className="min-w-0">
          <div className="flex items-center gap-3 text-white/70 font-bold uppercase tracking-[0.3em] text-xs">
            <Activity size={18} /> Google Health
          </div>
          <div className="mt-2 flex items-center gap-4">
            {detailView !== 'overview' && <BackButton onClick={() => setDetailView('overview')} aria-label="Back to Health overview" />}
            <h2 className="text-4xl font-black tracking-tight leading-none">{detailView === 'weight' ? 'Weight history' : detailView === 'stats' ? 'Detailed stats' : 'Health'}</h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-white/65">Last synced</p>
            <p className="mt-2 text-2xl font-black text-white/70">
              {new Date(stats.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <button
            onPointerDown={onRefresh}
            disabled={loading}
            aria-label="Refresh health data"
            className="size-14 rounded-2xl bg-white/[0.06] border border-white/10 text-white/55 flex items-center justify-center active:scale-90 disabled:opacity-40 disabled:active:scale-100 transition-all"
          >
            <RefreshCw size={24} className={loading ? 'animate-spin text-sky-300' : ''} />
          </button>
        </div>
      </header>

      <div className={`min-h-0 flex-1 grid gap-5 overflow-hidden ${detailView === 'overview' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {detailView !== 'stats' && <aside aria-label="Weight history" className="min-h-0 min-w-0 rounded-[2rem] bg-white/[0.04] border border-white/10 p-5 flex flex-col">
          <div className="-mx-5 -mt-5 px-5 py-3 mb-3 rounded-t-[2rem] bg-white/10 border-b border-white/15 shrink-0 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Scale size={26} className="text-teal-200" />
              <div><h3 className="text-sm font-black uppercase tracking-wider text-white/90">Weight</h3><p className="text-3xl font-black tabular-nums">{latestWeight ? latestWeight.toFixed(1) : '--'} <span className="text-sm text-white/65">kg</span></p></div>
            </div>
            <div className="text-right"><p className="text-xl font-black tabular-nums text-teal-100">{hasWeightHistory && weightGraph.points.length > 1 ? formatWeightDelta(weightDelta) : '--'} kg</p><p className="text-xs text-white/70">Last {rangeLabel}</p></div>
            {detailView === 'overview' && <button type="button" onClick={() => setDetailView('weight')} aria-label="Expand weight chart" className="size-11 shrink-0 rounded-xl bg-white/10 flex items-center justify-center"><Maximize2 size={22} /></button>}
          </div>

          <div className="min-h-0 flex-1 flex flex-col">
            <fieldset className="mt-3 flex gap-2 shrink-0" aria-label="Weight history range">
              {weightRanges.map(range => (
                <button
                  key={range.value}
                  type="button"
                  aria-pressed={weightRange === range.value}
                  onClick={() => setWeightRange(range.value)}
                  className={`min-h-10 flex-1 rounded-xl px-3 text-xs font-black transition-colors ${weightRange === range.value ? 'bg-teal-300/20 text-teal-100 border border-teal-300/40' : 'bg-white/5 text-white/75 border border-white/10 hover:bg-white/10'}`}
                >
                  {range.label}
                </button>
              ))}
            </fieldset>

            <div ref={setChartElement} className="relative mt-3 flex-1 min-h-0">
              {hasWeightHistory ? (
                <svg viewBox={`0 0 ${weightGraph.width} ${weightGraph.height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="img" aria-label={`Weight over the last ${rangeLabel}`}>
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
                        <text x="0" y={y + 5} fill="rgba(255,255,255,0.65)" fontSize="13" fontWeight="800">
                          {label}
                        </text>
                      </g>
                    );
                  })}
                  <path d={weightGraph.area} fill="url(#weightArea)" />
                  <path d={weightGraph.line} fill="none" stroke="#5eead4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  {weightGraph.points.map((point, index) => (
                    <g key={point.date}>
                      <title>{`${formatHealthDate(point.date)}: ${point.weightKg.toFixed(1)} kg`}</title>
                      <circle cx={point.x} cy={point.y} r="3" fill="#020617" stroke="#99f6e4" strokeWidth="2" />
                      {weightGraph.labelIndices.has(index) && (
                        <>
                          <text x={point.x} y={weightGraph.height - 24} textAnchor="middle" fill="rgba(255,255,255,0.42)" fontSize="12" fontWeight="900">
                            {formatWeekday(point.date)}
                          </text>
                          <text x={point.x} y={weightGraph.height - 4} textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize="11" fontWeight="800">
                            {formatHealthDate(point.date)}
                          </text>
                        </>
                      )}
                    </g>
                  ))}
                </svg>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 text-white/65">
                  <Scale size={48} />
                  <p className="mt-4 text-xs font-black uppercase tracking-[0.24em]">{stats.weightHistoryError ? 'Weight data unavailable' : 'No weight data'}</p>
                  {stats.weightHistoryError && <p className="mt-2 px-4 text-center text-xs text-rose-200/70">{stats.weightHistoryError}</p>}
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-white/10 shrink-0">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-white/65">Selected range</p>
              <p className="mt-1 text-sm font-black text-white/70">
                {hasWeightHistory ? `${formatHealthDate(weightGraph.points[0].date)} to ${formatHealthDate(weightGraph.points[weightGraph.points.length - 1].date)}` : '--'}
              </p>
            </div>
          </div>
        </aside>}
        {detailView !== 'weight' && <section aria-label="Health stats" className="min-h-0 flex flex-col gap-3">
          <div className="flex items-center justify-between shrink-0">
            <h3 className="text-sm font-black uppercase tracking-wider text-white/85">{detailView === 'stats' ? 'All health metrics' : 'Daily stats'}</h3>
            {detailView === 'overview' && <button type="button" onClick={() => setDetailView('stats')} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white/90">More stats →</button>}
          </div>
          <div className={`grid min-h-0 flex-1 gap-3 ${detailView === 'stats' ? 'grid-cols-5 grid-rows-2' : 'grid-cols-2 grid-rows-3'}`}>
            <StatTile
              icon={<Footprints size={24} />}
              label="Steps"
              value={stats.steps.toLocaleString()}
              suffix={stepProgress === null ? undefined : `/ ${Math.round(stepProgress)}%`}
              sublabel={formatStepSublabel(stats)}
              accent="text-sky-200/70"
            />
            <StatTile icon={<Flame size={24} />} label="Calories" value={stats.calories.toLocaleString()} accent="text-orange-200/70" />
            <StatTile icon={<TrendingUp size={24} />} label="Active" value={stats.activeMinutes.toLocaleString()} suffix="min" accent="text-emerald-200/70" />
            <StatTile icon={<Heart size={24} />} label="Resting HR" value={stats.restingHeartRate ? stats.restingHeartRate.toLocaleString() : '--'} suffix="BPM" accent="text-rose-200/70" />
            <StatTile icon={<BedDouble size={24} />} label="Sleep" value={formatSleepDuration(stats.sleepMinutes)} accent="text-indigo-200/70" />
            <ExerciseDaysTile history={exerciseHistory} />

            {detailView === 'stats' && <>
              <StatTile icon={<Mountain size={24} />} label="Floors" value={stats.floors.toLocaleString()} suffix={`/ ${stats.floorGoal}`} accent="text-violet-200" />
              <StatTile icon={<Droplets size={24} />} label="Blood oxygen" value={stats.bloodOxygen ? stats.bloodOxygen.toLocaleString() : '--'} suffix="%" accent="text-cyan-200" />
              <StatTile icon={<Heart size={24} />} label="HR variability" value={stats.heartRateVariability?.value?.toFixed(1) ?? '--'} suffix="ms" sublabel={stats.heartRateVariability?.error ? 'Unavailable · refresh to retry' : stats.heartRateVariability?.date ? formatHealthDate(stats.heartRateVariability.date) : 'No recent reading'} accent="text-rose-200" />
              <StatTile icon={<Wind size={24} />} label="Breathing rate" value={stats.respiratoryRate?.value?.toFixed(1) ?? '--'} suffix="/min" sublabel={stats.respiratoryRate?.error ? 'Unavailable · refresh to retry' : stats.respiratoryRate?.date ? formatHealthDate(stats.respiratoryRate.date) : 'No recent reading'} accent="text-sky-200" />
            </>}
          </div>
        </section>}

      </div>
    </motion.div>
  );
}

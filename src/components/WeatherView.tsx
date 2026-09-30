import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, MapPin, Moon, Snowflake, Sun, Sunrise, Sunset } from 'lucide-react';
import type { WeatherData } from '@/types';
import BackButton from './BackButton';

interface WeatherViewProps {
  weather: WeatherData | null;
  onClose: () => void;
  isExtended: boolean;
  onToggleExtended: (val: boolean) => void;
}

type Forecast = WeatherData['forecast'];

function WeatherIcon({ code, className = '' }: { code: string; className?: string }) {
  const kind = code.slice(0, 2);
  const Icon = kind === '01' ? (code.endsWith('n') ? Moon : Sun)
    : kind === '02' ? CloudSun : kind === '03' || kind === '04' ? Cloud
    : kind === '09' ? CloudDrizzle : kind === '10' ? CloudRain
    : kind === '11' ? CloudLightning : kind === '13' ? Snowflake
    : kind === '50' ? CloudFog : CloudSun;
  return <Icon aria-hidden="true" className={className} strokeWidth={1.5} />;
}

function TemperatureTimeline({ hours }: { hours: Forecast }) {
  if (!hours.length) return <p className="p-5 text-white/70">Forecast unavailable.</p>;
  const low = Math.min(...hours.map(hour => hour.temp));
  const high = Math.max(...hours.map(hour => hour.temp));
  const span = Math.max(high - low, 1);
  return (
    <div className="grid min-h-0 flex-1 gap-2" style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))` }}>
      {hours.map((hour, index) => (
        <div key={`${hour.date}-${hour.time}-${index}`} className="flex min-w-0 flex-col items-center justify-between gap-2 rounded-2xl bg-white/[0.04] px-2 py-3">
          <div className="text-center"><p className="text-xs font-bold text-sky-100/65">{hour.date}</p><p className="mt-1 text-sm font-bold tabular-nums">{hour.time}</p></div>
          <WeatherIcon code={hour.icon} className="size-7 shrink-0 text-sky-100" />
          <div className="flex h-12 w-full items-end justify-center"><div className="w-1.5 rounded-full bg-gradient-to-t from-sky-500/35 to-sky-200" style={{ height: `${25 + (hour.temp - low) / span * 75}%` }} /></div>
          <p className="text-2xl font-black tabular-nums">{hour.temp}°</p>
          <p className="w-full truncate text-center text-xs font-medium text-sky-100/75" title={hour.condition}>{hour.condition}</p>
        </div>
      ))}
    </div>
  );
}

export function WeatherView({ weather, isExtended, onToggleExtended }: WeatherViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  if (!weather) return <div role="status" className="flex h-full w-full flex-col items-center justify-center gap-4 text-sky-100"><CloudSun className="size-16 animate-pulse" /><p className="text-xl font-bold">Loading weather…</p></div>;

  const groups: Record<string, Forecast> = {};
  for (const hour of weather.forecast) {
    groups[hour.date] ??= [];
    groups[hour.date].push(hour);
  }
  const days = Object.entries(groups);
  const selected = days.find(([date]) => date === selectedDate) ?? days[0];
  const upcoming = weather.forecast.slice(0, 8);
  const currentHours = days[0]?.[1] ?? [];
  const range = currentHours.length ? { low: Math.min(...currentHours.map(hour => hour.temp)), high: Math.max(...currentHours.map(hour => hour.temp)) } : null;
  const openDay = (date: string) => { setSelectedDate(date); onToggleExtended(true); };
  const night = weather.icon.endsWith('n');

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex h-full min-h-0 w-full flex-col gap-4 text-white">
      <header className="flex shrink-0 items-center justify-between gap-4">
        <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-sky-200"><MapPin size={16} />{weather.location}</p><h2 className="mt-1 text-3xl font-black tracking-tight">{isExtended ? 'Forecast explorer' : 'Weather'}</h2></div>
        {isExtended ? <BackButton onClick={() => onToggleExtended(false)} aria-label="Back to weather overview" /> : <button type="button" onClick={() => { setSelectedDate(days[0]?.[0] ?? null); onToggleExtended(true); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-200/20 bg-sky-200/10 px-4 py-2 font-bold text-sky-100 active:bg-sky-200/20">Explore forecast <ArrowUpRight size={20} /></button>}
      </header>

      {isExtended ? (
        <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-3xl border border-sky-200/15 bg-gradient-to-br from-sky-950/80 to-slate-950 p-5">
          <fieldset aria-label="Forecast day" className="flex shrink-0 flex-wrap gap-2">{days.map(([date, hours]) => <button key={date} type="button" onClick={() => setSelectedDate(date)} aria-pressed={selected?.[0] === date} className={`min-h-14 flex-1 rounded-2xl border px-3 py-2 text-left transition-colors ${selected?.[0] === date ? 'border-sky-200/40 bg-sky-200 text-slate-950' : 'border-white/10 bg-white/5 text-sky-100'}`}><span className="block text-sm font-black">{date}</span><span className="mt-1 block text-xs font-bold">{Math.max(...hours.map(hour => hour.temp))}° / {Math.min(...hours.map(hour => hour.temp))}°</span></button>)}</fieldset>
          <div className="flex shrink-0 items-end justify-between gap-3"><h3 className="text-2xl font-black">{selected?.[0] ?? 'Forecast'}</h3><p className="text-xs font-medium text-sky-100/70">Three-hour intervals · °{weather.unit ?? 'C'}</p></div>
          <TemperatureTimeline hours={selected?.[1] ?? []} />
          <p className="shrink-0 text-xs text-sky-100/65">Highs and lows reflect the forecast intervals shown.</p>
        </section>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_minmax(0,0.85fr)] gap-4">
          <section className={`relative flex min-h-0 flex-col justify-between overflow-hidden rounded-3xl border border-sky-200/20 p-5 ${night ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950' : 'bg-gradient-to-br from-sky-800 via-sky-950 to-slate-950'}`}>
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-sky-200/10 blur-3xl" />
            <div className="flex min-h-0 flex-1 items-center justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-100/75">At a glance</p><p className="mt-2 text-[clamp(3rem,8vw,7rem)] font-black leading-none tracking-tighter tabular-nums">{weather.temp}<span className="text-sky-100/70">°</span></p><p className="mt-2 text-xl font-bold text-sky-50">{weather.condition}</p></div><WeatherIcon code={weather.icon} className="size-24 shrink-0 text-sky-100 drop-shadow-lg" /></div>
            <div className="mt-3 flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-t border-sky-100/15 pt-3 text-sm font-bold text-sky-100"><span>°{weather.unit ?? 'C'}</span>{range && <span>H {range.high}° <span className="ml-2 text-sky-100/70">L {range.low}°</span></span>}{weather.sunrise && <span className="inline-flex items-center gap-2"><Sunrise size={17} />{weather.sunrise}</span>}{weather.sunset && <span className="inline-flex items-center gap-2"><Sunset size={17} />{weather.sunset}</span>}</div>
          </section>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-4"><h3 className="mb-2 shrink-0 text-xs font-black uppercase tracking-[0.2em] text-sky-200">Coming days</h3><div className="grid min-h-0 flex-1 auto-rows-fr gap-1">{days.slice(0, 6).map(([date, hours]) => { const representative = hours[Math.floor(hours.length / 2)]; return <button key={date} type="button" onClick={() => openDay(date)} aria-label={`Explore ${date} forecast`} className="flex min-h-0 items-center gap-3 rounded-xl px-3 text-left hover:bg-white/5 active:bg-white/10"><span className="w-20 shrink-0 text-sm font-bold">{date}</span><WeatherIcon code={representative.icon} className="size-6 shrink-0 text-sky-200" /><span className="min-w-0 flex-1 truncate text-xs text-sky-100/75">{representative.condition}</span><span className="shrink-0 text-lg font-black tabular-nums">{Math.max(...hours.map(hour => hour.temp))}° <span className="ml-2 text-white/60">{Math.min(...hours.map(hour => hour.temp))}°</span></span><ArrowUpRight size={16} className="shrink-0 text-sky-200/70" /></button>; })}{!days.length && <p className="text-white/70">Forecast unavailable.</p>}</div></section>

          <section className="col-span-2 flex min-h-0 flex-col gap-3 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 p-4"><div className="flex shrink-0 items-center justify-between"><h3 className="text-xs font-black uppercase tracking-[0.2em] text-sky-200">Next 24 hours</h3><span className="text-xs text-sky-100/65">Three-hour forecast</span></div><TemperatureTimeline hours={upcoming} /></section>
        </div>
      )}
    </motion.div>
  );
}

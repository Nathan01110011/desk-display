'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { normalizeTimeZone } from '@/lib/timeZones';
import type { AdditionalClock, AnalogClockTheme, FlapboardAnimation, FlapboardMode } from '@/types';

type ClockProps = { now: Date; clocks: AdditionalClock[]; theme: AnalogClockTheme; showWorldClocks: boolean; portrait?: boolean };
const ticks = Array.from({ length: 60 }, (_, i) => i);

function gearPoints(teeth: number, outer: number) {
  return Array.from({ length: teeth * 4 }, (_, i) => {
    const a = i * Math.PI / (teeth * 2);
    const r = i % 4 < 2 ? outer : outer * 0.87;
    return [Math.cos(a) * r, Math.sin(a) * r].join(',');
  }).join(' ');
}

function Gear({ x, y, radius, reverse }: { x: number; y: number; radius: number; reverse?: boolean }) {
  return (
    <g transform={'translate(' + x + ' ' + y + ')'}>
      <g className={reverse ? 'mechanism-reverse' : 'mechanism-forward'} style={{ animationDuration: (radius * 0.38) + 's' }}>
        <polygon points={gearPoints(15, radius)} fill="#8d764e" stroke="#e6c488" strokeWidth="2" />
        <circle r={radius * 0.72} fill="#101210" stroke="#d1ad73" strokeWidth="3" />
        {Array.from({ length: 6 }, (_, i) => <line key={i} x1="0" y1={radius * 0.18} x2="0" y2={radius * 0.65} stroke="#ad9062" strokeWidth="7" transform={'rotate(' + i * 60 + ')'} />)}
        <circle r={radius * 0.15} fill="#e9c487" />
      </g>
    </g>
  );
}


function getZoneParts(clock: Pick<AdditionalClock, 'timeZone' | 'offset'>, now: Date) {
  const zone = normalizeTimeZone(clock.timeZone);
  if (zone) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(now);
    const part = (type: string) => Number(parts.find(value => value.type === type)?.value ?? 0);
    return { hours: part('hour'), minutes: part('minute'), seconds: part('second') + now.getMilliseconds() / 1000 };
  }

  // Legacy world-clock entries may have only a UTC offset. Preserve that fallback,
  // while preferring IANA time zones for correct daylight-saving adjustments.
  const adjusted = new Date(now.getTime() + (now.getTimezoneOffset() * 60 + (clock.offset || 0)) * 1000);
  return { hours: adjusted.getHours(), minutes: adjusted.getMinutes(), seconds: adjusted.getSeconds() + now.getMilliseconds() / 1000 };
}

function MiniAnalogClock({ clock, now, light, accent }: { clock: AdditionalClock; now: Date; light: boolean; accent: string }) {
  const { hours, minutes, seconds } = getZoneParts(clock, now);
  const ink = light ? '#303333' : '#eee9d9';

  return (
    <div className="flex min-w-0 items-center gap-[clamp(8px,1.1vw,18px)]">
      <svg viewBox="0 0 100 100" role="img" aria-label={'Analog clock for ' + clock.label} className="size-[min(11vw,17vh,150px)] shrink-0 overflow-visible">
        <circle cx="50" cy="50" r="47" fill={light ? '#eee9dc' : '#171d1a'} stroke={light ? '#83827b' : '#968261'} strokeWidth="2.5" />
        {Array.from({ length: 12 }, (_, index) => (
          <line key={index} x1="50" y1="8" x2="50" y2={index % 3 === 0 ? 18 : 14} transform={'rotate(' + index * 30 + ' 50 50)'} stroke={ink} strokeWidth={index % 3 === 0 ? 2.5 : 1.3} />
        ))}
        <line x1="50" y1="54" x2="50" y2="27" transform={'rotate(' + (hours % 12 * 30 + minutes / 2) + ' 50 50)'} stroke={ink} strokeWidth="5" strokeLinecap="round" />
        <line x1="50" y1="57" x2="50" y2="17" transform={'rotate(' + (minutes * 6 + seconds / 10) + ' 50 50)'} stroke={ink} strokeWidth="3.2" strokeLinecap="round" />
        <line x1="50" y1="59" x2="50" y2="13" transform={'rotate(' + seconds * 6 + ' 50 50)'} stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="50" cy="50" r="4" fill={accent} />
      </svg>
      <span className="min-w-0 break-words text-[clamp(13px,1.45vw,22px)] font-semibold leading-tight tracking-[0.04em] opacity-85">{clock.label}</span>
    </div>
  );
}

export function AnalogClockScreensaver({ now, clocks, theme, showWorldClocks, portrait = false }: ClockProps) {
  const [live, setLive] = useState(now);
  useEffect(() => {
    const id = window.setInterval(() => setLive(new Date()), 80);
    return () => clearInterval(id);
  }, []);

  const sec = live.getSeconds() + live.getMilliseconds() / 1000;
  const min = live.getMinutes() + sec / 60;
  const hour = live.getHours() % 12 + min / 60;
  const isLight = theme === 'station';
  const accent = theme === 'station' ? '#db4034' : theme === 'orbital' ? '#75e1d0' : theme === 'chronograph' ? '#e57660' : '#dbb77b';
  const ink = isLight ? '#252723' : '#f0eadc';
  const rotate = (a: number) => 'rotate(' + a + ' 300 300)';
  const availableClocks = showWorldClocks ? clocks : [];
  // Keep every configured world clock together in one right-side stack.
  // The left column is reserved exclusively for the date.

  return (
    <div data-screensaver="analog" data-theme={theme} className={'absolute inset-0 overflow-hidden ' + (isLight ? 'bg-[#ddd9ce] text-[#252723]' : 'bg-[#090b0a] text-[#f0eadc]')}>
      <style>{'@keyframes forward{to{transform:rotate(360deg)}}@keyframes backward{to{transform:rotate(-360deg)}}.mechanism-forward,.mechanism-reverse{transform-box:fill-box;transform-origin:center;animation:forward 38s linear infinite}.mechanism-reverse{animation-name:backward}@media(prefers-reduced-motion:reduce){.mechanism-forward,.mechanism-reverse{animation:none}}'}</style>
      {!isLight && <div className="pointer-events-none absolute inset-0" style={{ background: theme === 'orbital' ? 'radial-gradient(ellipse at center,#163832,#070909 75%)' : 'radial-gradient(ellipse at center,#2a251d,#080a09 75%)' }} />}
      <div className={'relative z-10 grid h-full min-h-0 w-full items-center gap-[clamp(8px,1.3vw,22px)] px-[clamp(12px,2vw,34px)] ' + (portrait ? 'grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] py-6' : availableClocks.length > 0 ? 'grid-cols-[minmax(0,1fr)_minmax(0,2.7fr)_minmax(0,1.4fr)]' : 'grid-cols-[minmax(0,1fr)_minmax(0,3.2fr)]')}>
        <aside className={portrait ? 'flex min-w-0 flex-col justify-center text-center' : 'flex min-w-0 flex-col justify-center'}>
          <div className={portrait ? "flex min-w-0 items-baseline justify-center gap-3" : "min-w-0"}>
            <div className="text-[clamp(19px,2.4vw,38px)] font-medium leading-snug opacity-60">{live.toLocaleDateString([], { weekday: 'long' })}</div>
            <div className="text-[clamp(66px,8.1vw,130px)] font-semibold leading-none tracking-[-0.08em] tabular-nums">{live.getDate()}</div>
            <div className="mt-1 text-[clamp(17px,2.3vw,36px)] font-medium leading-snug">{live.toLocaleDateString([], { month: 'long' })}</div>
            <div className="text-[clamp(13px,1.4vw,22px)] font-medium opacity-45">{live.getFullYear()}</div>
          </div>
         </aside>

        <svg viewBox="0 0 600 600" role="img" aria-label={'Analog clock at ' + live.toLocaleTimeString()} className={portrait ? "mx-auto h-auto max-h-full w-[min(86%,75vh)] overflow-visible drop-shadow-[0_20px_50px_rgba(0,0,0,0.4)]" : "mx-auto h-auto max-h-[88vh] w-full max-w-[min(88vh,850px)] overflow-visible drop-shadow-[0_20px_50px_rgba(0,0,0,0.4)]"}>
          <defs>
            <radialGradient id="clock-face"><stop offset="0" stopColor={isLight ? '#fffefa' : '#33312a'} /><stop offset="1" stopColor={isLight ? '#ede9dd' : '#0c100e'} /></radialGradient>
          </defs>
          <circle cx="300" cy="300" r="289" fill={isLight ? '#40413c' : theme === 'orbital' ? '#214743' : '#625036'} />
          <circle cx="300" cy="300" r="277" fill="url(#clock-face)" stroke={isLight ? '#f8f8f1' : '#a58b60'} strokeWidth="4" />
          {theme === 'clockwork' && <g opacity="0.83">
            <Gear x={209} y={213} radius={96} />
            <Gear x={361} y={194} radius={78} reverse />
            <Gear x={402} y={359} radius={110} />
            <Gear x={211} y={414} radius={88} reverse />
            <circle cx="300" cy="300" r="226" fill="none" stroke="#be9b62" strokeWidth="3" />
          </g>}
          {theme === 'orbital' && <g fill="none">
            {[100, 142, 184, 226].map(r => <circle key={r} cx="300" cy="300" r={r} stroke="#537d74" strokeWidth="1.5" opacity="0.6" />)}
            <circle cx="300" cy="300" r="223" stroke="#75e1d0" strokeWidth="9" strokeDasharray="65 1400" strokeLinecap="round" transform={rotate(sec * 6 - 90)} />
            <circle cx="300" cy="300" r="183" stroke="#e4d8bb" strokeWidth="9" strokeDasharray="95 1150" strokeLinecap="round" transform={rotate(min * 6 - 90)} />
            <circle cx="300" cy="300" r="141" stroke="#88b8ad" strokeWidth="9" strokeDasharray="128 900" strokeLinecap="round" transform={rotate(hour * 30 - 90)} />
          </g>}
          {theme === 'chronograph' && <g>
            {[{ x: 196, y: 219, a: sec * 6, label: 'SECONDS' }, { x: 404, y: 219, a: live.getDay() * 360 / 7, label: 'DAY' }, { x: 300, y: 418, a: hour * 30, label: 'HOURS' }].map(d => <g key={d.label}>
              <circle cx={d.x} cy={d.y} r="55" fill="#151817" stroke="#887969" strokeWidth="2" />
              <line x1={d.x} y1={d.y} x2={d.x} y2={d.y - 38} stroke={accent} strokeWidth="3" transform={'rotate(' + d.a + ' ' + d.x + ' ' + d.y + ')'} />
              <circle cx={d.x} cy={d.y} r="5" fill="#eae6d9" />
              <text x={d.x} y={d.y + 23} textAnchor="middle" fill="#d2c9bd" fontSize="10" letterSpacing="2">{d.label}</text>
            </g>)}
          </g>}
          {ticks.map(t => <line key={t} x1="300" y1="42" x2="300" y2={t % 5 === 0 ? '75' : '56'} transform={rotate(t * 6)} stroke={theme === 'orbital' ? '#8bdbca' : ink} strokeWidth={t % 5 === 0 ? 5 : 1.7} opacity="0.9" />)}
          {isLight && <g>{[12, 3, 6, 9].map((n, i) => <text key={n} x={300 + Math.sin(i * Math.PI / 2) * 193} y={312 - Math.cos(i * Math.PI / 2) * 193} fill="#333" fontSize="31" fontWeight="bold" textAnchor="middle">{n}</text>)}</g>}
          <line x1="300" y1="323" x2="300" y2="185" stroke={ink} strokeWidth={isLight ? 16 : 11} strokeLinecap="round" transform={rotate(hour * 30)} />
          <line x1="300" y1="339" x2="300" y2="122" stroke={ink} strokeWidth={isLight ? 11 : 7} strokeLinecap="round" transform={rotate(min * 6)} />
          <line x1="300" y1="348" x2="300" y2="103" stroke={accent} strokeWidth={isLight ? 5 : 3} strokeLinecap="round" transform={rotate(sec * 6)} />
          <circle cx="300" cy="300" r="11" fill={accent} stroke={ink} strokeWidth="3" />
        </svg>

        {availableClocks.length > 0 && <aside data-world-clock-stack="right" className={portrait ? "grid min-h-0 w-full grid-cols-3 gap-2 pb-4" : "flex h-full min-h-0 min-w-0 flex-col justify-center gap-[clamp(8px,1.5vh,22px)] pl-[clamp(0px,0.5vw,10px)]"}>
          {availableClocks.map(clock => <MiniAnalogClock key={clock.id} clock={clock} now={live} light={isLight} accent={accent} />)}
        </aside>}
      </div>
    </div>
  );
}

type BoardClock = { id: string; label: string; timeZone?: string; offset?: number };
type BoardProps = { now: Date; clocks: AdditionalClock[]; mode: FlapboardMode; animation: FlapboardAnimation; intervalSeconds: number; portrait?: boolean };

function zoneDisplay(clock: BoardClock, now: Date) {
  const zone = normalizeTimeZone(clock.timeZone);
  const localDate = !zone && clock.offset !== undefined ? new Date(now.getTime() + now.getTimezoneOffset() * 60000 + clock.offset * 1000) : now;
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, ...(zone ? { timeZone: zone } : {}) }).format(localDate);
}

function FlapGlyph({ char, index, identity, animation, fontSize }: { char: string; index: number; identity: string; animation: FlapboardAnimation; fontSize: string }) {
  const glyph = char === ' ' ? '\u00a0' : char;
  const delay = (animation === 'cascade' ? 0.025 : 0.009) * index;
  return (
    <div className="relative h-full min-h-0 min-w-0 overflow-hidden rounded-[3px] border border-[#4c4d47]/70 bg-[#212422] shadow-[0_5px_8px_rgba(0,0,0,0.3)]" style={{ perspective: 700 }}>
      <div className="absolute inset-0 flex items-center justify-center font-mono font-semibold leading-none text-[#efeddf]" style={{ fontSize }}>{glyph}</div>
      <motion.div
        key={identity + ':' + char}
        initial={{ rotateX: -89, opacity: 0.3 }}
        animate={{ rotateX: 0, opacity: 1 }}
        transition={{ duration: animation === 'cascade' ? 0.45 : 0.25, delay, ease: [0.25, 0.64, 0.35, 1] }}
        style={{ backfaceVisibility: 'hidden', transformOrigin: '50% 50%', fontSize }}
        className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#414640] via-[#343833] to-[#242724] font-mono font-semibold leading-none text-[#f1eee0]"
      >{glyph}</motion.div>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-[2px] bg-black/80 shadow-[0_-1px_1px_rgba(255,255,255,0.25),0_2px_3px_rgba(0,0,0,0.85)]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[2px] bg-black/45" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[2px] bg-black/45" />
    </div>
  );
}

function FlapText({ value, columns, identity, animation, fontSize, tileKind }: {
  value: string; columns: number; identity: string; animation: FlapboardAnimation; fontSize: string; tileKind: 'location' | 'time';
}) {
  const chars = Array.from(value.toUpperCase().slice(0, columns).padEnd(columns, ' '));
  return (
    <div data-flap-role={tileKind} data-flap-value={value} className="grid h-full min-h-0 min-w-0 gap-[clamp(2px,0.25vw,6px)]" style={{ gridTemplateColumns: 'repeat(' + columns + ',minmax(0,1fr))' }}>
      {chars.map((char, index) => <FlapGlyph key={index} char={char} identity={identity + ':' + index} index={index} animation={animation} fontSize={fontSize} />)}
    </div>
  );
}

export function SplitFlapScreensaver({ now, clocks, mode, animation, intervalSeconds, portrait = false }: BoardProps) {
  const [rotation, setRotation] = useState(0);
  // The configured World Clocks are authoritative. Weather location is not the
  // system timezone, so using its name for the device clock mislabels the time.
  // Show one truthful local-time fallback only when no world clocks are set.
  const entries = useMemo<BoardClock[]>(() => clocks.length > 0
    ? clocks.map(clock => ({ id: clock.id, label: clock.label, timeZone: clock.timeZone, offset: clock.offset }))
    : [{ id: 'system-local', label: 'LOCAL TIME' }], [clocks]);

  useEffect(() => {
    if (mode !== 'carousel' || entries.length < 2) return;
    const timer = window.setInterval(() => setRotation(value => value + 1), Math.max(5, intervalSeconds) * 1000);
    return () => clearInterval(timer);
  }, [mode, intervalSeconds, entries.length]);

  // In cycling mode the entire board turns over by one row, so neither side
  // ever becomes a bare text label or leaves an otherwise empty screen.
  const ordered = mode === 'carousel'
    ? entries.map((_, index) => entries[(index + rotation) % entries.length])
    : entries;
  const nameColumns = Math.max(13, Math.min(21, ...entries.map(entry => entry.label.length)));
  const nameFont = portrait ? 'min(5vh,' + (38 / nameColumns).toFixed(2) + 'vw)' : 'min(6vh,' + (78 / nameColumns).toFixed(2) + 'vw)';
  const timeFont = portrait ? 'min(6vh,4vw)' : 'min(7.5vh,6vw)';
  const rows = Math.max(entries.length, 1);

  return (
    <div data-screensaver="flapboard" className="absolute inset-0 overflow-hidden bg-[#0b0e0d] p-[clamp(8px,1.4vw,26px)] text-[#efeddf]">
      <div className="flex h-full w-full flex-col gap-[clamp(5px,0.65vw,12px)]">
        {ordered.map((entry, row) => (
          <div
            key={'row-' + row}
            className="grid min-h-0 flex-1 grid-cols-[minmax(0,67fr)_minmax(0,33fr)] gap-[clamp(10px,1.5vw,26px)] border-b-[clamp(3px,0.35vw,7px)] border-[#343834] bg-[#171a18] p-[clamp(5px,0.65vw,12px)] shadow-[inset_0_3px_10px_rgba(0,0,0,0.6)] last:border-b-0"
            style={{ height: 'calc(100% / ' + rows + ')' }}
          >
            <FlapText tileKind="location" value={entry.label} columns={nameColumns} identity={'row-' + row + '-location'} animation={animation} fontSize={nameFont} />
            <FlapText tileKind="time" value={zoneDisplay(entry, now)} columns={5} identity={'row-' + row + '-time'} animation={animation} fontSize={timeFont} />
          </div>
        ))}
      </div>
    </div>
  );
}

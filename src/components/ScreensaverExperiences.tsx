'use client';

import { useEffect, useState } from 'react';
import { normalizeTimeZone } from '@/lib/timeZones';
import type { AdditionalClock, AnalogClockTheme, SpotifyNowPlaying } from '@/types';
import { ScreensaverNowPlaying } from './ScreensaverNowPlaying';

type ClockProps = { now: Date; clocks: AdditionalClock[]; theme: AnalogClockTheme; showWorldClocks: boolean; spotify: SpotifyNowPlaying | null; portrait?: boolean };
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

function MiniAnalogClock({ clock, now, light, accent, portrait = false }: { clock: AdditionalClock; now: Date; light: boolean; accent: string; portrait?: boolean }) {
  const { hours, minutes, seconds } = getZoneParts(clock, now);
  const ink = light ? '#303333' : '#eee9d9';

  return (
    <div className={portrait ? "flex min-w-0 flex-col items-center justify-center gap-2" : "flex min-w-0 items-center gap-[clamp(8px,1.1vw,18px)]"}>
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
      <span className={portrait ? "max-w-full truncate text-center text-[clamp(13px,1.45vw,22px)] font-semibold leading-tight tracking-[0.04em] opacity-85" : "min-w-0 break-words text-[clamp(13px,1.45vw,22px)] font-semibold leading-tight tracking-[0.04em] opacity-85"}>{clock.label}</span>
    </div>
  );
}

export function AnalogClockScreensaver({ now, clocks, theme, showWorldClocks, spotify, portrait = false }: ClockProps) {
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
          <ScreensaverNowPlaying spotify={spotify} light={isLight} className={portrait ? 'mx-auto mt-3 max-w-[420px]' : 'mt-[clamp(16px,4vh,48px)]'} />
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
          {availableClocks.map(clock => <MiniAnalogClock key={clock.id} clock={clock} now={live} light={isLight} accent={accent} portrait={portrait} />)}
        </aside>}
      </div>
    </div>
  );
}


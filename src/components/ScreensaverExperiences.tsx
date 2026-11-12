'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { normalizeTimeZone } from '@/lib/timeZones';
import type { AdditionalClock, AnalogClockTheme, FlapboardAnimation, FlapboardMode } from '@/types';

type ClockProps = { now: Date; clocks: AdditionalClock[]; theme: AnalogClockTheme; showWorldClocks: boolean };
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

export function AnalogClockScreensaver({ now, clocks, theme, showWorldClocks }: ClockProps) {
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
  const title = { clockwork: 'CLOCKWORK / ATELIER', station: 'STATION / STANDARD TIME', orbital: 'ORBITAL / TIME SYSTEM', chronograph: 'CHRONOGRAPH / INSTRUMENT' }[theme];
  const rotate = (a: number) => 'rotate(' + a + ' 300 300)';

  return (
    <div data-screensaver="analog" data-theme={theme} className={'absolute inset-0 flex flex-col items-center justify-center overflow-hidden ' + (isLight ? 'bg-[#ddd9ce] text-[#252723]' : 'bg-[#090b0a] text-[#f0eadc]')}>
      <style>{'@keyframes forward{to{transform:rotate(360deg)}}@keyframes backward{to{transform:rotate(-360deg)}}.mechanism-forward,.mechanism-reverse{transform-box:fill-box;transform-origin:center;animation:forward 38s linear infinite}.mechanism-reverse{animation-name:backward}@media(prefers-reduced-motion:reduce){.mechanism-forward,.mechanism-reverse{animation:none}}'}</style>
      {!isLight && <div className="pointer-events-none absolute inset-0" style={{ background: theme === 'orbital' ? 'radial-gradient(ellipse at center,#163832,#070909 65%)' : 'radial-gradient(ellipse at center,#2a251d,#080a09 65%)' }} />}
      <div className="relative z-10 flex w-full flex-col items-center gap-[1vh] px-5">
        <p className="text-[clamp(11px,1.2vw,16px)] font-semibold tracking-[0.48em] opacity-60">{title}</p>
        <svg viewBox="0 0 600 600" role="img" aria-label={'Analog clock at ' + live.toLocaleTimeString()} className="h-[min(69vh,75vw)] w-[min(69vh,75vw)] max-h-[740px] max-w-[740px] overflow-visible drop-shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
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
            <text x="300" y="402" textAnchor="middle" fill="#e9d1a4" fontSize="12" letterSpacing="6">AUTOMATIC</text>
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
            <text x="300" y="148" fontSize="12" letterSpacing="5" textAnchor="middle" fill="#e0d6c4">CHRONOGRAPH</text>
          </g>}
          {ticks.map(t => <line key={t} x1="300" y1="42" x2="300" y2={t % 5 === 0 ? '75' : '56'} transform={rotate(t * 6)} stroke={theme === 'orbital' ? '#8bdbca' : ink} strokeWidth={t % 5 === 0 ? 5 : 1.7} opacity="0.9" />)}
          {isLight && <g>
            {[12, 3, 6, 9].map((n, i) => <text key={n} x={300 + Math.sin(i * Math.PI / 2) * 193} y={312 - Math.cos(i * Math.PI / 2) * 193} fill="#333" fontSize="31" fontWeight="bold" textAnchor="middle">{n}</text>)}
            <text x="300" y="197" fill="#555" textAnchor="middle" fontSize="13" letterSpacing="4">STANDARD TIME</text>
          </g>}
          <line x1="300" y1="323" x2="300" y2="185" stroke={ink} strokeWidth={isLight ? 16 : 11} strokeLinecap="round" transform={rotate(hour * 30)} />
          <line x1="300" y1="339" x2="300" y2="122" stroke={ink} strokeWidth={isLight ? 11 : 7} strokeLinecap="round" transform={rotate(min * 6)} />
          <line x1="300" y1="348" x2="300" y2="103" stroke={accent} strokeWidth={isLight ? 5 : 3} strokeLinecap="round" transform={rotate(sec * 6)} />
          <circle cx="300" cy="300" r="11" fill={accent} stroke={ink} strokeWidth="3" />
        </svg>
        <p className="text-[clamp(16px,2vw,27px)] font-medium tracking-[0.15em] opacity-75">{live.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <p className="text-xs uppercase tracking-[0.4em] opacity-45">System local time</p>
        {showWorldClocks && clocks.length > 0 && <div className="mt-3 flex max-w-[92vw] flex-wrap justify-center gap-x-9 gap-y-2 border-t border-current/20 pt-4">
          {clocks.map(clock => <div key={clock.id} className="flex items-baseline gap-2"><span className="text-xs font-bold uppercase tracking-widest opacity-60">{clock.label}</span><span className="text-xl font-bold tabular-nums">{clock.displayTime}</span></div>)}
        </div>}
      </div>
    </div>
  );
}

type BoardClock = { id: string; label: string; timeZone?: string; offset?: number };
type BoardProps = { now: Date; clocks: AdditionalClock[]; mode: FlapboardMode; animation: FlapboardAnimation; intervalSeconds: number };

function zoneDisplay(clock: BoardClock, now: Date) {
  const zone = normalizeTimeZone(clock.timeZone);
  const localDate = !zone && clock.offset !== undefined ? new Date(now.getTime() + now.getTimezoneOffset() * 60000 + clock.offset * 1000) : now;
  return {
    time: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, ...(zone ? { timeZone: zone } : {}) }).format(localDate),
    date: new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', ...(zone ? { timeZone: zone } : {}) }).format(localDate),
  };
}

function FlapGlyph({ char, index, identity, animation, large }: { char: string; index: number; identity: string; animation: FlapboardAnimation; large: boolean }) {
  const font = large ? 'text-[clamp(40px,8vh,88px)]' : 'text-[clamp(22px,4.3vh,48px)]';
  const dimensions = large ? 'h-[clamp(70px,12vh,128px)] w-[clamp(49px,8vw,94px)]' : 'h-[clamp(39px,6.7vh,73px)] w-[clamp(29px,4.8vw,61px)]';
  return <div className={'relative shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#252927] shadow-[0_8px_15px_rgba(0,0,0,0.5)] ' + dimensions} style={{ perspective: 540 }}>
    <div className={'absolute inset-0 flex items-center justify-center font-mono font-semibold leading-none text-[#f2eede] ' + font}>{char === ' ' ? '\u00a0' : char}</div>
    <motion.div key={identity + ':' + char} initial={{ rotateX: -88, opacity: 0.3 }} animate={{ rotateX: 0, opacity: 1 }} transition={{ duration: animation === 'cascade' ? 0.5 : 0.33, delay: index * (animation === 'cascade' ? 0.065 : 0.025), ease: [0.2, 0.65, 0.3, 1] }} style={{ backfaceVisibility: 'hidden' }} className={'absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#3b403d] to-[#1d211f] font-mono font-semibold leading-none text-[#f2eede] ' + font}>{char === ' ' ? '\u00a0' : char}</motion.div>
    <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[2px] bg-black/80 shadow-[0_-1px_1px_rgba(255,255,255,0.18),0_2px_3px_rgba(0,0,0,0.8)]" />
    <div className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-black/30" />
    <div className="pointer-events-none absolute inset-y-0 right-0 w-[3px] bg-black/30" />
  </div>;
}

function FlapText({ text, identity, animation, large = false }: { text: string; identity: string; animation: FlapboardAnimation; large?: boolean }) {
  return <div className="flex min-w-0 justify-center gap-[clamp(2px,0.4vw,6px)]">{text.toUpperCase().split('').map((char, index) => <FlapGlyph key={index} char={char} index={index} identity={identity + ':' + index} animation={animation} large={large} />)}</div>;
}

export function SplitFlapScreensaver({ now, clocks, mode, animation, intervalSeconds }: BoardProps) {
  const [index, setIndex] = useState(0);
  const entries = useMemo<BoardClock[]>(() => [{ id: 'system-local', label: 'LOCAL' }, ...clocks.map(clock => ({ id: clock.id, label: clock.label, timeZone: clock.timeZone, offset: clock.offset }))], [clocks]);
  useEffect(() => {
    if (mode !== 'carousel' || entries.length < 2) return;
    const id = window.setInterval(() => setIndex(i => (i + 1) % entries.length), Math.max(5, intervalSeconds) * 1000);
    return () => clearInterval(id);
  }, [mode, intervalSeconds, entries.length]);
  const current = entries[index % entries.length];
  const active = zoneDisplay(current, now);

  return <div data-screensaver="flapboard" className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#0b0d0d] px-[4vw] py-[4vh] text-[#f2eede]">
    <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at center,#2b2d27 0%,#0b0d0c 72%)' }} />
    <div className="relative flex w-full max-w-[1500px] flex-col rounded-[clamp(12px,2vw,28px)] border border-[#5d5b50]/60 bg-[#151817] px-[clamp(18px,4vw,64px)] py-[clamp(18px,4vh,48px)] shadow-[0_40px_110px_rgba(0,0,0,0.8)]">
      <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-5">
        <div><div className="text-[clamp(11px,1.3vw,16px)] font-black uppercase tracking-[0.35em] text-[#c6b28d]">WORLD TIME / SPLIT-FLAP</div><div className="mt-2 text-xs uppercase tracking-[0.18em] text-[#92988f]">Synced with World Clocks settings</div></div>
        <span className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[#abb09e]">{mode === 'carousel' ? 'AUTO · ' + intervalSeconds + ' SEC' : 'ALL LOCATIONS'}</span>
      </div>
      {mode === 'carousel' ? <div className="flex min-h-[42vh] flex-col items-center justify-center gap-[clamp(14px,3vh,32px)] py-8">
        <div className="max-w-full overflow-hidden"><FlapText text={current.label.slice(0, 13)} identity={current.id + '-name'} animation={animation} /></div>
        <FlapText text={active.time} identity={current.id + '-time'} animation={animation} large />
        <p className="text-center text-[clamp(12px,1.7vw,22px)] font-semibold uppercase tracking-[0.25em] text-[#aaa99d]">{active.date}</p>
      </div> : <div className="flex flex-col gap-[clamp(10px,1.5vh,20px)] py-[clamp(16px,3vh,34px)]">
        {entries.map(entry => <div key={entry.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 border-b border-white/10 pb-[clamp(9px,1.4vh,17px)] last:border-b-0 last:pb-0">
          <span className="min-w-0 truncate text-[clamp(15px,2.2vw,28px)] font-bold uppercase tracking-[0.18em]">{entry.label}</span>
          <FlapText text={zoneDisplay(entry, now).time} identity={entry.id} animation={animation} />
        </div>)}
      </div>}
      <div className="flex items-center justify-between gap-4 border-t border-white/15 pt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#949789]">
        <span>{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        <span>{mode === 'carousel' ? (index % entries.length + 1) + ' / ' + entries.length : entries.length + ' CLOCKS'}</span>
      </div>
    </div>
  </div>;
}

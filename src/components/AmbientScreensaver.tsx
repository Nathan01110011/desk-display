'use client';

import { useEffect, useRef } from 'react';
import { CalendarClock } from 'lucide-react';
import type { AmbientOverlayMode, AmbientPalette, AmbientScreensaverType, SpotifyNowPlaying } from '@/types';
import type { ScreensaverMeetings } from './ScreensaverNextMeeting';
import { ScreensaverNowPlaying } from './ScreensaverNowPlaying';
import { paintAmbient } from '@/lib/ambientEffects';

export interface AmbientScreensaverProps {
  kind: AmbientScreensaverType;
  palette: AmbientPalette;
  overlay: AmbientOverlayMode;
  now: Date;
  spotify: SpotifyNowPlaying | null;
  meetings: ScreensaverMeetings;
  portrait?: boolean;
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function AmbientScreensaver({ kind, palette, overlay, now, spotify, meetings, portrait = false }: AmbientScreensaverProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false;
    let frame = 0;
    let animationFrame = 0;
    let previousTime = -Infinity;
    let width = 1;
    let height = 1;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(bounds.width));
      height = Math.max(1, Math.round(bounds.height));
      // Do not allocate a 4K/Retina canvas on resource-constrained Pi hardware.
      const ratio = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      paintAmbient(ctx, { kind, palette, width, height, time: performance.now() / 1000 * 0.55, frame });
    };

    const draw = (timestamp: number) => {
      if (disposed) return;
      animationFrame = window.requestAnimationFrame(draw);
      if (document.hidden || reducedMotion.matches || timestamp - previousTime < 1000 / 30) return;
      previousTime = timestamp;
      paintAmbient(ctx, { kind, palette, width, height, time: timestamp / 1000 * 0.55, frame: frame++ });
    };

    const handleVisibility = () => {
      if (!document.hidden) previousTime = -Infinity;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    if (!reducedMotion.matches) animationFrame = window.requestAnimationFrame(draw);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [kind, palette]);

  const hasMeetings = Boolean(meetings.now || meetings.later);
  const displayTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const displayDate = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div
      data-screensaver={kind}
      data-ambient-overlay={overlay}
      className="absolute inset-0 h-full w-full overflow-hidden bg-[#020710] text-white"
    >
      {/* Entire screen is the artwork: no lamp silhouette, frame, or border. */}
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block size-full" />
      {overlay !== 'none' && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-[clamp(14px,2.8vw,42px)]">
          <div className={'flex min-w-0 gap-4 ' + (portrait ? 'flex-col items-start' : 'flex-row items-start justify-between')}>
            <div className="max-w-full rounded-2xl border border-white/10 bg-black/35 px-[clamp(16px,2vw,28px)] py-[clamp(10px,1.5vw,18px)] shadow-[0_10px_35px_rgba(0,0,0,0.2)]">
              <time className="block text-[clamp(38px,5vw,86px)] font-extralight leading-none tracking-[-0.065em] tabular-nums" dateTime={now.toISOString()}>{displayTime}</time>
              {overlay === 'full' && <div className="mt-2 text-[clamp(13px,1.1vw,19px)] font-semibold tracking-wide text-white/75">{displayDate}</div>}
            </div>
            {overlay === 'full' && <ScreensaverNowPlaying spotify={spotify} className={portrait ? 'max-w-full' : 'max-w-[min(31vw,440px)]'} />}
          </div>
          {overlay === 'full' && hasMeetings && (
            <div
              data-ambient-meetings
              className={'flex w-full min-w-0 flex-wrap gap-3 ' + (portrait ? 'flex-col' : 'justify-end')}
            >
              {meetings.now && (
                <div className="flex min-w-0 max-w-full items-center gap-2.5 rounded-xl border border-[#9be5c3]/25 bg-black/50 px-4 py-3 shadow-lg">
                  <CalendarClock size={18} aria-hidden="true" className="shrink-0 text-[#9be5c3]" />
                  <span className="shrink-0 rounded bg-[#9be5c3]/20 px-2 py-1 text-[11px] font-black uppercase tracking-wider text-[#9be5c3]">Now</span>
                  <span className="min-w-0 truncate text-sm font-semibold">{meetings.now.summary}</span>
                  <span className="shrink-0 text-xs text-white/70">until {timeLabel(meetings.now.end)}</span>
                </div>
              )}
              {meetings.later && (
                <div className="flex min-w-0 max-w-full items-center gap-2.5 rounded-xl border border-white/15 bg-black/50 px-4 py-3 shadow-lg">
                  <CalendarClock size={18} aria-hidden="true" className="shrink-0 text-white/70" />
                  <span className="shrink-0 rounded bg-white/15 px-2 py-1 text-[11px] font-black uppercase tracking-wider text-white/85">Later</span>
                  <span className="min-w-0 truncate text-sm font-semibold">{meetings.later.summary}</span>
                  <span className="shrink-0 text-xs text-white/70">{timeLabel(meetings.later.start)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

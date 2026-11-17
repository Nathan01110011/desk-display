import { CalendarClock } from 'lucide-react';
import type { CalendarEvent } from '@/types';

export interface ScreensaverMeetings {
  now: CalendarEvent | null;
  later: CalendarEvent | null;
}

// Show one in-progress meeting and the next meeting starting today, independently.
// An ongoing event may have started yesterday; tomorrow's upcoming events are excluded.
export function findScreensaverMeetingsToday(events: CalendarEvent[], now: Date): ScreensaverMeetings {
  const today = now.toDateString();
  const nowMs = now.getTime();
  let current: CalendarEvent | null = null;
  let currentStart = -Infinity;
  let upcoming: CalendarEvent | null = null;
  let upcomingStart = Infinity;

  for (const event of events) {
    if (event.isAllDay) continue;

    const start = new Date(event.start);
    const startMs = start.getTime();
    const endMs = new Date(event.end).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) continue;

    if (startMs <= nowMs && nowMs < endMs && startMs > currentStart) {
      // For overlapping meetings, the most recently started one is most relevant.
      current = event;
      currentStart = startMs;
    } else if (startMs > nowMs && start.toDateString() === today && startMs < upcomingStart) {
      upcoming = event;
      upcomingStart = startMs;
    }
  }

  return { now: current, later: upcoming };
}

function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function countdownTo(start: string, now: Date): string {
  const minutes = Math.max(1, Math.ceil((new Date(start).getTime() - now.getTime()) / 60000));
  return minutes < 60
    ? 'in ' + minutes + 'm'
    : 'in ' + Math.floor(minutes / 60) + 'h' + (minutes % 60 ? ' ' + minutes % 60 + 'm' : '');
}

export function ScreensaverMeetingReminders({
  meetings,
  now,
  light = false,
}: {
  meetings: ScreensaverMeetings;
  now: Date;
  light?: boolean;
}) {
  const { now: active, later } = meetings;
  if (!active && !later) return null;

  const soon = later && new Date(later.start).getTime() - now.getTime() <= 15 * 60000;

  return (
    <div
      data-screensaver-meeting-reminders
      className={(light
        ? 'border-[#b5b2a8] bg-[#ddd9ce] text-[#252723]'
        : 'border-white/10 bg-[#0b0e0d] text-[#f0eadc]') +
        ' relative z-20 w-full shrink-0 border-t px-3 py-2'}
    >
      <div className={'mx-auto grid w-full items-center gap-x-5 gap-y-1.5 ' +
        (active && later ? 'max-w-[60rem] grid-cols-1 sm:grid-cols-2' : 'max-w-[36rem] grid-cols-1')}>
        {active && (
          <div data-meeting-state="now" className="flex h-8 min-w-0 items-center justify-center gap-2">
            <CalendarClock aria-hidden="true" size={16} className="shrink-0 opacity-70" />
            <span className={(light
              ? 'bg-[#2e6556]/15 text-[#245746]'
              : 'bg-[#72d6ae]/15 text-[#9be5c3]') +
              ' shrink-0 rounded-md px-2 py-1 text-[11px] font-black tracking-widest'}>NOW</span>
            <span className="min-w-0 truncate text-sm font-semibold" title={active.summary}>{active.summary}</span>
            <time dateTime={active.end} className="shrink-0 text-xs font-medium tabular-nums opacity-75">
              until {formatClockTime(active.end)}
            </time>
          </div>
        )}
        {later && (
          <div data-meeting-state="later" className="flex h-8 min-w-0 items-center justify-center gap-2">
            {!active && <CalendarClock aria-hidden="true" size={16} className="shrink-0 opacity-70" />}
            <span className={(soon
              ? light ? 'bg-[#ae4536]/10 text-[#972f23]' : 'bg-[#c9874a]/15 text-[#f0b67f]'
              : light ? 'bg-black/5 text-[#52534e]' : 'bg-white/10 text-white/75') +
              ' shrink-0 rounded-md px-2 py-1 text-[11px] font-black tracking-widest'}>LATER</span>
            <span className="min-w-0 truncate text-sm font-semibold" title={later.summary}>{later.summary}</span>
            <time dateTime={later.start} className="shrink-0 text-xs font-medium tabular-nums opacity-75">
              {formatClockTime(later.start)}
            </time>
            <span className={(soon
              ? light ? 'text-[#972f23]' : 'text-[#f0b67f]'
              : 'opacity-75') +
              ' hidden shrink-0 text-xs font-semibold tabular-nums sm:inline'}>
              {countdownTo(later.start, now)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

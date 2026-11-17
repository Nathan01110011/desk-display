import { CalendarClock } from 'lucide-react';
import type { CalendarEvent } from '@/types';

// Only future, timed events starting on the device's current local day belong
// in the next-meeting reminder. The feed may contain all-day or ongoing events.
export function findNextMeetingToday(events: CalendarEvent[], now: Date): CalendarEvent | null {
  const today = now.toDateString();
  let next: CalendarEvent | null = null;
  let nextStart = Infinity;

  for (const event of events) {
    if (event.isAllDay) continue;
    const start = new Date(event.start);
    const end = new Date(event.end);
    const startsAt = start.getTime();

    if (!Number.isFinite(startsAt) || start.toDateString() !== today ||
        startsAt <= now.getTime() || end.getTime() <= startsAt) continue;

    if (startsAt < nextStart) {
      next = event;
      nextStart = startsAt;
    }
  }

  return next;
}

export function ScreensaverNextMeeting({
  meeting,
  now,
  light = false,
}: {
  meeting: CalendarEvent;
  now: Date;
  light?: boolean;
}) {
  const start = new Date(meeting.start);
  const minutes = Math.max(1, Math.ceil((start.getTime() - now.getTime()) / 60000));
  const countdown = minutes < 60
    ? 'in ' + minutes + 'm'
    : 'in ' + Math.floor(minutes / 60) + 'h' + (minutes % 60 ? ' ' + minutes % 60 + 'm' : '');
  const startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div
      data-screensaver-next-meeting
      className={(light
        ? 'border-[#b5b2a8] bg-[#ddd9ce] text-[#252723]'
        : 'border-white/10 bg-[#0b0e0d] text-[#f0eadc]') +
        ' relative z-20 w-full shrink-0 border-t px-3 py-2'}
    >
      <div className="mx-auto flex h-8 max-w-[52rem] min-w-0 items-center justify-center gap-2 sm:gap-3">
        <CalendarClock aria-hidden="true" size={16} className="shrink-0 opacity-65" />
        <span className="hidden shrink-0 text-[10px] font-black uppercase tracking-[0.15em] opacity-65 sm:inline">Next meeting</span>
        <span className="min-w-0 max-w-[26rem] truncate text-sm font-semibold" title={meeting.summary}>{meeting.summary}</span>
        <span aria-hidden="true" className="shrink-0 opacity-30">·</span>
        <time dateTime={meeting.start} className="shrink-0 text-xs font-semibold tabular-nums">{startTime}</time>
        <span className={(minutes <= 15
          ? light ? 'bg-[#ae4536]/10 text-[#972f23]' : 'bg-[#c9874a]/15 text-[#f0b67f]'
          : light ? 'bg-black/5 text-[#52534e]' : 'bg-white/10 text-white/75') +
          ' shrink-0 rounded-md px-2 py-1 text-xs font-bold tabular-nums'}
        >{countdown}</span>
      </div>
    </div>
  );
}

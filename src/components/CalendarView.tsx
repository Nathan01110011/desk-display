import React from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { CalendarEvent } from '@/types';

interface CalendarViewProps {
  calendar: CalendarEvent[];
}

export function CalendarView({ calendar }: CalendarViewProps) {
  const now = new Date();
  
  // Find the first non-all-day meeting that starts in the future
  const nextMeeting = calendar.find(event => {
    if (event.isAllDay) return false;
    const start = new Date(event.start);
    return start > now;
  });

  const getRelativeTimeString = (dateStr: string) => {
    const start = new Date(dateStr);
    const diffMs = start.getTime() - now.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 0) return null;
    if (diffMin === 0) return '(starting now)';
    if (diffMin < 60) return `(in ${diffMin}m)`;
    
    const diffHrs = Math.floor(diffMin / 60);
    const remMin = diffMin % 60;
    return `(in ${diffHrs}h ${remMin}m)`;
  };

  return (
    <div className="flex-1 space-y-10 overflow-y-auto scrollbar-hide">
      <h2 className="text-sm uppercase tracking-[0.2em] text-white/30 font-bold flex items-center gap-3">
        <CalendarIcon size={18} /> Today
      </h2>
      <div className="space-y-10">
        {calendar.length > 0 ? (
          calendar.map((event, i) => {
            const isNext = event === nextMeeting;
            return (
              <div key={i} className="space-y-1">
                <p className="text-2xl font-bold leading-tight line-clamp-2">{event.summary}</p>
                <div className="text-white/40 text-lg flex items-center gap-2">
                  <Clock size={16} />
                  <span>
                    {event.isAllDay ? "All Day" : new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                  {isNext && (
                    <span className="text-blue-400 font-bold animate-pulse ml-1">
                      {getRelativeTimeString(event.start)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-white/20 italic text-xl">No events left</div>
        )}
      </div>
    </div>
  );
}

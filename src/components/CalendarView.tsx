import React from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { CalendarEvent } from '@/types';

interface CalendarViewProps {
  calendar: CalendarEvent[];
  now: Date;
}

export function CalendarView({ calendar, now }: CalendarViewProps) {
  const currentTime = now.getTime();

  // Find the first non-all-day meeting that starts in the future
  const nextMeeting = calendar.find(event => {
    if (event.isAllDay) return false;
    const start = new Date(event.start);
    return start.getTime() > currentTime;
  });

  const getEventState = (event: CalendarEvent) => {
    if (event.isAllDay) return null;
    
    const start = new Date(event.start).getTime();
    const end = new Date(event.end).getTime();

    // 1. Check if Ongoing
    if (currentTime >= start && currentTime < end) {
      return { label: 'NOW', type: 'ongoing' };
    }

    // 2. Check if Next (Upcoming)
    if (event === nextMeeting) {
      const diffMs = start - currentTime;
      const diffMin = Math.ceil(diffMs / 60000);

      if (diffMin < 0) return null;
      
      let label = '';
      if (diffMin <= 0) label = 'starting now';
      else if (diffMin < 60) label = `in ${diffMin}m`;
      else {
        const diffHrs = Math.floor(diffMin / 60);
        const remMin = diffMin % 60;
        label = `in ${diffHrs}h ${remMin}m`;
      }

      return { 
        label: `(${label})`, 
        type: 'upcoming',
        isUrgent: diffMin <= 15
      };
    }

    return null;
  };

  return (
    <div className="flex-1 space-y-10 overflow-y-auto scrollbar-hide">
      <h2 className="text-sm uppercase tracking-[0.2em] text-white/30 font-bold flex items-center gap-3">
        <CalendarIcon size={18} /> Today
      </h2>
      <div className="space-y-10">
        {calendar.length > 0 ? (
          calendar.map((event, i) => {
            const state = getEventState(event);

            return (
              <div key={i} className="space-y-1">
                <p className={`text-2xl font-bold leading-tight line-clamp-2 ${state?.type === 'ongoing' ? 'text-white' : 'text-white/90'}`}>
                  {event.summary}
                </p>
                <div className="text-white/40 text-lg flex items-center gap-2">
                  <Clock size={16} />
                  <span>
                    {event.isAllDay ? "All Day" : new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                  {state && (
                    <span className={`ml-1 font-bold ${
                      state.type === 'ongoing' 
                        ? 'text-green-400 animate-pulse' 
                        : (state.isUrgent ? 'text-blue-400 animate-pulse' : 'text-white/20')
                    }`}>
                      {state.label}
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

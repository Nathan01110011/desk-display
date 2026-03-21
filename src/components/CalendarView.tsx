import React from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { CalendarEvent } from '@/types';

interface CalendarViewProps {
  calendar: CalendarEvent[];
}

export function CalendarView({ calendar }: CalendarViewProps) {
  return (
    <div className="flex-1 space-y-10 overflow-y-auto scrollbar-hide">
      <h2 className="text-sm uppercase tracking-[0.2em] text-white/30 font-bold flex items-center gap-3">
        <CalendarIcon size={18} /> Today
      </h2>
      <div className="space-y-10">
        {calendar.length > 0 ? (
          calendar.map((event, i) => (
            <div key={i} className="space-y-1">
              <p className="text-2xl font-bold leading-tight line-clamp-2">{event.summary}</p>
              <div className="text-white/40 text-lg flex items-center gap-2">
                <Clock size={16} className="text-white/20" />
                {event.isAllDay ? "All Day" : new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-white/20 italic text-xl">No events left</div>
        )}
      </div>
    </div>
  );
}

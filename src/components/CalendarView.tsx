import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { CalendarEvent } from '@/types';

interface CalendarViewProps {
  calendar: CalendarEvent[];
  now: Date;
}

export function CalendarView({ calendar, now }: CalendarViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [topFade, setTopFade] = useState(0);
  const [bottomFade, setBottomFade] = useState(0);
  const currentTime = now.getTime();

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    
    // Calculate fades (max 40px)
    const newTop = Math.min(scrollTop, 40);
    const scrollBottom = scrollHeight - clientHeight - scrollTop;
    const newBottom = Math.max(0, Math.min(scrollBottom, 40));
    
    setTopFade(newTop);
    setBottomFade(newBottom);
  };

  // Run once on mount/data change to check if we need initial bottom fade
  useEffect(() => {
    handleScroll();
  }, [calendar]);

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

    if (currentTime >= start && currentTime < end) {
      return { label: 'NOW', type: 'ongoing' };
    }

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

  const maskStyle = {
    WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, black ${topFade}px, black calc(100% - ${bottomFade}px), transparent 100%)`,
    maskImage: `linear-gradient(to bottom, transparent 0%, black ${topFade}px, black calc(100% - ${bottomFade}px), transparent 100%)`
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <h2 className="text-sm uppercase tracking-[0.2em] text-white/30 font-bold flex items-center gap-3 mb-8 shrink-0">
        <CalendarIcon size={18} /> Today
      </h2>
      
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 space-y-10 overflow-y-auto scrollbar-hide pr-2"
        style={maskStyle}
      >
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

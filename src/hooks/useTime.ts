import { useState, useEffect, useCallback } from 'react';
import { AdditionalClock } from '@/types';

export function useTime(mainOffset?: number) {
  const [now, setNow] = useState(new Date());
  const [clocks, setClocks] = useState<AdditionalClock[]>([]);

  useEffect(() => {
    // Load clocks from localStorage
    const saved = localStorage.getItem('worldClocks');
    
    requestAnimationFrame(() => {
      if (saved) {
        try {
          setClocks(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to load world clocks", e);
        }
      }
    });

    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const updateClocks = (newClocks: AdditionalClock[]) => {
    setClocks(newClocks);
    localStorage.setItem('worldClocks', JSON.stringify(newClocks));
  };

  const getTimeForOffset = useCallback((offsetSeconds: number) => {
    // Current UTC time
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    // New date with specific offset
    const targetDate = new Date(utc + (offsetSeconds * 1000));
    return targetDate;
  }, [now]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  // If mainOffset is provided, use it. Otherwise use local system time.
  const mainTime = mainOffset !== undefined ? getTimeForOffset(mainOffset) : now;

  return {
    time: formatTime(mainTime),
    date: formatDate(mainTime),
    rawTime: mainTime,
    clocks: clocks.map(c => ({
      ...c,
      displayTime: formatTime(getTimeForOffset(c.offset))
    })),
    updateClocks
  };
}

import { useState, useEffect, useCallback } from 'react';
import { AdditionalClock } from '@/types';
import { normalizeClocks, normalizeTimeZone } from '@/lib/timeZones';

export function useTime(mainOffset?: number) {
  const [now, setNow] = useState(new Date());
  const [clocks, setClocks] = useState<AdditionalClock[]>([]);

  useEffect(() => {
    // Load clocks from localStorage
    const saved = localStorage.getItem('worldClocks');
    
    requestAnimationFrame(() => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const normalized = normalizeClocks(parsed);
          setClocks(normalized);
          localStorage.setItem('worldClocks', JSON.stringify(normalized));
        } catch (e) {
          console.error("Failed to load world clocks", e);
        }
      }
    });

    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const updateClocks = (newClocks: AdditionalClock[]) => {
    const normalized = normalizeClocks(newClocks);
    setClocks(normalized);
    localStorage.setItem('worldClocks', JSON.stringify(normalized));
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

  const formatTimeForZone = (timeZone: string) => {
    const normalizedTimeZone = normalizeTimeZone(timeZone);
    if (!normalizedTimeZone) return undefined;

    return new Intl.DateTimeFormat([], {
      timeZone: normalizedTimeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  // If mainOffset is provided, use it. Otherwise use local system time.
  const mainTime = mainOffset !== undefined ? getTimeForOffset(mainOffset) : now;
  const getClockDisplayTime = (clock: AdditionalClock) => {
    if (clock.timeZone) {
      const zonedTime = formatTimeForZone(clock.timeZone);
      if (zonedTime) return zonedTime;
    }

    return formatTime(getTimeForOffset(clock.offset));
  };

  return {
    time: formatTime(mainTime),
    date: formatDate(mainTime),
    rawTime: mainTime,
    clocks: clocks.map(c => ({
      ...c,
      displayTime: getClockDisplayTime(c)
    })),
    updateClocks
  };
}

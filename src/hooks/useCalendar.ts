import { useState, useEffect } from 'react';
import { CalendarEvent } from '@/types';

export function useCalendar() {
  const [calendar, setCalendar] = useState<CalendarEvent[]>([]);

  const fetchCalendar = async () => {
    try {
      const res = await fetch('/api/calendar');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setCalendar(data);
      }
    } catch (e) { console.error("Calendar Fetch Error:", e); }
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      fetchCalendar();
    });
    const cTimer = setInterval(fetchCalendar, 120000);
    return () => clearInterval(cTimer);
  }, []);

  return { calendar };
}

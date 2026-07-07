import { useState, useEffect } from 'react';
import { CalendarEvent, CalendarEventInput } from '@/types';

export function useCalendar() {
  const [calendar, setCalendar] = useState<CalendarEvent[]>([]);
  const [allCalendar, setAllCalendar] = useState<CalendarEvent[]>([]);
  const [personalCalendar, setPersonalCalendar] = useState<CalendarEvent[]>([]);
  const [personalCalendarLoading, setPersonalCalendarLoading] = useState(false);

  const fetchPersonalCalendar = async () => {
    setPersonalCalendarLoading(true);
    try {
      const now = new Date();
      const start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString();
      const end = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
      const res = await fetch(`/api/personal-calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json() as CalendarEvent[];
        setPersonalCalendar(data);
      }
    } catch (e) {
      console.error("Personal Calendar Fetch Error:", e);
    } finally {
      setPersonalCalendarLoading(false);
    }
  };

  const fetchCalendar = async () => {
    try {
      const res = await fetch('/api/calendar?range=all');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json() as CalendarEvent[];
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        setAllCalendar(data);
        setCalendar(data.filter(event => {
          const start = new Date(event.start);
          const end = new Date(event.end);
          return start <= endOfToday && end >= startOfToday && end > now;
        }));
      }
    } catch (e) { console.error("Calendar Fetch Error:", e); }
  };

  const savePersonalCalendarEvent = async (event: CalendarEventInput) => {
    const method = event.id ? 'PATCH' : 'POST';
    const res = await fetch('/api/personal-calendar', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
    if (!res.ok) throw new Error('Unable to save personal calendar event');
    await fetchPersonalCalendar();
  };

  const deletePersonalCalendarEvent = async (event: CalendarEventInput) => {
    const res = await fetch('/api/personal-calendar', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
    if (!res.ok) throw new Error('Unable to delete personal calendar event');
    await fetchPersonalCalendar();
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      fetchCalendar();
      fetchPersonalCalendar();
    });
    const cTimer = setInterval(() => {
      fetchCalendar();
      fetchPersonalCalendar();
    }, 120000);
    return () => clearInterval(cTimer);
  }, []);

  return {
    calendar,
    allCalendar,
    personalCalendar,
    personalCalendarLoading,
    refreshPersonalCalendar: fetchPersonalCalendar,
    savePersonalCalendarEvent,
    deletePersonalCalendarEvent
  };
}

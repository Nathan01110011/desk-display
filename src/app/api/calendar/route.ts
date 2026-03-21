import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
// @ts-expect-error - ical.js types are inconsistent across environments
import ICAL from 'ical.js';

interface CalendarEvent {
  summary: string;
  start: string;
  end: string;
  location?: string;
  isAllDay: boolean;
}

const CACHE_PATH = path.join(process.cwd(), '.calendar-cache.json');
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const ICAL_URL = process.env.ICAL_URL;

export async function GET() {
  const now = new Date();

  // Check valid cache first
  try {
    if (fs.existsSync(CACHE_PATH)) {
      const stats = fs.statSync(CACHE_PATH);
      if (Date.now() - stats.mtimeMs < CACHE_TTL) {
        const fullCachedData: CalendarEvent[] = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
        
        // RE-FILTER cached data for current time (to remove events that finished since last cache)
        const activeEvents = fullCachedData.filter(event => new Date(event.end) > now);
        return NextResponse.json(activeEvents);
      }
    }
  } catch (e) { console.error("Cache read error", e); }

  try {
    if (!ICAL_URL) throw new Error('ICAL_URL not defined');

    const response = await fetch(ICAL_URL);
    if (!response.ok) throw new Error('Fetch failed');
    const icsData = await response.text();

    const jcalData = ICAL.parse(icsData);
    const vcalendar = new ICAL.Component(jcalData);
    const vevents = vcalendar.getAllSubcomponents('vevent');

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const rangeStart = ICAL.Time.fromJSDate(startOfToday);

    let filteredEvents: CalendarEvent[] = [];
    const recurrenceOverrides = new Set<string>();

    // Pass 1: Collect Recurrence-IDs
    vevents.forEach((vevent: unknown) => {
      const v = vevent as { getFirstPropertyValue: (prop: string) => { toString: () => string } };
      // @ts-expect-error - ical.js lacks types
      const rid = v.getFirstPropertyValue('recurrence-id');
      if (rid) recurrenceOverrides.add(rid.toString());
    });

    // Pass 2: Process events
    // @ts-expect-error - ical.js types are problematic
    vevents.forEach((vevent: unknown) => {
      const v = vevent as { getFirstPropertyValue: (prop: string) => string };
      // @ts-expect-error - ical.js lacks types
      const event = new ICAL.Event(v as unknown as Record<string, unknown>);
      
      if (v.getFirstPropertyValue('status') === 'CANCELLED') return;

      const processOccurrence = (occ: {
        startDate: { toJSDate: () => Date; isDate: boolean };
        endDate: { toJSDate: () => Date };
        summary?: string;
        location?: string;
        item?: { summary: string; location: string };
      }) => {
        const start = occ.startDate.toJSDate();
        const end = occ.endDate.toJSDate();
        
        // Only Today AND NOT finished yet
        // We show events that end after 'now' and start before 'end of today'
        if (end > now && start <= endOfToday) {
          filteredEvents.push({
            summary: (occ.item ? occ.item.summary : occ.summary) || 'No Title',
            start: start.toISOString(),
            end: end.toISOString(),
            location: (occ.item ? occ.item.location : occ.location) || '',
            isAllDay: occ.startDate.isDate,
          });
        }
      };

      if (event.isRecurring()) {
        const iter = event.iterator(rangeStart);
        let next;
        while ((next = iter.next()) && next.toJSDate() <= endOfToday) {
          // 3. Skip if this specific instance was moved/overridden by a standalone VEVENT
          if (recurrenceOverrides.has(next.toString())) continue;
          
          const occ = event.getOccurrenceDetails(next);
          processOccurrence(occ);
        }
      } else {
        processOccurrence(event);
      }
    });

    // Remove duplicates (same title and start time)
    const seen = new Set();
    filteredEvents = filteredEvents.filter(el => {
      const duplicate = seen.has(el.summary + el.start);
      seen.add(el.summary + el.start);
      return !duplicate;
    });

    const sortedEvents = filteredEvents.sort((a, b) => 
      new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    fs.writeFileSync(CACHE_PATH, JSON.stringify(sortedEvents));
    return NextResponse.json(sortedEvents);

  } catch (error) {
    console.error("Calendar Error:", error);
    if (fs.existsSync(CACHE_PATH)) {
      return NextResponse.json(JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')));
    }
    return NextResponse.json([]);
  }
}

import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore - ical.js types are inconsistent
import ICAL from 'ical.js';

interface CalendarEvent {
  summary: string;
  start: string;
  end: string;
  location?: string;
  isAllDay: boolean;
}

const CACHE_PATH = path.join(process.cwd(), '.calendar-cache.json');
const CACHE_TTL = 10 * 60 * 1000;
const ICAL_URL = process.env.ICAL_URL;

const WIN_TO_IANA: Record<string, string> = {
  'GMT Standard Time': 'Europe/London',
  'Greenwich Standard Time': 'Europe/London',
  'W. Europe Standard Time': 'Europe/Berlin',
  'Central Europe Standard Time': 'Europe/Prague',
  'Eastern Standard Time': 'America/New_York',
  'Central Standard Time': 'America/Chicago',
  'Mountain Standard Time': 'America/Denver',
  'Pacific Standard Time': 'America/Los_Angeles',
};

export async function GET() {
  const now = new Date();
  
  try {
    if (fs.existsSync(CACHE_PATH)) {
      const stats = fs.statSync(CACHE_PATH);
      if (Date.now() - stats.mtimeMs < CACHE_TTL) {
        const fullCachedData: CalendarEvent[] = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
        const activeEvents = fullCachedData.filter(event => new Date(event.end) > now);
        return NextResponse.json(activeEvents);
      }
    }
  } catch (e) { console.error("Cache error", e); }

  try {
    if (!ICAL_URL) throw new Error('ICAL_URL not defined');
    const response = await fetch(ICAL_URL);
    const icsData = await response.text();

    const jcalData = ICAL.parse(icsData);
    const vcalendar = new ICAL.Component(jcalData);
    const vevents = vcalendar.getAllSubcomponents('vevent');

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const rangeStart = ICAL.Time.fromJSDate(startOfToday);

    let filteredEvents: CalendarEvent[] = [];
    const recurrenceOverrides = new Set<string>();

    vevents.forEach((vevent: unknown) => {
      const v = vevent as { getFirstPropertyValue: (prop: string) => { toString: () => string } };
      // @ts-ignore
      const rid = v.getFirstPropertyValue('recurrence-id');
      if (rid) recurrenceOverrides.add(rid.toString());
    });

    vevents.forEach((vevent: any) => {
      const event = new ICAL.Event(vevent);
      const summary = event.summary || 'No Title';
      const status = vevent.getFirstPropertyValue('status') || '';
      const busyStatus = vevent.getFirstPropertyValue('x-microsoft-cdo-busystatus') || '';
      if (status.toUpperCase() === 'CANCELLED' || busyStatus.toUpperCase() === 'FREE') return;

      const processOccurrence = (occ: any) => {
        const icalStart = occ.startDate;
        const tzid = vevent.getFirstProperty('dtstart')?.getParameter('tzid');
        const ianaTz = WIN_TO_IANA[tzid] || 'UTC';

        // 1. DATA RECOVERY
        if (!icalStart.isDate && icalStart.hour === 0 && icalStart.minute === 0) {
          const base = event.startDate;
          if (base.hour !== 0 || base.minute !== 0) {
            icalStart.hour = base.hour;
            icalStart.minute = base.minute;
            icalStart.second = base.second;
          }
        }

        // 2. PRECISE CONVERSION
        const convert = (it: any, tz: string) => {
          if (it.isDate) return it.toJSDate();
          const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' });
          const parts = fmt.formatToParts(new Date(it.year, it.month - 1, it.day, it.hour, it.minute));
          const offsetStr = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+0';
          const isoOffset = offsetStr.replace(/^(GMT|UTC)/, '').replace(/(\+|-)(\d)$/, '$10$2:00').replace(/(\+|-)(\d{2})$/, '$1$2:00');
          return new Date(`${it.year}-${String(it.month).padStart(2, '0')}-${String(it.day).padStart(2, '0')}T${String(it.hour).padStart(2, '0')}:${String(it.minute).padStart(2, '0')}:00${isoOffset}`);
        };

        const jsStart = convert(icalStart, ianaTz);
        const jsEnd = new Date(jsStart.getTime() + event.duration.toSeconds() * 1000);
        
        if (jsStart <= endOfToday && jsEnd >= startOfToday) {
          // 3. INTERVAL GUARD: Manually verify bi-weekly logic
          const rrule = vevent.getFirstPropertyValue('rrule');
          if (rrule && rrule.interval > 1) {
            const baseStart = event.startDate.toJSDate();
            const msDiff = jsStart.getTime() - baseStart.getTime();
            const weeksDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24 * 7));
            if (weeksDiff % rrule.interval !== 0) return; // Skip if not on correct interval week
          }

          filteredEvents.push({
            summary,
            start: jsStart.toISOString(),
            end: jsEnd.toISOString(),
            location: (occ.item ? occ.item.location : occ.location) || '',
            isAllDay: icalStart.isDate,
          });
        }
      };

      if (event.isRecurring()) {
        const iter = event.iterator(rangeStart);
        let next;
        while ((next = iter.next()) && next.toJSDate() <= endOfToday) {
          if (recurrenceOverrides.has(next.toString())) continue;
          const occ = event.getOccurrenceDetails(next);
          processOccurrence(occ);
        }
      } else {
        processOccurrence(event);
      }
    });

    const seen = new Set();
    const sortedEvents = filteredEvents
      .filter(el => {
        const key = el.summary + el.start;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    fs.writeFileSync(CACHE_PATH, JSON.stringify(sortedEvents));
    return NextResponse.json(sortedEvents.filter(event => new Date(event.end) > now));

  } catch (error) {
    console.error("Calendar Error:", error);
    return NextResponse.json([]);
  }
}

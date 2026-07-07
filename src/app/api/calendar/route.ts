import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import ICAL from 'ical.js';
import { logger } from '@/lib/logger';

interface CalendarEvent {
  summary: string;
  start: string;
  end: string;
  location?: string;
  isAllDay: boolean;
}

interface IcalTime {
  isDate: boolean;
  hour: number;
  minute: number;
  second: number;
  year: number;
  month: number;
  day: number;
  toJSDate: () => Date;
  toString: () => string;
}

interface IcalProperty {
  getParameter: (name: string) => string | unknown[] | undefined;
}

interface IcalComponent {
  getFirstPropertyValue: (prop: string) => unknown;
  getFirstProperty: (prop: string) => IcalProperty | null;
  getAllProperties: (prop: string) => IcalProperty[];
}

interface IcalOccurrence {
  startDate: IcalTime;
  item?: {
    status?: string;
    location?: string;
  };
  location?: string;
}

interface IcalRecurrenceRule {
  interval?: number;
  until?: IcalTime;
}

type CalendarRange = 'today' | 'all';

const CACHE_VERSION = 3;
const CACHE_TTL = 10 * 60 * 1000;
const CANCELLED_SUMMARY_PREFIX = /^cancell?ed:\s*/i;
const RESCHEDULED_SUMMARY_PREFIX = /^rescheduled:\s*/i;

function getCachePath(range: CalendarRange) {
  return range === 'all'
    ? path.join(process.cwd(), 'data', 'work-display', 'calendar-all.json')
    : path.join(process.cwd(), 'data', 'work-display', 'calendar-today.json');
}

function isCalendarJcal(jcalData: unknown): jcalData is unknown[] {
  return Array.isArray(jcalData)
    && jcalData[0] === 'vcalendar'
    && Array.isArray(jcalData[1])
    && Array.isArray(jcalData[2]);
}

function readCachedEvents(range: CalendarRange, now: Date, requireFresh = true) {
  const cachePath = getCachePath(range);

  if (!fs.existsSync(cachePath)) return null;

  const stats = fs.statSync(cachePath);
  if (requireFresh && Date.now() - stats.mtimeMs >= CACHE_TTL) return null;

  const cachedData = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as {
    version?: number;
    range?: CalendarRange;
    events?: CalendarEvent[];
  };
  if (cachedData.version !== CACHE_VERSION || cachedData.range !== range || !Array.isArray(cachedData.events)) return null;

  return filterEventsForRange(cachedData.events, range, now);
}

function writeCachedEvents(range: CalendarRange, events: CalendarEvent[]) {
  const cachePath = getCachePath(range);
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify({ version: CACHE_VERSION, range, events }));
}

function filterEventsForRange(events: CalendarEvent[], range: CalendarRange, now: Date) {
  if (range === 'all') return events;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  return events.filter(event => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    return start <= endOfToday && end >= startOfToday && end > now;
  });
}

function getStringProperty(vevent: IcalComponent, prop: string) {
  const value = vevent.getFirstPropertyValue(prop);
  return typeof value === 'string' ? value : value?.toString() || '';
}

function getRecurrenceKey(vevent: IcalComponent) {
  const recurrenceId = vevent.getFirstPropertyValue('recurrence-id');
  if (!recurrenceId) return '';
  return `${getStringProperty(vevent, 'uid')}|${recurrenceId.toString()}`;
}

function isCancelledEvent(vevent: IcalComponent, summary: string) {
  const status = getStringProperty(vevent, 'status').toUpperCase();
  const busyStatus = getStringProperty(vevent, 'x-microsoft-cdo-busystatus').toUpperCase();
  const transparency = getStringProperty(vevent, 'transp').toUpperCase();
  const method = getStringProperty(vevent, 'method').toUpperCase();

  return status === 'CANCELLED'
    || method === 'CANCEL'
    || CANCELLED_SUMMARY_PREFIX.test(summary)
    || busyStatus === 'FREE'
    || transparency === 'TRANSPARENT';
}

function isPlaceholderReschedule(summary: string) {
  return RESCHEDULED_SUMMARY_PREFIX.test(summary);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
}

function addYears(date: Date, years: number) {
  return new Date(date.getFullYear() + years, date.getMonth(), date.getDate(), 23, 59, 59);
}

function getCalendarRange(range: CalendarRange, now: Date, vevents: ICAL.Component[]) {
  if (range === 'today') {
    return {
      start: startOfDay(now),
      end: endOfDay(now)
    };
  }

  let start = startOfDay(now);
  let end = endOfDay(now);
  let foundDate = false;
  const openEndedRecurringEnd = addYears(now, 1);

  vevents.forEach((veventRaw) => {
    try {
      const event = new ICAL.Event(veventRaw);
      const eventStart = event.startDate?.toJSDate();
      const eventEnd = event.endDate?.toJSDate();

      if (eventStart && !Number.isNaN(eventStart.getTime())) {
        start = foundDate ? new Date(Math.min(start.getTime(), startOfDay(eventStart).getTime())) : startOfDay(eventStart);
        foundDate = true;
      }

      if (eventEnd && !Number.isNaN(eventEnd.getTime())) {
        end = new Date(Math.max(end.getTime(), endOfDay(eventEnd).getTime()));
      }

      const rrule = (veventRaw as unknown as IcalComponent).getFirstPropertyValue('rrule') as IcalRecurrenceRule | null;
      const until = rrule?.until?.toJSDate();
      if (until && !Number.isNaN(until.getTime())) {
        end = new Date(Math.max(end.getTime(), endOfDay(until).getTime()));
      } else if (event.isRecurring()) {
        end = new Date(Math.max(end.getTime(), openEndedRecurringEnd.getTime()));
      }
    } catch (error) {
      logger.error('Calendar range error', error);
    }
  });

  return { start, end };
}

const WIN_TO_IANA: Record<string, string> = {
  'Dateline Standard Time': 'Etc/GMT+12',
  'UTC-11': 'Etc/GMT+11',
  'Hawaiian Standard Time': 'Pacific/Honolulu',
  'Alaskan Standard Time': 'America/Anchorage',
  'Pacific Standard Time (Mexico)': 'America/Santa_Isabel',
  'Pacific Standard Time': 'America/Los_Angeles',
  'US Mountain Standard Time': 'America/Phoenix',
  'Mountain Standard Time (Mexico)': 'America/Chihuahua',
  'Mountain Standard Time': 'America/Denver',
  'Central America Standard Time': 'America/Guatemala',
  'Central Standard Time': 'America/Chicago',
  'Central Standard Time (Mexico)': 'America/Mexico_City',
  'Canada Central Standard Time': 'America/Regina',
  'SA Pacific Standard Time': 'America/Bogota',
  'Eastern Standard Time': 'America/New_York',
  'US Eastern Standard Time': 'America/Indianapolis',
  'Venezuela Standard Time': 'America/Caracas',
  'Paraguay Standard Time': 'America/Asuncion',
  'Atlantic Standard Time': 'America/Halifax',
  'Central Brazilian Standard Time': 'America/Cuiaba',
  'SA Western Standard Time': 'America/La_Paz',
  'Pacific SA Standard Time': 'America/Santiago',
  'Newfoundland Standard Time': 'America/St_Johns',
  'E. South America Standard Time': 'America/Sao_Paulo',
  'Argentina Standard Time': 'America/Buenos_Aires',
  'SA Eastern Standard Time': 'America/Cayenne',
  'Greenland Standard Time': 'America/Godthab',
  'Montevideo Standard Time': 'America/Montevideo',
  'Bahia Standard Time': 'America/Bahia',
  'UTC-02': 'Etc/GMT+2',
  'Azores Standard Time': 'Atlantic/Azores',
  'Cape Verde Standard Time': 'Atlantic/Cape_Verde',
  'Morocco Standard Time': 'Africa/Casablanca',
  'UTC': 'Etc/UTC',
  'GMT Standard Time': 'Europe/London',
  'Greenwich Standard Time': 'Europe/London',
  'W. Europe Standard Time': 'Europe/Berlin',
  'Central Europe Standard Time': 'Europe/Prague',
  'Romance Standard Time': 'Europe/Paris',
  'Central European Standard Time': 'Europe/Warsaw',
  'W. Central Africa Standard Time': 'Africa/Lagos',
  'Namibia Standard Time': 'Africa/Windhoek',
  'Jordan Standard Time': 'Asia/Amman',
  'GTB Standard Time': 'Europe/Bucharest',
  'Middle East Standard Time': 'Asia/Beirut',
  'Egypt Standard Time': 'Africa/Cairo',
  'Syria Standard Time': 'Asia/Damascus',
  'E. Europe Standard Time': 'Europe/EET',
  'South Africa Standard Time': 'Africa/Johannesburg',
  'FLE Standard Time': 'Europe/Kiev',
  'Turkey Standard Time': 'Europe/Istanbul',
  'Israel Standard Time': 'Asia/Jerusalem',
  'Kaliningrad Standard Time': 'Europe/Kaliningrad',
  'Libya Standard Time': 'Africa/Tripoli',
  'Arabic Standard Time': 'Asia/Baghdad',
  'Arab Standard Time': 'Asia/Riyadh',
  'Belarus Standard Time': 'Europe/Minsk',
  'Russian Standard Time': 'Europe/Moscow',
  'E. Africa Standard Time': 'Africa/Nairobi',
  'Iran Standard Time': 'Asia/Tehran',
  'Arabian Standard Time': 'Asia/Dubai',
  'Azerbaijan Standard Time': 'Asia/Baku',
  'Russia Time Zone 3': 'Europe/Samara',
  'Mauritius Standard Time': 'Indian/Mauritius',
  'Georgian Standard Time': 'Asia/Tbilisi',
  'Caucasus Standard Time': 'Asia/Yerevan',
  'Afghanistan Standard Time': 'Asia/Kabul',
  'West Asia Standard Time': 'Asia/Tashkent',
  'Ekaterinburg Standard Time': 'Asia/Yekaterinburg',
  'Pakistan Standard Time': 'Asia/Karachi',
  'India Standard Time': 'Asia/Kolkata',
  'Sri Lanka Standard Time': 'Asia/Colombo',
  'Nepal Standard Time': 'Asia/Katmandu',
  'Central Asia Standard Time': 'Asia/Almaty',
  'Bangladesh Standard Time': 'Asia/Dhaka',
  'N. Central Asia Standard Time': 'Asia/Novosibirsk',
  'Myanmar Standard Time': 'Asia/Rangoon',
  'SE Asia Standard Time': 'Asia/Bangkok',
  'North Asia Standard Time': 'Asia/Krasnoyarsk',
  'China Standard Time': 'Asia/Shanghai',
  'North Asia East Standard Time': 'Asia/Irkutsk',
  'Singapore Standard Time': 'Asia/Singapore',
  'W. Australia Standard Time': 'Australia/Perth',
  'Taipei Standard Time': 'Asia/Taipei',
  'Ulaanbaatar Standard Time': 'Asia/Ulaanbaatar',
  'Tokyo Standard Time': 'Asia/Tokyo',
  'Korea Standard Time': 'Asia/Seoul',
  'Yakutsk Standard Time': 'Asia/Yakutsk',
  'Cen. Australia Standard Time': 'Australia/Adelaide',
  'AUS Central Standard Time': 'Australia/Darwin',
  'E. Australia Standard Time': 'Australia/Brisbane',
  'AUS Eastern Standard Time': 'Australia/Sydney',
  'West Pacific Standard Time': 'Pacific/Port_Moresby',
  'Tasmania Standard Time': 'Australia/Hobart',
  'Magadan Standard Time': 'Asia/Magadan',
  'Vladivostok Standard Time': 'Asia/Vladivostok',
  'Russia Time Zone 10': 'Asia/Srednekolymsk',
  'Central Pacific Standard Time': 'Pacific/Guadalcanal',
  'Russia Time Zone 11': 'Asia/Anadyr',
  'New Zealand Standard Time': 'Pacific/Auckland',
  'UTC+12': 'Etc/GMT-12',
  'Fiji Standard Time': 'Pacific/Fiji',
  'Tonga Standard Time': 'Pacific/Tongatapu',
  'Samoa Standard Time': 'Pacific/Apia',
  'Line Islands Standard Time': 'Pacific/Kiritimati'
};

export async function GET(request: Request) {
  const now = new Date();
  const range = new URL(request.url).searchParams.get('range') === 'all' ? 'all' : 'today';
  logger.info(`Calendar: Request received (${range})`);

  try {
    const activeEvents = readCachedEvents(range, now);
    if (activeEvents) return NextResponse.json(activeEvents);
  } catch (e) { 
    logger.error('Cache error', e); 
  }

  try {
    const icalUrl = process.env.ICAL_URL;
    if (!icalUrl) throw new Error('ICAL_URL not defined');

    const response = await fetch(icalUrl);
    if (!response.ok) throw new Error(`Calendar fetch failed: ${response.status} ${response.statusText}`);

    const icsData = await response.text();
    if (!icsData.trim()) throw new Error('Calendar feed returned an empty response');
    if (!icsData.includes('BEGIN:VCALENDAR')) throw new Error('Calendar feed did not return iCalendar data');

    const jcalData = ICAL.parse(icsData);
    if (!isCalendarJcal(jcalData)) throw new Error('Calendar feed returned invalid iCalendar data');

    const vcalendar = new ICAL.Component(jcalData);
    const vevents = vcalendar.getAllSubcomponents('vevent');

    const { start: rangeStart, end: rangeEnd } = getCalendarRange(range, now, vevents);

    const filteredEvents: CalendarEvent[] = [];
    const recurrenceOverrides = new Set<string>();

    vevents.forEach((veventRaw) => {
      const vevent = veventRaw as unknown as IcalComponent;
      const recurrenceKey = getRecurrenceKey(vevent);
      if (recurrenceKey) recurrenceOverrides.add(recurrenceKey);
    });

    vevents.forEach((veventRaw) => {
      const vevent = veventRaw as unknown as IcalComponent;
      const event = new ICAL.Event(veventRaw);
      const summary = event.summary || 'No Title';

      if (isCancelledEvent(vevent, summary) || isPlaceholderReschedule(summary)) {
        return;
      }

      const processOccurrence = (occ: IcalOccurrence) => {
        const icalStart = occ.startDate;
        const tzidParam = vevent.getFirstProperty('dtstart')?.getParameter('tzid');
        const tzid = typeof tzidParam === 'string' ? tzidParam : undefined;
        const ianaTz = tzid ? WIN_TO_IANA[tzid] || 'UTC' : 'UTC';

        if (!icalStart.isDate && icalStart.hour === 0 && icalStart.minute === 0) {
          const base = event.startDate;
          if (base.hour !== 0 || base.minute !== 0) {
            icalStart.hour = base.hour;
            icalStart.minute = base.minute;
            icalStart.second = base.second;
          }
        }

        const convert = (it: IcalTime, tz: string) => {
          if (it.isDate) return it.toJSDate();
          const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' });
          const parts = fmt.formatToParts(new Date(it.year, it.month - 1, it.day, it.hour, it.minute));
          const offsetStr = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+0';
          const isoOffset = offsetStr.replace(/^(GMT|UTC)/, '').replace(/(\+|-)(\d)$/, '$10$2:00').replace(/(\+|-)(\d{2})$/, '$1$2:00');
          return new Date(`${it.year}-${String(it.month).padStart(2, '0')}-${String(it.day).padStart(2, '0')}T${String(it.hour).padStart(2, '0')}:${String(it.minute).padStart(2, '0')}:00${isoOffset}`);
        };

        const jsStart = convert(icalStart, ianaTz);
        const jsEnd = new Date(jsStart.getTime() + event.duration.toSeconds() * 1000);
        
        if (jsStart <= rangeEnd && jsEnd >= rangeStart) {
          const status = String((occ.item ? occ.item.status : vevent.getFirstPropertyValue('status')) || '');
          const busyStatus = String(vevent.getFirstPropertyValue('x-microsoft-cdo-busystatus') || '');
          const transparency = String(vevent.getFirstPropertyValue('transp') || '');

          if (status.toUpperCase() === 'CANCELLED' || busyStatus.toUpperCase() === 'FREE' || transparency.toUpperCase() === 'TRANSPARENT') {
            return;
          }

          const rrule = vevent.getFirstPropertyValue('rrule') as IcalRecurrenceRule | null;
          const interval = rrule?.interval;
          if (interval && interval > 1) {
            const baseStart = event.startDate.toJSDate();
            const msDiff = jsStart.getTime() - baseStart.getTime();
            const weeksDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24 * 7));
            if (weeksDiff % interval !== 0) return;
          }

          filteredEvents.push({
            summary,
            start: jsStart.toISOString(),
            end: jsEnd.toISOString(),
            location: (occ.item ? occ.item.location : occ.location) || '',
            isAllDay: icalStart.isDate,
          });
          
          const rawTime = `${icalStart.hour}:${String(icalStart.minute).padStart(2, '0')}`;
          logger.debug(`Calendar: ✅ INCLUDED: "${summary}" | RAW: ${rawTime} (${tzid}) -> CONV: ${jsStart.toLocaleTimeString()} | STATUS: ${status} | TRANSP: ${transparency}`);
        }
      };

      if (event.isRecurring()) {
        const iter = event.iterator();
        let next = iter.next();
        while (next && next.toJSDate() <= rangeEnd) {
          const recurrenceKey = `${event.uid}|${next.toString()}`;
          if (recurrenceOverrides.has(recurrenceKey)) {
            next = iter.next();
            continue;
          }
          const occ = event.getOccurrenceDetails(next) as IcalOccurrence;
          processOccurrence(occ);
          next = iter.next();
        }
      } else {
        processOccurrence(event);
      }
    });

    const seen = new Set<string>();
    const sortedEvents = filteredEvents
      .filter(el => {
        const key = el.summary + el.start;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    writeCachedEvents(range, sortedEvents);
    return NextResponse.json(filterEventsForRange(sortedEvents, range, now));

  } catch (error) {
    logger.error('Calendar Error:', error);
    try {
      const staleEvents = readCachedEvents(range, now, false);
      if (staleEvents) return NextResponse.json(staleEvents);
    } catch (cacheError) {
      logger.error('Stale cache error', cacheError);
    }

    return NextResponse.json([]);
  }
}

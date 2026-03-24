import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore
import ICAL from 'ical.js';
import { logger } from '@/lib/logger';

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

export async function GET() {
  const now = new Date();
  logger.info('Calendar: Request received');

  try {
    if (fs.existsSync(CACHE_PATH)) {
      const stats = fs.statSync(CACHE_PATH);
      if (Date.now() - stats.mtimeMs < CACHE_TTL) {
        const fullCachedData: CalendarEvent[] = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
        const activeEvents = fullCachedData.filter(event => new Date(event.end) > now);
        return NextResponse.json(activeEvents);
      }
    }
  } catch (e) { 
    logger.error('Cache error', e); 
  }

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

      const processOccurrence = (occ: any) => {
        const icalStart = occ.startDate;
        const tzid = vevent.getFirstProperty('dtstart')?.getParameter('tzid');
        const ianaTz = WIN_TO_IANA[tzid] || 'UTC';

        if (!icalStart.isDate && icalStart.hour === 0 && icalStart.minute === 0) {
          const base = event.startDate;
          if (base.hour !== 0 || base.minute !== 0) {
            icalStart.hour = base.hour;
            icalStart.minute = base.minute;
            icalStart.second = base.second;
          }
        }

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
          const status = (occ.item ? occ.item.status : vevent.getFirstPropertyValue('status')) || '';
          const busyStatus = vevent.getFirstPropertyValue('x-microsoft-cdo-busystatus') || '';
          const transparency = vevent.getFirstPropertyValue('transp') || '';

          const attendees = vevent.getAllProperties('attendee');
          const isDeclined = attendees.some((a: any) => a.getParameter('partstat')?.toUpperCase() === 'DECLINED');

          if (isDeclined || status.toUpperCase() === 'CANCELLED' || busyStatus.toUpperCase() === 'FREE' || transparency.toUpperCase() === 'TRANSPARENT') {
            return;
          }

          const rrule = vevent.getFirstPropertyValue('rrule');
          if (rrule && rrule.interval > 1) {
            const baseStart = event.startDate.toJSDate();
            const msDiff = jsStart.getTime() - baseStart.getTime();
            const weeksDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24 * 7));
            if (weeksDiff % rrule.interval !== 0) return;
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
    logger.error('Calendar Error:', error);
    return NextResponse.json([]);
  }
}

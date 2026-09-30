import ICAL from 'ical.js';
import { createDAVClient, DAVCalendar, DAVCalendarObject } from 'tsdav';
import { CalendarEvent, CalendarEventInput } from '@/types';

type EventRecurrence = NonNullable<CalendarEventInput['recurrence']>;

interface PersonalCalendarConfig {
  serverUrl: string;
  username: string;
  password: string;
  rootUrl?: string;
  principalUrl?: string;
  homeUrl?: string;
  calendarUrl?: string;
  calendarName?: string;
}

interface IcalTime {
  isDate: boolean;
  toJSDate: () => Date;
}

const DEFAULT_CALDAV_URL = 'https://dav.privateemail.com';
const recurrenceFrequency: Record<Exclude<EventRecurrence, 'none'>, string> = {
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
  yearly: 'YEARLY'
};

function getPersonalCalendarConfig(): PersonalCalendarConfig {
  const username = process.env.PERSONAL_CALDAV_USERNAME || '';
  const password = process.env.PERSONAL_CALDAV_APP_PASSWORD || process.env.PERSONAL_CALDAV_PASSWORD || '';

  if (!username || !password) {
    throw new Error('Personal CalDAV credentials are not configured');
  }

  return {
    serverUrl: process.env.PERSONAL_CALDAV_URL || DEFAULT_CALDAV_URL,
    username,
    password,
    rootUrl: process.env.PERSONAL_CALDAV_ROOT_URL,
    principalUrl: process.env.PERSONAL_CALDAV_PRINCIPAL_URL,
    homeUrl: process.env.PERSONAL_CALDAV_HOME_URL,
    calendarUrl: process.env.PERSONAL_CALDAV_CALENDAR_URL,
    calendarName: process.env.PERSONAL_CALDAV_CALENDAR_NAME
  };
}

async function getPersonalCalendar() {
  const config = getPersonalCalendarConfig();
  const credentials = {
    username: config.username,
    password: config.password
  };
  const client = await createDAVClient({
    serverUrl: config.serverUrl,
    credentials,
    authMethod: 'Basic'
  });

  if (config.calendarUrl) {
    return {
      client,
      calendar: {
        url: config.calendarUrl
      } satisfies DAVCalendar
    };
  }

  const account = await client.createAccount({
    account: {
      accountType: 'caldav',
      serverUrl: config.serverUrl,
      credentials,
      rootUrl: config.rootUrl,
      principalUrl: config.principalUrl,
      homeUrl: config.homeUrl
    },
    loadCollections: true
  });
  const calendars = account.calendars || [];
  const calendar = calendars.find(item => {
    if (!config.calendarName) return true;
    return typeof item.displayName === 'string' && item.displayName.toLowerCase() === config.calendarName.toLowerCase();
  });

  if (!calendar) {
    throw new Error(config.calendarName
      ? `Personal CalDAV calendar "${config.calendarName}" was not found`
      : 'No personal CalDAV calendars were found');
  }

  return { client, calendar };
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function formatIcsDateTime(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function formatIcsDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('');
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getExclusiveAllDayEndDate(start: Date, end: Date) {
  const startDay = startOfDay(start);
  const inclusiveEndDay = startOfDay(end);
  return addDays(inclusiveEndDay < startDay ? startDay : inclusiveEndDay, 1);
}

function foldIcsLine(line: string) {
  const chunks: string[] = [];
  let remaining = line;

  while (remaining.length > 75) {
    chunks.push(remaining.slice(0, 75));
    remaining = ` ${remaining.slice(75)}`;
  }

  chunks.push(remaining);
  return chunks.join('\r\n');
}

function normalizeRecurrence(recurrence: CalendarEventInput['recurrence']): EventRecurrence {
  return recurrence === 'weekly' || recurrence === 'monthly' || recurrence === 'yearly' ? recurrence : 'none';
}

function recurrenceToRrule(recurrence: EventRecurrence) {
  if (recurrence === 'none') return '';
  return `RRULE:FREQ=${recurrenceFrequency[recurrence]}`;
}

function recurrenceFromRrule(value: unknown): EventRecurrence {
  const recurrenceText = value ? String(value).toUpperCase() : '';
  if (recurrenceText.includes('WEEKLY')) return 'weekly';
  if (recurrenceText.includes('MONTHLY')) return 'monthly';
  if (recurrenceText.includes('YEARLY')) return 'yearly';
  return 'none';
}

function normalizeEventInput(input: CalendarEventInput) {
  const summary = input.summary.trim();
  if (!summary) throw new Error('Event title is required');

  const start = new Date(input.start);
  const end = new Date(input.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new Error('Event start and end are required');
  if (end <= start) throw new Error('Event end must be after start');

  return {
    ...input,
    summary,
    start: start.toISOString(),
    end: end.toISOString(),
    location: input.location?.trim() || '',
    isAllDay: Boolean(input.isAllDay),
    recurrence: normalizeRecurrence(input.recurrence)
  };
}

function buildIcsEvent(input: CalendarEventInput, uid: string) {
  const event = normalizeEventInput(input);
  const now = formatIcsDateTime(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Work Display//Personal Calendar//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
    event.isAllDay
      ? `DTSTART;VALUE=DATE:${formatIcsDate(new Date(event.start))}`
      : `DTSTART:${formatIcsDateTime(new Date(event.start))}`,
    event.isAllDay
      ? `DTEND;VALUE=DATE:${formatIcsDate(getExclusiveAllDayEndDate(new Date(event.start), new Date(event.end)))}`
      : `DTEND:${formatIcsDateTime(new Date(event.end))}`,
    event.location ? `LOCATION:${escapeIcsText(event.location)}` : '',
    recurrenceToRrule(event.recurrence),
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean);

  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

function uidFromObjectUrl(url: string) {
  const fileName = decodeURIComponent(url.split('/').filter(Boolean).at(-1) || '');
  return fileName.replace(/\.ics$/i, '');
}

function eventOverlapsRange(event: CalendarEvent, start: Date, end: Date) {
  return new Date(event.end) > start && new Date(event.start) < end;
}

function getRecurringOccurrences(event: CalendarEvent, start: Date, end: Date) {
  const originalStart = new Date(event.start);
  const originalEnd = new Date(event.end);
  const duration = originalEnd.getTime() - originalStart.getTime();
  const occurrences: CalendarEvent[] = [];
  let occurrenceStart = new Date(originalStart);
  const maxIterations = 600;

  for (let index = 0; occurrenceStart < end && index < maxIterations; index += 1) {
    const occurrenceEnd = new Date(occurrenceStart.getTime() + duration);

    if (occurrenceEnd > start) {
      const occurrence = {
        ...event,
        start: occurrenceStart.toISOString(),
        end: occurrenceEnd.toISOString()
      };

      if (eventOverlapsRange(occurrence, start, end)) occurrences.push(occurrence);
    }

    const nextStart = new Date(occurrenceStart);

    if (event.recurrence === 'weekly') {
      nextStart.setDate(nextStart.getDate() + 7);
    } else if (event.recurrence === 'monthly') {
      nextStart.setMonth(nextStart.getMonth() + 1);
      if (nextStart.getDate() !== originalStart.getDate()) {
        nextStart.setMonth(nextStart.getMonth() + 1, 0);
      }
    } else if (event.recurrence === 'yearly') {
      nextStart.setFullYear(nextStart.getFullYear() + 1);
      if (nextStart.getMonth() !== originalStart.getMonth()) {
        nextStart.setFullYear(nextStart.getFullYear() + 1, 0, 1);
      }
    } else {
      break;
    }

    if (nextStart.getTime() <= occurrenceStart.getTime()) break;
    occurrenceStart = nextStart;
  }

  return occurrences;
}

function getRecurringOccurrencesInRange(event: CalendarEvent, start: Date, end: Date) {
  const originalStart = new Date(event.start);

  if (event.recurrence === 'weekly') {
    const diffMs = start.getTime() - originalStart.getTime();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const weeksToRange = Math.max(0, Math.floor(diffMs / weekMs) - 1);
    const rangeStartEvent = { ...event, start: new Date(originalStart.getTime() + weeksToRange * weekMs).toISOString() };
    const originalEnd = new Date(event.end);
    rangeStartEvent.end = new Date(new Date(rangeStartEvent.start).getTime() + (originalEnd.getTime() - originalStart.getTime())).toISOString();
    return getRecurringOccurrences(rangeStartEvent, start, end);
  }

  if (event.recurrence === 'monthly') {
    const monthsToRange = Math.max(
      0,
      (start.getFullYear() - originalStart.getFullYear()) * 12 + start.getMonth() - originalStart.getMonth() - 1
    );
    const rangeStart = new Date(originalStart);
    rangeStart.setMonth(originalStart.getMonth() + monthsToRange);
    if (rangeStart.getDate() !== originalStart.getDate()) {
      rangeStart.setMonth(rangeStart.getMonth() + 1, 0);
    }

    const originalEnd = new Date(event.end);
    const duration = originalEnd.getTime() - originalStart.getTime();
    return getRecurringOccurrences({
      ...event,
      start: rangeStart.toISOString(),
      end: new Date(rangeStart.getTime() + duration).toISOString()
    }, start, end);
  }

  if (event.recurrence === 'yearly') {
    const yearsToRange = Math.max(0, start.getFullYear() - originalStart.getFullYear() - 1);
    const rangeStart = new Date(originalStart);
    rangeStart.setFullYear(originalStart.getFullYear() + yearsToRange);
    if (rangeStart.getMonth() !== originalStart.getMonth()) {
      rangeStart.setFullYear(rangeStart.getFullYear() + 1, 0, 1);
    }

    const originalEnd = new Date(event.end);
    const duration = originalEnd.getTime() - originalStart.getTime();
    return getRecurringOccurrences({
      ...event,
      start: rangeStart.toISOString(),
      end: new Date(rangeStart.getTime() + duration).toISOString()
    }, start, end);
  }

  return [];
}

function objectToCalendarEvents(object: DAVCalendarObject, start: Date, end: Date): CalendarEvent[] {
  if (!object.data) return [];

  try {
    const jcalData = ICAL.parse(String(object.data));
    const calendar = new ICAL.Component(jcalData);
    const veventRaw = calendar.getFirstSubcomponent('vevent');
    if (!veventRaw) return [];

    const calendarEvent = new ICAL.Event(veventRaw);
    const startDate = calendarEvent.startDate as IcalTime;
    const endDate = calendarEvent.endDate as IcalTime;
    const recurrenceValue = veventRaw.getFirstPropertyValue('rrule');

    const event = {
      id: object.url,
      etag: object.etag,
      calendarType: 'personal',
      summary: calendarEvent.summary || 'No Title',
      start: startDate.toJSDate().toISOString(),
      end: endDate.toJSDate().toISOString(),
      location: calendarEvent.location || '',
      isAllDay: startDate.isDate,
      recurrence: recurrenceFromRrule(recurrenceValue)
    } satisfies CalendarEvent;

    if (event.recurrence !== 'none') return getRecurringOccurrencesInRange(event, start, end);
    return eventOverlapsRange(event, start, end) ? [event] : [];
  } catch {
    return [];
  }
}

export async function fetchPersonalCalendarEvents(start: Date, end: Date) {
  const { client, calendar } = await getPersonalCalendar();
  const objects = await client.fetchCalendarObjects({
    calendar,
    timeRange: {
      start: start.toISOString(),
      end: end.toISOString()
    }
  });

  return objects
    .flatMap(object => objectToCalendarEvents(object, start, end))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export async function createPersonalCalendarEvent(input: CalendarEventInput) {
  const { client, calendar } = await getPersonalCalendar();
  const uid = `${crypto.randomUUID()}@work-display`;
  const response = await client.createCalendarObject({
    calendar,
    filename: `${uid}.ics`,
    iCalString: buildIcsEvent(input, uid)
  });

  if (!response.ok) throw new Error(`Personal CalDAV create failed: ${response.status} ${response.statusText}`);
}

export async function updatePersonalCalendarEvent(input: CalendarEventInput) {
  if (!input.id) throw new Error('Event id is required');

  const { client } = await getPersonalCalendar();
  const uid = uidFromObjectUrl(input.id) || `${crypto.randomUUID()}@work-display`;
  const response = await client.updateCalendarObject({
    calendarObject: {
      url: input.id,
      etag: input.etag,
      data: buildIcsEvent(input, uid)
    }
  });

  if (!response.ok) throw new Error(`Personal CalDAV update failed: ${response.status} ${response.statusText}`);
}

export async function deletePersonalCalendarEvent(input: Pick<CalendarEventInput, 'id' | 'etag'>) {
  if (!input.id) throw new Error('Event id is required');

  const { client } = await getPersonalCalendar();
  const response = await client.deleteCalendarObject({
    calendarObject: {
      url: input.id,
      etag: input.etag
    }
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Personal CalDAV delete failed: ${response.status} ${response.statusText}`);
  }
}

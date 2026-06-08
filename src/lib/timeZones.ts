import type { AdditionalClock } from '@/types';

type TimeZoneMatch = {
  city: string;
  country?: string;
  state?: string;
  timeZone: string;
};

const CITY_TIME_ZONES: TimeZoneMatch[] = [
  { city: 'austin', country: 'US', state: 'Texas', timeZone: 'America/Chicago' },
  { city: 'belfast', country: 'GB', timeZone: 'Europe/Belfast' },
  { city: 'ballynahinch', country: 'GB', timeZone: 'Europe/Belfast' },
  { city: 'london', country: 'GB', timeZone: 'Europe/London' },
  { city: 'manila', country: 'PH', timeZone: 'Asia/Manila' },
  { city: 'new york', country: 'US', state: 'New York', timeZone: 'America/New_York' },
];

const TIME_ZONE_ALIASES: Record<string, string> = {
  'Europe/Belfast': 'Europe/London',
};

export function normalizeTimeZone(timeZone?: string) {
  if (!timeZone) return undefined;
  const normalized = TIME_ZONE_ALIASES[timeZone] ?? timeZone;

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: normalized });
    return normalized;
  } catch {
    return undefined;
  }
}

function normalizeLocation(value?: string) {
  return value?.trim().toLowerCase();
}

export function inferTimeZone(city?: string, country?: string, state?: string) {
  const normalizedCity = normalizeLocation(city);
  if (!normalizedCity) return undefined;

  const exactMatch = CITY_TIME_ZONES.find(match => (
    match.city === normalizedCity &&
    (!match.country || match.country === country) &&
    (!match.state || match.state === state)
  ));

  if (exactMatch) return normalizeTimeZone(exactMatch.timeZone);

  const cityMatch = CITY_TIME_ZONES.find(match => match.city === normalizedCity);
  return normalizeTimeZone(cityMatch?.timeZone);
}

export function normalizeClock(clock: AdditionalClock): AdditionalClock {
  const timeZone = normalizeTimeZone(clock.timeZone) ?? inferTimeZone(clock.city || clock.label);
  const clockWithoutDisplayTime = { ...clock };
  delete clockWithoutDisplayTime.displayTime;

  return timeZone ? { ...clockWithoutDisplayTime, timeZone } : clockWithoutDisplayTime;
}

export function normalizeClocks(clocks: AdditionalClock[]) {
  return clocks.map(normalizeClock);
}

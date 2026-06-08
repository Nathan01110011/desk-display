import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import * as fs from 'fs';
import * as path from 'path';

const GOOGLE_HEALTH_BASE_URL = 'https://health.googleapis.com/v4';
const SETTINGS_PATH = path.join(process.cwd(), '.dashboard-settings.json');

const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET;
const stepGoal = Number(process.env.GOOGLE_HEALTH_STEP_GOAL || 10000);
const floorGoal = Number(process.env.GOOGLE_HEALTH_FLOOR_GOAL || 10);

type DateParts = {
  year: number;
  month: number;
  day: number;
};

type GoogleHealthRollupPoint = {
  steps?: { countSum?: string };
  floors?: { countSum?: string };
  totalCalories?: { kcalSum?: number };
  activeEnergyBurned?: { kcalSum?: number };
  activeMinutes?: {
    activeMinutesRollupByActivityLevel?: {
      activeMinutesSum?: string;
      activityLevel?: string;
    }[];
  };
};

type GoogleHealthDataPoint = {
  dailyRestingHeartRate?: {
    beatsPerMinute?: string;
  };
};

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, timeout = 10000) {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (!response.ok) {
        const errText = await response.clone().text();
        logger.error(`Google Health API Error [${response.status}] for ${url}: ${errText}`);
        return response;
      }
      return response;
    } catch (e) {
      if (i === retries - 1) throw e;
      logger.warn(`Google Health: Fetch failed for ${url}, retrying (${i + 1}/${retries})...`);
      await new Promise(res => setTimeout(res, 1000));
    } finally {
      clearTimeout(id);
    }
  }
  throw new Error('All Google Health fetch retries failed');
}

function readSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) return {};
  return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8')) as Record<string, unknown>;
}

function saveGoogleHealthRefreshToken(refreshToken: string) {
  try {
    const settings = readSettings();
    fs.writeFileSync(
      SETTINGS_PATH,
      JSON.stringify({ ...settings, googleHealthRefreshToken: refreshToken }, null, 2),
    );
    logger.info('Google Health: Persisted refresh token.');
  } catch (e) {
    logger.error('Failed to save Google Health refresh token', e);
  }
}

async function getAccessToken() {
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_HEALTH_CLIENT_ID and GOOGLE_HEALTH_CLIENT_SECRET must be configured');
  }

  let refreshToken = process.env.GOOGLE_HEALTH_REFRESH_TOKEN?.trim();
  try {
    const settings = readSettings();
    if (!refreshToken && typeof settings.googleHealthRefreshToken === 'string') {
      refreshToken = settings.googleHealthRefreshToken.trim();
    }
  } catch (e) {
    logger.error('Failed to read Google Health token from settings', e);
  }

  if (!refreshToken) {
    throw new Error('GOOGLE_HEALTH_REFRESH_TOKEN must be configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    logger.error('Google Health Token Refresh Failed:', JSON.stringify(data, null, 2));
    const googleError = [data.error, data.error_description].filter(Boolean).join(': ');
    throw new Error(googleError || 'Invalid Google Health refresh token');
  }

  if (data.refresh_token) {
    saveGoogleHealthRefreshToken(data.refresh_token);
  }

  return data.access_token as string;
}

function todayParts(): DateParts {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

function addDays(date: DateParts, days: number): DateParts {
  const next = new Date(date.year, date.month - 1, date.day + days);
  return {
    year: next.getFullYear(),
    month: next.getMonth() + 1,
    day: next.getDate(),
  };
}

function formatDate(date: DateParts) {
  return [
    date.year,
    String(date.month).padStart(2, '0'),
    String(date.day).padStart(2, '0'),
  ].join('-');
}

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

async function fetchDailyRollup(
  accessToken: string,
  dataType: 'steps' | 'floors' | 'total-calories' | 'active-minutes',
  start: DateParts,
  end: DateParts,
) {
  const response = await fetchWithRetry(
    `${GOOGLE_HEALTH_BASE_URL}/users/me/dataTypes/${dataType}/dataPoints:dailyRollUp`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: {
          start: { date: start },
          end: { date: end },
        },
        dataSourceFamily: 'users/me/dataSourceFamilies/all-sources',
      }),
    },
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Google Health ${dataType} rollup failed`);
  }

  return (data.rollupDataPoints?.[0] || {}) as GoogleHealthRollupPoint;
}

async function fetchRestingHeartRate(accessToken: string, start: DateParts, end: DateParts) {
  const filter = `daily_resting_heart_rate.date >= "${formatDate(start)}" AND daily_resting_heart_rate.date < "${formatDate(end)}"`;
  const url = new URL(`${GOOGLE_HEALTH_BASE_URL}/users/me/dataTypes/daily-resting-heart-rate/dataPoints`);
  url.searchParams.set('filter', filter);

  const response = await fetchWithRetry(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error('Google Health resting heart rate fetch failed');
  }

  const dataPoint = (data.dataPoints?.[0] || {}) as GoogleHealthDataPoint;
  return Math.round(toNumber(dataPoint.dailyRestingHeartRate?.beatsPerMinute));
}

export async function GET() {
  try {
    const accessToken = await getAccessToken();
    const start = todayParts();
    const end = addDays(start, 1);

    const [stepsData, floorsData, caloriesData, activeMinutesData, restingHeartRate] = await Promise.all([
      fetchDailyRollup(accessToken, 'steps', start, end),
      fetchDailyRollup(accessToken, 'floors', start, end),
      fetchDailyRollup(accessToken, 'total-calories', start, end),
      fetchDailyRollup(accessToken, 'active-minutes', start, end),
      fetchRestingHeartRate(accessToken, start, end).catch(error => {
        logger.warn('Google Health: Resting heart rate unavailable', error);
        return 0;
      }),
    ]);

    const activeMinutes = activeMinutesData.activeMinutes?.activeMinutesRollupByActivityLevel
      ?.filter(item => item.activityLevel === 'MODERATE' || item.activityLevel === 'VIGOROUS')
      .reduce((total, item) => total + toNumber(item.activeMinutesSum), 0) || 0;

    return NextResponse.json({
      steps: Math.round(toNumber(stepsData.steps?.countSum)),
      stepGoal,
      floors: Math.round(toNumber(floorsData.floors?.countSum)),
      floorGoal,
      calories: Math.round(toNumber(caloriesData.totalCalories?.kcalSum ?? caloriesData.activeEnergyBurned?.kcalSum)),
      activeMinutes: Math.round(activeMinutes),
      restingHeartRate,
      lastSyncTime: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Google Health Logic Error:', error);
    return NextResponse.json({ error: 'Failed to process Google Health data' }, { status: 500 });
  }
}

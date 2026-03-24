import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import * as fs from 'fs';
import * as path from 'path';

const client_id = process.env.FITBIT_CLIENT_ID;
const client_secret = process.env.FITBIT_CLIENT_SECRET;
const SETTINGS_PATH = path.join(process.cwd(), '.dashboard-settings.json');

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, timeout = 10000) {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (response.status === 204 || response.status === 401) return response;
      if (!response.ok) {
        const errorClone = response.clone();
        const errText = await errorClone.text();
        logger.error(`Fitbit API Error [${response.status}] for ${url}: ${errText}`);
        return response; 
      }
      return response;
    } catch (e) {
      if (i === retries - 1) throw e;
      logger.warn(`Fitbit: Fetch failed for ${url}, retrying (${i + 1}/${retries})...`);
      await new Promise(res => setTimeout(res, 1000));
    } finally {
      clearTimeout(id);
    }
  }
  throw new Error('All Fitbit fetch retries failed');
}

async function getTokens() {
  // 1. Get current refresh token (Try persistence file first, then env)
  let currentRefreshToken = process.env.FITBIT_REFRESH_TOKEN;
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
      if (settings.fitbitRefreshToken) currentRefreshToken = settings.fitbitRefreshToken;
    }
  } catch (e) { logger.error('Failed to read fitbit token from settings', e); }

  if (!currentRefreshToken) throw new Error('No refresh token available');

  try {
    const response = await fetch('https://api.fitbit.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: currentRefreshToken,
      }),
    });

    const data = await response.json();
    if (data.errors || !data.access_token) {
      logger.error('Fitbit Token Refresh Failed:', JSON.stringify(data, null, 2));
      throw new Error('Invalid refresh token');
    }

    // 2. Persist the NEW refresh token immediately
    if (data.refresh_token) {
      try {
        let settings = {};
        if (fs.existsSync(SETTINGS_PATH)) {
          settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
        }
        const newSettings = { ...settings, fitbitRefreshToken: data.refresh_token };
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(newSettings, null, 2));
        logger.info('Fitbit: Rotated and persisted new refresh token.');
      } catch (e) { logger.error('Failed to save new fitbit token', e); }
    }

    return { access: data.access_token };
  } catch (e) {
    logger.error('Failed to get Fitbit access token', e);
    throw e;
  }
}

export async function GET() {
  try {
    const { access } = await getTokens();
    const headers = { Authorization: `Bearer ${access}` };
    const today = new Date().toISOString().split('T')[0];

    // Fetch Activities
    const activitiesRes = await fetchWithRetry(`https://api.fitbit.com/1/user/-/activities/date/${today}.json`, { headers });
    const activities = await activitiesRes.json();

    // Fetch Heart Rate
    const heartRes = await fetchWithRetry(`https://api.fitbit.com/1/user/-/activities/heart/date/${today}/1d.json`, { headers });
    const heartData = await heartRes.json();

    const summary = activities.summary || {};
    const goals = activities.goals || {};
    const heartItems = heartData['activities-heart'] || [];
    const rHR = heartItems[0]?.value?.restingHeartRate || 0;

    return NextResponse.json({
      steps: summary.steps || 0,
      stepGoal: goals.steps || 10000,
      floors: summary.floors || 0,
      floorGoal: goals.floors || 10,
      calories: summary.caloriesOut || 0,
      activeMinutes: (summary.fairlyActiveMinutes || 0) + (summary.veryActiveMinutes || 0),
      restingHeartRate: rHR,
      lastSyncTime: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Fitbit Logic Error:', error);
    return NextResponse.json({ error: 'Failed to process Fitbit data' }, { status: 500 });
  }
}

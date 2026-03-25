import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import * as fs from 'fs';
import * as path from 'path';

const API_KEY = process.env.OPENWEATHER_API_KEY;
const SETTINGS_PATH = path.join(process.cwd(), '.dashboard-settings.json');

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
  location: string;
  timezone: number;
  unit: 'C' | 'F';
  sunrise: string;
  sunset: string;
  forecast: {
    time: string;
    date: string;
    temp: number;
    condition: string;
    icon: string;
  }[];
}

async function fetchWithRetry(url: string, retries = 3, timeout = 10000) {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (response.ok) return response;
      if (response.status === 401 || response.status === 404) return response;
    } catch (e) {
      if (i === retries - 1) throw e;
      logger.warn(`Weather: Fetch failed, retrying (${i + 1}/${retries})...`);
      await new Promise(res => setTimeout(res, 1000));
    } finally {
      clearTimeout(id);
    }
  }
  throw new Error('All weather fetch retries failed');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locationOverride = searchParams.get('location');
  
  let unit: 'C' | 'F' = 'C';
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
      if (settings.weatherUnit) unit = settings.weatherUnit;
    }
  } catch (e) {}

  const openWeatherUnit = unit === 'F' ? 'imperial' : 'metric';

  const mockData: WeatherData = {
    temp: unit === 'C' ? 18 : 64,
    condition: 'Partly Cloudy',
    icon: '02d',
    location: 'London (Mock)',
    timezone: 0,
    unit,
    sunrise: '06:15',
    sunset: '18:45',
    forecast: [
      { time: '15:00', date: 'Today', temp: unit === 'C' ? 19 : 66, condition: 'Sunny', icon: '01d' },
      { time: '18:00', date: 'Today', temp: unit === 'C' ? 17 : 62, condition: 'Cloudy', icon: '03d' },
      { time: '21:00', date: 'Today', temp: unit === 'C' ? 14 : 57, condition: 'Rain', icon: '10d' },
      { time: '00:00', date: 'Tomorrow', temp: unit === 'C' ? 12 : 53, condition: 'Clear', icon: '01n' },
    ]
  };

  if (!API_KEY || API_KEY === 'your_key_here') {
    return NextResponse.json(mockData);
  }

  try {
    let geo = { lat: 54.5973, lon: -5.9301, name: 'Belfast' };

    if (locationOverride) {
      const geoRes = await fetchWithRetry(`http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(locationOverride)}&limit=1&appid=${API_KEY}`);
      const geoData = await geoRes.json();
      if (geoData && geoData.length > 0) {
        geo = { lat: geoData[0].lat, lon: geoData[0].lon, name: geoData[0].name };
      }
    }

    const weatherRes = await fetchWithRetry(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${geo.lat}&lon=${geo.lon}&units=${openWeatherUnit}&appid=${API_KEY}`
    );
    const wData = await weatherRes.json();

    if (weatherRes.status !== 200 || !wData.list) {
      return NextResponse.json({ ...mockData, location: `${geo.name} (Offline)` });
    }

    const formatSunTime = (timestamp: number) => {
      return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const current = wData.list[0];
    const forecast = wData.list.map((item: any) => {
      const date = new Date(item.dt * 1000);
      const isToday = date.toDateString() === new Date().toDateString();
      return {
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        date: isToday ? 'Today' : date.toLocaleDateString([], { weekday: 'short' }).toUpperCase(),
        temp: Math.round(item.main.temp),
        condition: item.weather[0].main,
        icon: item.weather[0].icon
      };
    });

    return NextResponse.json({
      temp: Math.round(current.main.temp),
      condition: current.weather[0].main,
      icon: current.weather[0].icon,
      location: geo.name,
      timezone: wData.city.timezone,
      unit,
      sunrise: formatSunTime(wData.city.sunrise),
      sunset: formatSunTime(wData.city.sunset),
      forecast
    });

  } catch (error) {
    logger.error('Weather API Error', error);
    return NextResponse.json(mockData);
  }
}

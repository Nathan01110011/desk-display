import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const API_KEY = process.env.OPENWEATHER_API_KEY;

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
  location: string;
  timezone: number;
  forecast: {
    time: string;
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

  const mockData: WeatherData = {
    temp: 18,
    condition: 'Partly Cloudy',
    icon: '02d',
    location: 'London (Mock)',
    timezone: 0,
    forecast: [
      { time: '15:00', temp: 19, condition: 'Sunny', icon: '01d' },
      { time: '18:00', temp: 17, condition: 'Cloudy', icon: '03d' },
      { time: '21:00', temp: 14, condition: 'Rain', icon: '10d' },
      { time: '00:00', temp: 12, condition: 'Clear', icon: '01n' },
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
      `https://api.openweathermap.org/data/2.5/forecast?lat=${geo.lat}&lon=${geo.lon}&units=metric&appid=${API_KEY}`
    );
    const wData = await weatherRes.json();

    if (weatherRes.status !== 200 || !wData.list) {
      return NextResponse.json({ ...mockData, location: `${geo.name} (Offline)` });
    }

    const current = wData.list[0];
    logger.debug(`Weather: Mapping ${wData.list.length} intervals starting from index 0`);

    const forecast = wData.list.slice(0, 4).map((item: any) => ({
      time: new Date(item.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      temp: Math.round(item.main.temp),
      condition: item.weather[0].main,
      icon: item.weather[0].icon
    }));

    return NextResponse.json({
      temp: Math.round(current.main.temp),
      condition: current.weather[0].main,
      icon: current.weather[0].icon,
      location: geo.name,
      timezone: wData.city.timezone,
      forecast
    });

  } catch (error) {
    logger.error('Weather API Error', error);
    return NextResponse.json(mockData);
  }
}

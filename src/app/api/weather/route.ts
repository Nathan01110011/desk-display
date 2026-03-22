import { NextRequest, NextResponse } from 'next/server';
import { WeatherData } from '@/types';

const API_KEY = process.env.OPENWEATHER_API_KEY;

// Cache: 30 minutes
let cache: { data: WeatherData; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

async function getGeo(location?: string) {
  if (location) {
    const res = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${API_KEY}`);
    const data = await res.json();
    if (data.length > 0) return { lat: data[0].lat, lon: data[0].lon, name: data[0].name };
  }

  // Auto-locate via IP-API (Free, no key)
  const ipRes = await fetch('http://ip-api.com/json/');
  const ipData = await ipRes.json();
  return { lat: ipData.lat, lon: ipData.lon, name: ipData.city };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locationOverride = searchParams.get('location');
  const now = Date.now();

  // Simple cache (only if no override)
  if (!locationOverride && cache && now - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

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
    ]
  };

  if (!API_KEY || API_KEY === 'your_key_here') {
    return NextResponse.json(mockData);
  }

  try {
    const geo = await getGeo(locationOverride || undefined);

    // Fetch Current + Forecast
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${geo.lat}&lon=${geo.lon}&units=metric&cnt=4&appid=${API_KEY}`
    );
    const wData = await weatherRes.json();

    if (weatherRes.status !== 200 || !wData.list) {
      console.error('OpenWeather Error:', wData);
      return NextResponse.json({ ...mockData, location: `${geo.name} (Offline)` });
    }

    const current = wData.list[0];
    const forecast = wData.list.slice(1, 4).map((item: { dt: number; main: { temp: number }; weather: { main: string; icon: string }[] }) => ({
      time: new Date(item.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      temp: Math.round(item.main.temp),
      condition: item.weather[0].main,
      icon: item.weather[0].icon
    }));

    const result: WeatherData = {
      temp: Math.round(current.main.temp),
      condition: current.weather[0].main,
      icon: current.weather[0].icon,
      location: geo.name,
      timezone: wData.city.timezone, // Offset in seconds
      forecast
    };

    if (!locationOverride) {
      cache = { data: result, timestamp: now };
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error('Weather API Error:', e);
    return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 });
  }
}

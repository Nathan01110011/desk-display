import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.OPENWEATHER_API_KEY;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city');

  if (!city || !API_KEY) {
    return NextResponse.json({ error: 'Missing city or API key' }, { status: 400 });
  }

  try {
    // 1. Geocode
    const geoRes = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`);
    const geoData = await geoRes.json();
    
    if (geoData.length === 0) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    const { lat, lon, name } = geoData[0];

    // 2. Get Timezone offset via Weather API
    const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
    const wData = await weatherRes.json();

    return NextResponse.json({
      city: name,
      offset: wData.timezone // seconds from UTC
    });
  } catch {
    return NextResponse.json({ error: 'Failed to resolve city' }, { status: 500 });
  }
}

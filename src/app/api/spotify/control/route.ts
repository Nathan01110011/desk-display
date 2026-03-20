import { NextRequest, NextResponse } from 'next/server';

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

async function getAccessToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh_token!,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Spotify Refresh Error:', data);
    throw new Error('Failed to refresh token');
  }
  return data.access_token;
}

export async function POST(req: NextRequest) {
  const { action } = await req.json();

  if (!refresh_token) {
    return NextResponse.json({ success: false, error: 'No refresh token' }, { status: 401 });
  }

  try {
    const access_token = await getAccessToken();
    
    // Spotify API endpoints
    let endpoint = 'https://api.spotify.com/v1/me/player/pause';
    if (action === 'play') endpoint = 'https://api.spotify.com/v1/me/player/play';
    if (action === 'next') endpoint = 'https://api.spotify.com/v1/me/player/next';

    const method = action === 'next' ? 'POST' : 'PUT';

    const response = await fetch(endpoint, {
      method: method,
      headers: {
        Authorization: `Bearer ${access_token}`,
      }
    });

    if (response.ok || response.status === 204) {
      return NextResponse.json({ success: true });
    }

    const errorData = await response.json().catch(() => ({}));
    console.error(`Spotify Control Error (${action}):`, response.status, errorData);
    return NextResponse.json({ success: false, error: errorData }, { status: response.status });
  } catch (error) {
    console.error('Spotify Control Exception:', error);
    return NextResponse.json({ success: false, error: 'Failed to control playback' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSpotifyRefreshToken } from '@/lib/spotifyAuth';

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

async function getAccessToken(refreshToken: string) {
  if (!client_id || !client_secret) {
    throw new Error('Spotify client credentials are not configured');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({})) as { access_token?: string; error?: string; error_description?: string };
  if (!response.ok || !data.access_token) {
    console.error('[Spotify] Refresh error:', data);
    throw new Error(data.error_description || data.error || 'Failed to refresh token');
  }
  return data.access_token;
}

export async function POST(req: NextRequest) {
  const { action } = await req.json();
  const refreshToken = getSpotifyRefreshToken();

  if (!refreshToken) {
    return NextResponse.json({ success: false, authRequired: true, error: 'No refresh token' }, { status: 401 });
  }

  try {
    const access_token = await getAccessToken(refreshToken);

    let endpoint = 'https://api.spotify.com/v1/me/player/pause';
    if (action === 'play') endpoint = 'https://api.spotify.com/v1/me/player/play';
    if (action === 'next') endpoint = 'https://api.spotify.com/v1/me/player/next';

    const method = action === 'next' ? 'POST' : 'PUT';
    const response = await fetch(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
      cache: 'no-store',
    });

    if (response.ok || response.status === 204) {
      return NextResponse.json({ success: true });
    }

    const errorData = await response.json().catch(() => ({}));
    console.error(`[Spotify] Control error (${action}):`, response.status, errorData);
    return NextResponse.json({ success: false, error: errorData }, { status: response.status });
  } catch (error) {
    console.error('[Spotify] Control exception:', error);
    return NextResponse.json({ success: false, error: 'Failed to control playback' }, { status: 500 });
  }
}

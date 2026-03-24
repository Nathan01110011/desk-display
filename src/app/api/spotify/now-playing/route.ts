import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, timeout = 10000) {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (response.status === 204 || response.status === 401) return response;
      if (response.ok) return response;
    } catch (e) {
      if (i === retries - 1) throw e;
      logger.warn(`Spotify: Fetch failed, retrying (${i + 1}/${retries})...`);
      await new Promise(res => setTimeout(res, 1000));
    } finally {
      clearTimeout(id);
    }
  }
  throw new Error('All Spotify fetch retries failed');
}

async function getAccessToken() {
  try {
    const response = await fetchWithRetry('https://accounts.spotify.com/api/token', {
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
    return data.access_token;
  } catch (e) {
    logger.error('Failed to get Spotify access token', e);
    throw e;
  }
}

export async function GET() {
  if (!refresh_token) {
    return NextResponse.json({ isPlaying: false, error: 'Spotify token not configured' });
  }

  try {
    const access_token = await getAccessToken();
    const response = await fetchWithRetry('https://api.spotify.com/v1/me/player/currently-playing?additional_types=episode', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
      cache: 'no-store'
    });

    if (response.status === 204) return NextResponse.json({ isPlaying: false, status: 'NO_CONTENT' });
    
    const song = await response.json();

    if (song.item) {
      logger.debug(`Spotify Data: Type: ${song.currently_playing_type} | Item: ${song.item.name}`);
    }
    
    if (response.status >= 400 || !song || !song.item) {
      return NextResponse.json({ isPlaying: false, status: 'NO_ITEM' });
    }

    const isPlaying = song.is_playing;
    const type = song.currently_playing_type;
    const item = song.item;
    
    const title = item.name || 'Unknown Title';
    let artist = 'Unknown Artist';
    if (type === 'episode') artist = item.show?.name || 'Podcast';
    else artist = item.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist';

    let album = 'Unknown Album';
    if (type === 'episode') album = item.show?.publisher || 'Podcast';
    else album = item.album?.name || 'Single';

    let albumImageUrl = '';
    if (item.images && item.images.length > 0) {
      albumImageUrl = item.images[0].url;
    } else if (item.album?.images && item.album.images.length > 0) {
      albumImageUrl = item.album.images[0].url;
    }

    return NextResponse.json({
      isPlaying,
      title,
      artist,
      album,
      albumImageUrl,
      progressMs: song.progress_ms || 0,
      durationMs: item.duration_ms || 0,
    });
  } catch (error) {
    logger.error('Spotify API Error', error);
    return NextResponse.json({ isPlaying: false, error: 'Failed to fetch Spotify status' });
  }
}

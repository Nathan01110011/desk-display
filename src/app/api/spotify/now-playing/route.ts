import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getSpotifyRefreshToken } from '@/lib/spotifyAuth';

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

interface SpotifyArtist {
  name: string;
}

interface SpotifyImage {
  url: string;
}

interface SpotifyTrackItem {
  name?: string;
  artists?: SpotifyArtist[];
  album?: {
    name?: string;
    images?: SpotifyImage[];
  };
  images?: SpotifyImage[];
  duration_ms?: number;
}

interface SpotifyEpisodeItem {
  name?: string;
  show?: {
    name?: string;
    publisher?: string;
  };
  images?: SpotifyImage[];
  duration_ms?: number;
}

type SpotifyPlayerItem = SpotifyTrackItem | SpotifyEpisodeItem;

interface SpotifyCurrentlyPlaying {
  is_playing?: boolean;
  currently_playing_type?: 'track' | 'episode' | string;
  item?: SpotifyPlayerItem;
  progress_ms?: number;
}

interface SpotifyErrorPayload {
  error?: string | {
    status?: number;
    message?: string;
  };
  error_description?: string;
  access_token?: string;
}

class SpotifyReauthorizationRequiredError extends Error {}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, timeout = 15000) {
  let lastStatus: number | null = null;

  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      lastStatus = response.status;

      if (response.ok || response.status === 204 || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      if (i < retries - 1) {
        logger.warn(`Spotify: HTTP ${response.status}, retrying (${i + 1}/${retries})...`);
        await new Promise(res => setTimeout(res, 2000));
      }
    } catch (error) {
      if (i === retries - 1) throw error;
      logger.warn(`Spotify: Fetch failed, retrying (${i + 1}/${retries})...`);
      await new Promise(res => setTimeout(res, 2000));
    } finally {
      clearTimeout(id);
    }
  }

  throw new Error(`All Spotify fetch retries failed${lastStatus ? ` (last HTTP ${lastStatus})` : ''}`);
}

function describeSpotifyError(data: SpotifyErrorPayload, status: number): string {
  if (typeof data.error === 'string') {
    return `${data.error}${data.error_description ? `: ${data.error_description}` : ''}`;
  }

  if (data.error && typeof data.error === 'object') {
    return data.error.message || `Spotify API error ${data.error.status || status}`;
  }

  return `Spotify returned HTTP ${status}`;
}

async function getAccessToken(currentRefreshToken: string) {
  if (!client_id || !client_secret) {
    throw new Error('Spotify client credentials are not configured');
  }

  const response = await fetchWithRetry('https://accounts.spotify.com/api/token', {
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

  const data = await response.json().catch(() => ({})) as SpotifyErrorPayload;

  if (!response.ok) {
    const description = describeSpotifyError(data, response.status);
    logger.error(`Spotify token refresh failed: HTTP ${response.status} - ${description}`);

    if (typeof data.error === 'string' && data.error === 'invalid_grant') {
      throw new SpotifyReauthorizationRequiredError(description);
    }

    throw new Error(`Spotify token refresh failed (HTTP ${response.status}: ${description})`);
  }

  if (!data.access_token) {
    throw new Error('Spotify token refresh succeeded but returned no access token');
  }

  return data.access_token;
}

export async function GET() {
  const refreshToken = getSpotifyRefreshToken();

  if (!refreshToken) {
    return NextResponse.json({
      isPlaying: false,
      authRequired: true,
      error: 'Spotify authorization required',
      diagnostic: 'No Spotify refresh token is configured.',
    }, { status: 401 });
  }

  try {
    const access_token = await getAccessToken(refreshToken);
    const response = await fetchWithRetry('https://api.spotify.com/v1/me/player/currently-playing?additional_types=episode', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
      cache: 'no-store'
    });

    if (response.status === 204) {
      return NextResponse.json({ isPlaying: false, status: 'NO_CONTENT' });
    }

    const song = await response.json().catch(() => ({})) as SpotifyCurrentlyPlaying & SpotifyErrorPayload;

    if (!response.ok) {
      const diagnostic = describeSpotifyError(song, response.status);
      logger.error(`Spotify currently-playing failed: HTTP ${response.status} - ${diagnostic}`);
      return NextResponse.json({
        isPlaying: false,
        error: 'Spotify currently-playing request failed',
        diagnostic: `HTTP ${response.status}: ${diagnostic}`,
      }, { status: response.status });
    }

    if (!song.item) {
      return NextResponse.json({ isPlaying: false, status: 'NO_ITEM' });
    }

    logger.debug(`Spotify Data: Type: ${song.currently_playing_type} | Item: ${song.item.name}`);

    const isPlaying = song.is_playing;
    const type = song.currently_playing_type;
    const item = song.item;

    const title = item.name || 'Unknown Title';
    let artist = 'Unknown Artist';
    if (type === 'episode') artist = (item as SpotifyEpisodeItem).show?.name || 'Podcast';
    else artist = (item as SpotifyTrackItem).artists?.map((a) => a.name).join(', ') || 'Unknown Artist';

    let album = 'Unknown Album';
    if (type === 'episode') album = (item as SpotifyEpisodeItem).show?.publisher || 'Podcast';
    else album = (item as SpotifyTrackItem).album?.name || 'Single';

    let albumImageUrl = '';
    if (item.images && item.images.length > 0) {
      albumImageUrl = item.images[0].url;
    } else if ('album' in item && item.album?.images && item.album.images.length > 0) {
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
    const diagnostic = error instanceof Error ? error.message : String(error);
    logger.error('Spotify API Error', error);

    if (error instanceof SpotifyReauthorizationRequiredError) {
      return NextResponse.json({
        isPlaying: false,
        authRequired: true,
        error: 'Spotify authorization expired',
        diagnostic,
      }, { status: 401 });
    }

    return NextResponse.json({
      isPlaying: false,
      error: 'Failed to fetch Spotify status',
      diagnostic,
    }, { status: 502 });
  }
}

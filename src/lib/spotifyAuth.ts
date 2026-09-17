import * as fs from 'fs';
import * as path from 'path';

const SPOTIFY_AUTH_PATH = path.join(process.cwd(), '.spotify-auth.json');

interface SpotifyAuthFile {
  refreshToken?: string;
  updatedAt?: string;
}

export function getSpotifyRefreshToken(): string | null {
  try {
    if (fs.existsSync(SPOTIFY_AUTH_PATH)) {
      const data = JSON.parse(fs.readFileSync(SPOTIFY_AUTH_PATH, 'utf-8')) as SpotifyAuthFile;
      if (data.refreshToken?.trim()) return data.refreshToken.trim();
    }
  } catch (error) {
    console.error('[Spotify] Failed to read saved refresh token', error);
  }

  return process.env.SPOTIFY_REFRESH_TOKEN?.trim() || null;
}

export function saveSpotifyRefreshToken(refreshToken: string) {
  const token = refreshToken.trim();
  if (!token) throw new Error('Cannot save an empty Spotify refresh token');

  const data: SpotifyAuthFile = {
    refreshToken: token,
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(SPOTIFY_AUTH_PATH, JSON.stringify(data, null, 2), { mode: 0o600 });
}

export function getSpotifyRedirectUri() {
  return process.env.SPOTIFY_REDIRECT_URI?.trim() || 'http://127.0.0.1:3000/api/spotify/callback';
}

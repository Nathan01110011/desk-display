import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { getSpotifyRedirectUri } from '@/lib/spotifyAuth';

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const redirectUri = getSpotifyRedirectUri();
  const scope = 'user-read-currently-playing user-read-playback-state user-modify-playback-state';

  if (!clientId) {
    return NextResponse.json(
      { error: 'SPOTIFY_CLIENT_ID is missing from the server environment.' },
      { status: 500 },
    );
  }

  const state = randomBytes(24).toString('hex');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope,
    redirect_uri: redirectUri,
    state,
    show_dialog: 'true',
  });

  const response = NextResponse.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
  response.cookies.set('spotify_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: redirectUri.startsWith('https://'),
    maxAge: 10 * 60,
    path: '/',
  });

  return response;
}

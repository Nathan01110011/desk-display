import { NextRequest, NextResponse } from 'next/server';
import { getSpotifyRedirectUri, saveSpotifyRefreshToken } from '@/lib/spotifyAuth';
import { disableOnScreenKeyboard } from '@/lib/systemKeyboard';

interface SpotifyTokenResponse {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

export async function GET(req: NextRequest) {
  if (process.platform === 'linux') {
    disableOnScreenKeyboard();
  }

  const code = req.nextUrl.searchParams.get('code');
  const returnedState = req.nextUrl.searchParams.get('state');
  const spotifyError = req.nextUrl.searchParams.get('error');
  const expectedState = req.cookies.get('spotify_oauth_state')?.value;
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  const redirectUri = getSpotifyRedirectUri();

  if (spotifyError) {
    return NextResponse.redirect(new URL(`/?spotify=error&reason=${encodeURIComponent(spotifyError)}`, req.url));
  }

  if (!expectedState || !returnedState || expectedState !== returnedState) {
    return NextResponse.json({ error: 'Spotify authorization state validation failed.' }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'Spotify did not return an authorization code.' }, { status: 400 });
  }

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Spotify client credentials are not configured.' }, { status: 500 });
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({})) as SpotifyTokenResponse;

    if (!response.ok || !data.refresh_token) {
      const reason = data.error_description || data.error || `HTTP ${response.status}`;
      console.error('[Spotify] Authorization code exchange failed:', reason);
      return NextResponse.redirect(new URL(`/?spotify=error&reason=${encodeURIComponent(reason)}`, req.url));
    }

    saveSpotifyRefreshToken(data.refresh_token);
    console.info('[Spotify] Authorization refreshed successfully');

    const redirect = NextResponse.redirect(new URL('/?spotify=reconnected', req.url));
    redirect.cookies.delete('spotify_oauth_state');
    return redirect;
  } catch (error) {
    console.error('[Spotify] Failed to save refreshed authorization', error);
    return NextResponse.redirect(new URL('/?spotify=error&reason=token_exchange_failed', req.url));
  }
}

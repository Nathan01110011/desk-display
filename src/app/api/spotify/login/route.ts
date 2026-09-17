import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { getSpotifyRedirectUri } from '@/lib/spotifyAuth';
import { enableOnScreenKeyboard } from '@/lib/systemKeyboard';

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

  if (process.platform === 'linux') {
    const keyboard = await enableOnScreenKeyboard();
    if (!keyboard.success) {
      return new NextResponse(
        `<!doctype html><html><body style="font-family:sans-serif;background:#111;color:#eee;padding:32px;line-height:1.5"><button onclick="window.close();location.href='/'" aria-label="Close" style="position:fixed;right:24px;top:18px;border:0;border-radius:999px;width:44px;height:44px;font-size:24px;background:#333;color:#fff">×</button><h1>Spotify reconnect needs a keyboard</h1><p>${keyboard.error}</p><p>Install or fix one of the supported on-screen keyboards, then try Reconnect again.</p><p><a href="/" style="color:#7dd3fc">Return to Desk Display</a></p></body></html>`,
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      );
    }
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

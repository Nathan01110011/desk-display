import { NextRequest, NextResponse } from 'next/server';
import { getSpotifyRedirectUri, saveSpotifyRefreshToken } from '@/lib/spotifyAuth';
import { disableOnScreenKeyboard } from '@/lib/systemKeyboard';

interface SpotifyTokenResponse {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

function popupResult(success: boolean, message: string) {
  const safeMessage = JSON.stringify(message);
  const safeType = success ? 'spotify-auth-complete' : 'spotify-auth-error';
  const autoClose = success
    ? "setTimeout(()=>{fetch('/api/spotify/auth-window',{method:'DELETE'}).catch(()=>{});},700);"
    : '';

  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>Spotify Authorization</title></head><body style="margin:0;background:#111;color:#eee;font-family:sans-serif;min-height:100vh;display:grid;place-items:center"><button onclick="closeAuth()" aria-label="Close" style="position:fixed;right:24px;top:18px;border:0;border-radius:999px;width:48px;height:48px;font-size:28px;background:#333;color:#fff">×</button><main style="text-align:center;padding:32px;max-width:560px"><h1>${success ? 'Spotify connected' : 'Spotify connection failed'}</h1><p style="color:#bbb">${message}</p><button onclick="closeAuth()" style="margin-top:18px;padding:12px 22px;border-radius:12px;border:1px solid #555;background:#222;color:#fff;font-weight:700">Close &amp; return to Desk Display</button></main><script>async function closeAuth(){try{await fetch('/api/spotify/auth-window',{method:'DELETE'});}catch(e){}}try{if(window.opener&&!window.opener.closed){window.opener.postMessage({type:'${safeType}',message:${safeMessage}},window.location.origin);}}catch(e){}${autoClose}</script></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
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
    return popupResult(false, `Spotify returned: ${spotifyError}`);
  }

  if (!expectedState || !returnedState || expectedState !== returnedState) {
    return popupResult(false, 'Spotify authorization state validation failed.');
  }

  if (!code) {
    return popupResult(false, 'Spotify did not return an authorization code.');
  }

  if (!clientId || !clientSecret) {
    return popupResult(false, 'Spotify client credentials are not configured.');
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
      return popupResult(false, reason);
    }

    saveSpotifyRefreshToken(data.refresh_token);
    console.info('[Spotify] Authorization refreshed successfully');

    const result = popupResult(true, 'Authorization saved. Desk Display will relaunch automatically.');
    result.cookies.delete('spotify_oauth_state');
    return result;
  } catch (error) {
    console.error('[Spotify] Failed to save refreshed authorization', error);
    return popupResult(false, 'The token exchange failed. Check Console Logs for details.');
  }
}

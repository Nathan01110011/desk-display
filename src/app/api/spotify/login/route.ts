import { NextResponse } from 'next/server';

export async function GET() {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const redirect_uri = 'http://127.0.0.1:3000/api/spotify/callback';
  const scope = 'user-read-currently-playing user-read-playback-state user-modify-playback-state';

  if (!client_id) {
    return new NextResponse(`
      <h1 style="color: red;">Configuration Error</h1>
      <p>SPOTIFY_CLIENT_ID is missing from your environment variables.</p>
    `, { headers: { 'Content-Type': 'text/html' } });
  }

  // Debug check: ensures no quotes or whitespace are messing up the ID
  const clean_id = client_id.trim().replace(/^["'](.+)["']$/, '$1');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clean_id,
    scope: scope,
    redirect_uri: redirect_uri,
    show_dialog: 'true',
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  
  // Return a debug page first so you can see exactly what is being sent
  return new NextResponse(`
    <html>
      <body style="font-family: sans-serif; padding: 40px; line-height: 1.6;">
        <h1>Spotify Auth Debug</h1>
        <p><b>Client ID detected:</b> <code>${clean_id.substring(0, 5)}...</code> (Length: ${clean_id.length})</p>
        <p><b>Redirect URI:</b> <code>${redirect_uri}</code></p>
        <hr />
        <p>If the ID above looks correct (matches your Spotify Dashboard), click below:</p>
        <a href="${authUrl}" style="display: inline-block; background: #1DB954; color: white; padding: 12px 24px; text-decoration: none; border-radius: 50px; font-weight: bold;">
          Connect to Spotify
        </a>
        <p style="margin-top: 20px; font-size: 0.8em; color: #666;">
          Note: If Spotify still says "Invalid Client", double check that you haven't copied the "Client Secret" into the "Client ID" field.
        </p>
      </body>
    </html>
  `, { headers: { 'Content-Type': 'text/html' } });
}

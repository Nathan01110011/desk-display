import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET;
const SETTINGS_PATH = path.join(process.cwd(), '.dashboard-settings.json');

function saveGoogleHealthRefreshToken(refreshToken: string) {
  let settings = {};
  if (fs.existsSync(SETTINGS_PATH)) {
    settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
  }
  fs.writeFileSync(
    SETTINGS_PATH,
    JSON.stringify({ ...settings, googleHealthRefreshToken: refreshToken }, null, 2),
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No code provided' });
  }

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'GOOGLE_HEALTH_CLIENT_ID and GOOGLE_HEALTH_CLIENT_SECRET must be configured in .env.local' },
      { status: 500 },
    );
  }

  const redirectUri = process.env.GOOGLE_HEALTH_REDIRECT_URI
    || new URL('/api/google-health/callback', request.url).toString();

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.refresh_token) {
      return NextResponse.json({ error: data }, { status: response.status || 500 });
    }

    saveGoogleHealthRefreshToken(data.refresh_token);

    return new NextResponse(`
      <div style="font-family: sans-serif; padding: 40px; background: #000; color: white; min-height: 100vh;">
        <h1>Google Health Authentication Successful</h1>
        <p>Your refresh token has been saved to <strong>.dashboard-settings.json</strong>.</p>
        <p>You can also keep this in <strong>.env.local</strong> if you prefer:</p>
        <pre style="background: #222; padding: 20px; border-radius: 8px; overflow-x: auto; color: #00ff00; border: 1px solid #333;">GOOGLE_HEALTH_REFRESH_TOKEN=${data.refresh_token}</pre>
        <p>After changing env vars, restart your dev server.</p>
        <a href="/" style="color: #3b82f6; text-decoration: none;">Back to Dashboard</a>
      </div>
    `, { headers: { 'Content-Type': 'text/html' } });
  } catch (error) {
    console.error('Google Health Auth Error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

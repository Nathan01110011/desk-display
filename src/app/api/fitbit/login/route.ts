import { NextResponse } from 'next/server';

const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
const scopes = [
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
  'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
];

export async function GET(request: Request) {
  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_HEALTH_CLIENT_ID not configured in .env.local' }, { status: 500 });
  }

  const redirectUri = process.env.GOOGLE_HEALTH_REDIRECT_URI
    || new URL('/api/fitbit/callback', request.url).toString();

  const queryParams = new URLSearchParams({
    access_type: 'offline',
    client_id: clientId,
    prompt: 'consent',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${queryParams.toString()}`);
}

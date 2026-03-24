import { NextResponse } from 'next/server';

const client_id = process.env.FITBIT_CLIENT_ID;
const redirect_uri = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3000/api/fitbit/callback'
  : 'http://localhost:3000/api/fitbit/callback'; // Adjust if production URL differs

export async function GET() {
  if (!client_id) {
    return NextResponse.json({ error: 'FITBIT_CLIENT_ID not configured in .env.local' }, { status: 500 });
  }

  const scope = 'activity heartrate profile sleep weight';
  
  const queryParams = new URLSearchParams({
    response_type: 'code',
    client_id: client_id,
    scope: scope,
    redirect_uri: redirect_uri,
  });

  console.log('Fitbit: Redirecting to auth with ID:', client_id);
  const authUrl = `https://www.fitbit.com/oauth2/authorize?${queryParams.toString()}`;
  console.log('Fitbit: Full Auth URL:', authUrl);

  return NextResponse.redirect(authUrl);
}

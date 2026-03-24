import { NextResponse } from 'next/server';

const client_id = process.env.FITBIT_CLIENT_ID;
const client_secret = process.env.FITBIT_CLIENT_SECRET;
const redirect_uri = 'http://localhost:3000/api/fitbit/callback';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No code provided' });
  }

  try {
    const response = await fetch('https://api.fitbit.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri,
      }),
    });

    const data = await response.json();

    if (data.errors) {
      return NextResponse.json({ error: data.errors });
    }

    return new NextResponse(`
      <div style="font-family: sans-serif; padding: 40px; background: #000; color: white; min-height: 100vh;">
        <h1>Fitbit Authentication Successful!</h1>
        <p>Copy this Refresh Token and add it to your <strong>.env.local</strong> file:</p>
        <pre style="background: #222; padding: 20px; border-radius: 8px; overflow-x: auto; color: #00ff00; border: 1px solid #333;">FITBIT_REFRESH_TOKEN=${data.refresh_token}</pre>
        <p>After updating the file, restart your dev server.</p>
        <a href="/" style="color: #3b82f6; text-decoration: none;">← Back to Dashboard</a>
      </div>
    `, { headers: { 'Content-Type': 'text/html' } });

  } catch (error) {
    console.error('Fitbit Auth Error:', error);
    return NextResponse.json({ error: 'Authentication failed' });
  }
}

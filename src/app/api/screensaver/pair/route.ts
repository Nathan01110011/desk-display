import { networkInterfaces } from 'node:os';
import QRCode from 'qrcode';
import { NextResponse } from 'next/server';
import { createPhotoPairingSession, endPhotoPairingSession } from '@/lib/photoPairing';

export const runtime = 'nodejs';

function getUploadOrigin(request: Request) {
  if (process.env.PHOTO_UPLOAD_PUBLIC_URL) return process.env.PHOTO_UPLOAD_PUBLIC_URL.replace(/\/$/, '');

  const requestUrl = new URL(request.url);
  if (requestUrl.hostname !== 'localhost' && requestUrl.hostname !== '127.0.0.1') return requestUrl.origin;

  const addresses = Object.values(networkInterfaces())
    .flatMap(entries => entries || [])
    .filter(entry => entry.family === 'IPv4' && !entry.internal)
    .map(entry => entry.address);
  const address = addresses.find(value => value.startsWith('192.168.') || value.startsWith('10.') || /^172\.(1[6-9]|2\d|3[01])\./.test(value)) || addresses[0];
  if (!address) throw new Error('No local network address is available.');

  return `${requestUrl.protocol}//${address}${requestUrl.port ? `:${requestUrl.port}` : ''}`;
}

export async function POST(request: Request) {
  try {
    const { token, expiresAt } = await createPhotoPairingSession();
    const uploadUrl = `${getUploadOrigin(request)}/gallery/upload?token=${encodeURIComponent(token)}`;
    const qrCode = await QRCode.toDataURL(uploadUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 560,
      color: { dark: '#050505', light: '#ffffff' },
    });
    return NextResponse.json({ token, expiresAt, uploadUrl, qrCode });
  } catch (error) {
    console.error('Failed to start photo pairing', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to start pairing.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  await endPhotoPairingSession(new URL(request.url).searchParams.get('token'));
  return NextResponse.json({ success: true });
}

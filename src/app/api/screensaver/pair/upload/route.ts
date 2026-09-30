import { NextResponse } from 'next/server';
import { validatePhotoPairingToken } from '@/lib/photoPairing';
import { saveGalleryPhotos } from '@/lib/gallery';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const token = formData.get('token');
    if (typeof token !== 'string' || !await validatePhotoPairingToken(token)) {
      return NextResponse.json({ error: 'This upload session has expired. Start a new one on the display.' }, { status: 401 });
    }

    const files = formData.getAll('photos').filter((entry): entry is File => entry instanceof File);
    const photos = await saveGalleryPhotos(files);
    return NextResponse.json({ success: true, count: files.length, photos });
  } catch (error) {
    console.error('Paired photo upload failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed.' }, { status: 400 });
  }
}

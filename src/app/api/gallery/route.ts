import { NextResponse } from 'next/server';
import { deleteGalleryPhoto, listGalleryPhotos, saveGalleryPhotos, setGalleryPhotoFavorite } from '@/lib/gallery';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ photos: await listGalleryPhotos() });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('photos').filter((entry): entry is File => entry instanceof File);
    return NextResponse.json({ success: true, photos: await saveGalleryPhotos(files) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed.' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { name, favorite } = await request.json() as { name?: string; favorite?: boolean };
    if (!name || typeof favorite !== 'boolean') throw new Error('Invalid gallery update.');
    return NextResponse.json({ success: true, photos: await setGalleryPhotoFavorite(name, favorite) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Update failed.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const name = new URL(request.url).searchParams.get('name');
    if (!name) throw new Error('Invalid photo name.');
    return NextResponse.json({ success: true, photos: await deleteGalleryPhoto(name) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Delete failed.' }, { status: 400 });
  }
}

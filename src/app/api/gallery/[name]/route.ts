import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { galleryPhotoPath } from '@/lib/gallery';

export const runtime = 'nodejs';

const CONTENT_TYPES: Record<string, string> = {
  '.gif': 'image/gif', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
};

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const target = galleryPhotoPath(name);
  if (!target) return new Response('Not found', { status: 404 });
  try {
    return new Response(await readFile(target), {
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable', 'Content-Type': CONTENT_TYPES[path.extname(name).toLowerCase()] || 'application/octet-stream' },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

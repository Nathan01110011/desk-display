import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { galleryVariantPath } from '@/lib/gallery';

export const runtime = 'nodejs';

const CONTENT_TYPES: Record<string, string> = {
  '.gif': 'image/gif', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
};

export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const variant = new URL(request.url).searchParams.get('variant');
  const target = galleryVariantPath(name, variant);
  if (!target) return new Response('Not found', { status: 404 });
  try {
    return new Response(await readFile(target), {
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable', 'Content-Type': variant ? 'image/webp' : CONTENT_TYPES[path.extname(name).toLowerCase()] || 'application/octet-stream' },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

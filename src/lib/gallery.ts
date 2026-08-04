import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { GalleryPhoto } from '@/types';

export const GALLERY_DIR = process.env.GALLERY_PHOTO_DIR
  ? path.resolve(process.env.GALLERY_PHOTO_DIR)
  : path.join(process.cwd(), 'data', 'gallery');
const LEGACY_PHOTO_DIR = path.join(process.cwd(), 'data', 'screensaver-photos');
const METADATA_PATH = path.join(GALLERY_DIR, '.gallery.json');
const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

interface GalleryMetadata {
  favorites: string[];
}

function isSupportedName(name: string) {
  return SUPPORTED_EXTENSIONS.has(path.extname(name).toLowerCase());
}

function safeName(name: string) {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function resolvePhoto(name: string) {
  const safe = safeName(name);
  if (!safe || safe !== name || !isSupportedName(safe)) return null;
  return path.join(GALLERY_DIR, safe);
}

async function ensureGallery() {
  await mkdir(GALLERY_DIR, { recursive: true });
  try {
    const legacyFiles = (await readdir(LEGACY_PHOTO_DIR)).filter(isSupportedName);
    await Promise.all(legacyFiles.map(async name => {
      try {
        await copyFile(path.join(LEGACY_PHOTO_DIR, name), path.join(GALLERY_DIR, name), 1);
      } catch (error) {
        const code = error instanceof Error && 'code' in error ? error.code : null;
        if (code !== 'EEXIST') throw error;
      }
    }));
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? error.code : null;
    if (code !== 'ENOENT') throw error;
  }
}

async function readMetadata(): Promise<GalleryMetadata> {
  try {
    const parsed = JSON.parse(await readFile(METADATA_PATH, 'utf8')) as Partial<GalleryMetadata>;
    return { favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [] };
  } catch {
    return { favorites: [] };
  }
}

async function writeMetadata(metadata: GalleryMetadata) {
  await writeFile(METADATA_PATH, JSON.stringify(metadata, null, 2));
}

export async function listGalleryPhotos(): Promise<GalleryPhoto[]> {
  await ensureGallery();
  const [entries, metadata] = await Promise.all([readdir(GALLERY_DIR), readMetadata()]);
  const favorites = new Set(metadata.favorites);
  const photos = await Promise.all(entries.filter(isSupportedName).map(async name => ({
    name,
    url: `/api/gallery/${encodeURIComponent(name)}`,
    favorite: favorites.has(name),
    modified: (await stat(path.join(GALLERY_DIR, name))).mtimeMs,
  })));
  return photos.sort((a, b) => b.modified - a.modified).map(photo => ({
    name: photo.name,
    url: photo.url,
    favorite: photo.favorite,
  }));
}

export async function saveGalleryPhotos(files: File[]) {
  if (files.length === 0) throw new Error('Choose at least one photo.');
  await ensureGallery();
  for (const file of files) {
    if (!file.type.startsWith('image/') || !isSupportedName(file.name)) throw new Error(`${file.name} is not a supported image.`);
    if (file.size > MAX_PHOTO_BYTES) throw new Error(`${file.name} is larger than 20 MB.`);
    const original = safeName(file.name);
    const extension = path.extname(original);
    const stem = path.basename(original, extension);
    const name = `${Date.now()}-${randomUUID().slice(0, 8)}-${stem}${extension.toLowerCase()}`;
    await writeFile(path.join(GALLERY_DIR, name), Buffer.from(await file.arrayBuffer()));
  }
  return listGalleryPhotos();
}

export async function setGalleryPhotoFavorite(name: string, favorite: boolean) {
  if (!resolvePhoto(name)) throw new Error('Invalid photo name.');
  const metadata = await readMetadata();
  const favorites = new Set(metadata.favorites);
  if (favorite) favorites.add(name);
  else favorites.delete(name);
  await writeMetadata({ favorites: [...favorites] });
  return listGalleryPhotos();
}

export async function deleteGalleryPhoto(name: string) {
  const target = resolvePhoto(name);
  if (!target) throw new Error('Invalid photo name.');
  await unlink(target);
  const metadata = await readMetadata();
  await writeMetadata({ favorites: metadata.favorites.filter(value => value !== name) });
  return listGalleryPhotos();
}

export function galleryPhotoPath(name: string) {
  return resolvePhoto(name);
}

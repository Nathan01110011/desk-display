import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { GalleryPhoto } from '@/types';

export const GALLERY_DIR = process.env.GALLERY_PHOTO_DIR
  ? path.resolve(process.env.GALLERY_PHOTO_DIR)
  : path.join(process.cwd(), 'data', 'gallery');
const LEGACY_PHOTO_DIR = path.join(process.cwd(), 'data', 'screensaver-photos');
const METADATA_PATH = path.join(GALLERY_DIR, '.gallery.json');
const THUMBNAIL_DIR = path.join(GALLERY_DIR, '.thumbnails');
const SCREENSAVER_DIR = path.join(GALLERY_DIR, '.screensaver');
const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

interface GalleryMetadata {
  favorites: string[];
  photos: Record<string, { width: number; height: number }>;
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
  await Promise.all([mkdir(GALLERY_DIR, { recursive: true }), mkdir(THUMBNAIL_DIR, { recursive: true }), mkdir(SCREENSAVER_DIR, { recursive: true })]);
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
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      photos: parsed.photos && typeof parsed.photos === 'object' ? parsed.photos : {},
    };
  } catch {
    return { favorites: [], photos: {} };
  }
}

async function writeMetadata(metadata: GalleryMetadata) {
  await writeFile(METADATA_PATH, JSON.stringify(metadata, null, 2));
}

export async function listGalleryPhotos(): Promise<GalleryPhoto[]> {
  await ensureGallery();
  const [entries, metadata] = await Promise.all([readdir(GALLERY_DIR), readMetadata()]);
  const favorites = new Set(metadata.favorites);
  const photos = [];
  let metadataChanged = false;
  for (const name of entries.filter(isSupportedName)) {
    const dimensions = await ensurePhotoAssets(name, metadata.photos[name]);
    if (!metadata.photos[name] || metadata.photos[name].width !== dimensions.width || metadata.photos[name].height !== dimensions.height) {
      metadata.photos[name] = dimensions;
      metadataChanged = true;
    }
    photos.push({
      name,
      url: `/api/gallery/${encodeURIComponent(name)}`,
      thumbnailUrl: `/api/gallery/${encodeURIComponent(name)}?variant=thumbnail`,
      screensaverUrl: `/api/gallery/${encodeURIComponent(name)}?variant=screensaver`,
      favorite: favorites.has(name),
      width: dimensions.width,
      height: dimensions.height,
      orientation: getOrientation(dimensions.width, dimensions.height),
      modified: (await stat(path.join(GALLERY_DIR, name))).mtimeMs,
    });
  }
  if (metadataChanged) await writeMetadata(metadata);
  return photos.sort((a, b) => b.modified - a.modified).map(photo => ({
    name: photo.name,
    url: photo.url,
    thumbnailUrl: photo.thumbnailUrl,
    screensaverUrl: photo.screensaverUrl,
    favorite: photo.favorite,
    width: photo.width,
    height: photo.height,
    orientation: photo.orientation,
  }));
}

function getOrientation(width: number, height: number): GalleryPhoto['orientation'] {
  const ratio = width / height;
  if (ratio > 1.15) return 'landscape';
  if (ratio < 0.87) return 'portrait';
  return 'square';
}

async function exists(filePath: string) {
  try { await stat(filePath); return true; } catch { return false; }
}

async function ensurePhotoAssets(name: string, known?: { width: number; height: number }) {
  const source = path.join(GALLERY_DIR, name);
  const thumbnail = path.join(THUMBNAIL_DIR, `${name}.webp`);
  const screensaver = path.join(SCREENSAVER_DIR, `${name}.webp`);
  const [hasThumbnail, hasScreensaver] = await Promise.all([exists(thumbnail), exists(screensaver)]);
  let dimensions = known;

  if (!dimensions) {
    const metadata = await sharp(source).metadata();
    const rotated = Boolean(metadata.orientation && metadata.orientation >= 5);
    dimensions = {
      width: rotated ? metadata.height || 1 : metadata.width || 1,
      height: rotated ? metadata.width || 1 : metadata.height || 1,
    };
  }

  const tasks: Promise<unknown>[] = [];
  if (!hasThumbnail) tasks.push(sharp(source).rotate().resize(512, 512, { fit: 'cover', position: 'attention' }).webp({ quality: 76 }).toFile(thumbnail));
  if (!hasScreensaver) tasks.push(sharp(source).rotate().resize({ width: 1600, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(screensaver));
  await Promise.all(tasks);
  return dimensions;
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
  await writeMetadata({ ...metadata, favorites: [...favorites] });
  return listGalleryPhotos();
}

export async function deleteGalleryPhoto(name: string) {
  const target = resolvePhoto(name);
  if (!target) throw new Error('Invalid photo name.');
  await unlink(target);
  const metadata = await readMetadata();
  await Promise.all([
    unlink(path.join(THUMBNAIL_DIR, `${name}.webp`)).catch(() => undefined),
    unlink(path.join(SCREENSAVER_DIR, `${name}.webp`)).catch(() => undefined),
  ]);
  delete metadata.photos[name];
  await writeMetadata({ ...metadata, favorites: metadata.favorites.filter(value => value !== name) });
  return listGalleryPhotos();
}

export function galleryPhotoPath(name: string) {
  return resolvePhoto(name);
}

export function galleryVariantPath(name: string, variant: string | null) {
  if (!resolvePhoto(name)) return null;
  if (variant === 'thumbnail') return path.join(THUMBNAIL_DIR, `${name}.webp`);
  if (variant === 'screensaver') return path.join(SCREENSAVER_DIR, `${name}.webp`);
  return resolvePhoto(name);
}

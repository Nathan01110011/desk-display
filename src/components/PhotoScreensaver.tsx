import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Images } from 'lucide-react';
import type { ScreensaverPhoto, ScreensaverPhotoSource } from '@/types';

const SLIDE_DURATION_MS = 30_000;

function rotate<T>(items: T[], offset: number) {
  if (items.length === 0) return items;
  const start = offset % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

function photosForSlide(photos: ScreensaverPhoto[], slide: number) {
  const groups = {
    landscape: photos.filter(photo => photo.orientation === 'landscape'),
    portrait: photos.filter(photo => photo.orientation === 'portrait'),
    square: photos.filter(photo => photo.orientation === 'square'),
  };
  const available = (Object.keys(groups) as ScreensaverPhoto['orientation'][]).filter(orientation => groups[orientation].length > 0);
  const orientation = available[slide % available.length] || 'landscape';
  const count = orientation === 'landscape' ? 1 : 3;
  return { orientation, photos: rotate(groups[orientation], Math.floor(slide / Math.max(available.length, 1))).slice(0, count) };
}

export function PhotoScreensaver({ time, date, source }: { time: string; date: string; source: ScreensaverPhotoSource }) {
  const [photos, setPhotos] = useState<ScreensaverPhoto[]>([]);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    let active = true;
    fetch('/api/gallery')
      .then(response => response.json())
      .then(data => {
        if (!active) return;
        const nextPhotos = (data.photos || []).filter((photo: ScreensaverPhoto) => source === 'all' || photo.favorite);
        setPhotos(nextPhotos);
        nextPhotos.forEach((photo: ScreensaverPhoto) => {
          const preload = new window.Image();
          preload.src = photo.screensaverUrl;
        });
      })
      .catch(() => {
        if (active) setPhotos([]);
      });
    return () => { active = false; };
  }, [source]);

  useEffect(() => {
    if (photos.length < 2) return;
    const timer = window.setInterval(() => setSlide(value => value + 1), SLIDE_DURATION_MS);
    return () => window.clearInterval(timer);
  }, [photos.length]);

  const current = useMemo(() => photosForSlide(photos, slide), [photos, slide]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#080808]">
      <AnimatePresence mode="wait">
        {current.photos.length > 0 ? (
          <motion.div
            key={current.photos.map(photo => photo.name).join(':')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: 'easeInOut' }}
            className={`absolute inset-0 flex items-center justify-center gap-[2vw] p-[2vw] will-change-opacity ${
              current.orientation === 'portrait' ? 'flex-row' : current.orientation === 'square' ? 'flex-row' : ''
            }`}
          >
            {current.photos.map(photo => (
              <div
                key={photo.name}
                className={`relative ${
                  current.orientation === 'landscape'
                    ? 'h-[90vh] w-[94vw]'
                    : current.orientation === 'portrait'
                      ? 'h-[90vh] w-[29vw]'
                      : 'aspect-square w-[29vw]'
                }`}
              >
                <Image
                  src={photo.screensaverUrl}
                  alt=""
                  fill
                  unoptimized
                  priority
                  sizes={current.orientation === 'landscape' ? '94vw' : '29vw'}
                  className="object-contain"
                />
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-white/25">
            <Images size={72} strokeWidth={1.25} />
            <p className="text-xl font-bold">{source === 'favorites' ? 'Mark some favourites in Gallery' : 'Add photos in Gallery'}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-8 left-8 z-20 rounded-[1.75rem] border border-white/10 bg-black/70 px-7 py-5 shadow-2xl">
        <p className="text-5xl font-black leading-none tracking-tight tabular-nums text-white">{time}</p>
        <p className="mt-2 text-xs font-black uppercase tracking-[0.24em] text-white/55">{date}</p>
      </div>
    </div>
  );
}

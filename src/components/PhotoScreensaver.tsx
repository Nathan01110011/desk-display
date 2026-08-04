import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Images } from 'lucide-react';
import type { ScreensaverPhoto, ScreensaverPhotoSource } from '@/types';

const SLIDE_DURATION_MS = 12_000;

function rotate<T>(items: T[], offset: number) {
  if (items.length === 0) return items;
  const start = offset % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

export function PhotoScreensaver({ time, date, source }: { time: string; date: string; source: ScreensaverPhotoSource }) {
  const [photos, setPhotos] = useState<ScreensaverPhoto[]>([]);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    let active = true;
    fetch('/api/gallery')
      .then(response => response.json())
      .then(data => {
        if (active) setPhotos((data.photos || []).filter((photo: ScreensaverPhoto) => source === 'all' || photo.favorite));
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

  const visiblePhotos = useMemo(() => rotate(photos, slide).slice(0, Math.min(3, photos.length)), [photos, slide]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#080808]">
      <AnimatePresence mode="popLayout">
        {visiblePhotos.length > 0 ? (
          <motion.div
            key={visiblePhotos.map(photo => photo.name).join(':')}
            initial={{ opacity: 0, scale: 1.015 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 1.8 }, scale: { duration: 10, ease: 'linear' } }}
            className={`absolute inset-0 grid gap-2 p-2 ${
              visiblePhotos.length === 1
                ? 'grid-cols-1'
                : visiblePhotos.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-[1.6fr_1fr] grid-rows-2'
            }`}
          >
            {visiblePhotos.map((photo, index) => (
              <div
                key={photo.name}
                className={`relative overflow-hidden rounded-[2rem] bg-white/5 ${visiblePhotos.length === 3 && index === 0 ? 'row-span-2' : ''}`}
              >
                <motion.div
                  className="absolute inset-[-2%]"
                  initial={{ scale: 1.02, x: index % 2 === 0 ? '-1%' : '1%' }}
                  animate={{ scale: 1.1, x: index % 2 === 0 ? '1%' : '-1%' }}
                  transition={{ duration: 14, ease: 'linear' }}
                >
                  <Image
                    src={photo.url}
                    alt=""
                    fill
                    unoptimized
                    priority
                    sizes={visiblePhotos.length === 1 ? '100vw' : index === 0 ? '66vw' : '34vw'}
                    className="object-cover"
                  />
                </motion.div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-white/25"
          >
            <Images size={72} strokeWidth={1.25} />
            <p className="text-xl font-bold">{source === 'favorites' ? 'Mark some favourites in Gallery' : 'Add photos in Gallery'}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-8 left-8 z-20 rounded-[1.75rem] border border-white/10 bg-black/45 px-7 py-5 shadow-2xl backdrop-blur-xl">
        <p className="text-5xl font-black leading-none tracking-tight tabular-nums text-white">{time}</p>
        <p className="mt-2 text-xs font-black uppercase tracking-[0.24em] text-white/55">{date}</p>
      </div>
    </div>
  );
}

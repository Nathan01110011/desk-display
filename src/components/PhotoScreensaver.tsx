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
  const variant = Math.floor(slide / Math.max(available.length, 1)) % 3;
  const count = orientation === 'landscape' ? (variant % 2 === 1 ? 2 : 1) : 3;
  return { orientation, variant, photos: rotate(groups[orientation], Math.floor(slide / Math.max(available.length, 1))).slice(0, count) };
}

function photoPosition(orientation: ScreensaverPhoto['orientation'], index: number, count: number, variant: number) {
  if (orientation === 'landscape') {
    if (count === 1) return 'h-[88vh] w-[94vw]';
    return index === 0
      ? 'absolute left-[3vw] top-[4vh] h-[58vh] w-[68vw]'
      : 'absolute bottom-[4vh] right-[3vw] h-[48vh] w-[58vw]';
  }
  if (orientation === 'portrait') {
    const offsets = variant % 2 === 0 ? ['-translate-y-[3vh]', 'translate-y-[3vh]', '-translate-y-[1vh]'] : ['translate-y-[3vh]', '-translate-y-[3vh]', 'translate-y-[1vh]'];
    return `h-[82vh] w-[29vw] ${offsets[index] || ''}`;
  }
  const sizes = variant % 2 === 0
    ? ['w-[27vw] -translate-y-[4vh]', 'w-[31vw] translate-y-[3vh]', 'w-[25vw] -translate-y-[1vh]']
    : ['w-[30vw] translate-y-[2vh]', 'w-[25vw] -translate-y-[4vh]', 'w-[29vw] translate-y-[4vh]'];
  return `aspect-square ${sizes[index] || 'w-[27vw]'}`;
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
      <div
        className="absolute inset-0 opacity-80"
        style={{ background: current.variant % 2 === 0 ? 'radial-gradient(circle at 15% 20%, #202020 0%, #080808 42%, #030303 100%)' : 'radial-gradient(circle at 85% 75%, #242424 0%, #080808 40%, #030303 100%)' }}
      />
      <AnimatePresence mode="wait">
        {current.photos.length > 0 ? (
          <motion.div
            key={`${current.orientation}-${current.variant}-${current.photos.map(photo => photo.name).join(':')}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: 'easeInOut' }}
            className={`absolute inset-0 will-change-[opacity,transform] ${current.orientation === 'landscape' && current.photos.length > 1 ? '' : 'flex items-center justify-center gap-[2vw] p-[2vw]'}`}
          >
            {current.photos.map((photo, index) => (
              <motion.div
                key={photo.name}
                initial={{ opacity: 0, y: index % 2 === 0 ? 18 : -18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.12, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className={`relative ${photoPosition(current.orientation, index, current.photos.length, current.variant)} ${index === 1 && current.orientation === 'landscape' ? 'z-10' : ''}`}
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
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-white/25">
            <Images size={72} strokeWidth={1.25} />
            <p className="text-xl font-bold">{source === 'favorites' ? 'Mark some favourites in Gallery' : 'Add photos in Gallery'}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {current.photos.length > 0 && (
        <div className="absolute left-8 top-8 z-20 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-white/35">
          <span className="size-1.5 rounded-full bg-white/70" /> Gallery · {current.orientation}
        </div>
      )}

      <div className="absolute bottom-8 left-8 z-20 rounded-[1.75rem] border border-white/10 bg-black/70 px-7 py-5 shadow-2xl">
        <p className="text-5xl font-black leading-none tracking-tight tabular-nums text-white">{time}</p>
        <p className="mt-2 text-xs font-black uppercase tracking-[0.24em] text-white/55">{date}</p>
      </div>
      {photos.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 z-30 h-1 bg-white/5">
          <motion.div key={slide} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: SLIDE_DURATION_MS / 1000, ease: 'linear' }} className="h-full origin-left bg-white/35 will-change-transform" />
        </div>
      )}
    </div>
  );
}

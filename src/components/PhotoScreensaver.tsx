import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Images } from 'lucide-react';
import type { ScreensaverPhoto, ScreensaverPhotoSlideDuration, ScreensaverPhotoSource } from '@/types';

interface PhotoSlide {
  variant: number;
  photos: ScreensaverPhoto[];
}

interface Panel {
  x: number;
  y: number;
  width: number;
  height: number;
  z?: number;
  alignX?: 'start' | 'center' | 'end';
  alignY?: 'start' | 'center' | 'end';
}

function shuffle<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function buildDeck(photos: ScreensaverPhoto[]) {
  const queue = shuffle(photos);
  const slides: PhotoSlide[] = [];
  while (queue.length > 0) {
    const maximum = Math.min(3, queue.length);
    const roll = Math.random();
    const count = maximum === 1 ? 1 : Math.min(maximum, roll < 0.16 ? 1 : roll < 0.5 ? 2 : 3);
    slides.push({ photos: queue.splice(0, count), variant: Math.floor(Math.random() * 4) });
  }
  return slides;
}

function panelsFor(photos: ScreensaverPhoto[], variant: number) {
  const panels: Panel[] = photos.map(() => ({ x: 0.025, y: 0.035, width: 0.95, height: 0.91 }));
  const byOrientation = {
    landscape: photos.map((photo, index) => photo.orientation === 'landscape' ? index : -1).filter(index => index >= 0),
    portrait: photos.map((photo, index) => photo.orientation === 'portrait' ? index : -1).filter(index => index >= 0),
    square: photos.map((photo, index) => photo.orientation === 'square' ? index : -1).filter(index => index >= 0),
  };
  const set = (index: number, panel: Panel) => { panels[index] = panel; };

  if (photos.length === 1) return panels;

  if (photos.length === 2) {
    const [first, second] = [0, 1];
    if (byOrientation.landscape.length === 2) {
      set(first, { x: 0.02, y: 0.02, width: 0.96, height: 0.48, alignY: 'end' });
      set(second, { x: 0.02, y: 0.5, width: 0.96, height: 0.48, alignY: 'start' });
      return panels;
    }
    if (byOrientation.portrait.length === 2) {
      set(first, { x: 0.04, y: 0.04, width: 0.44, height: 0.92 });
      set(second, { x: 0.52, y: 0.04, width: 0.44, height: 0.92 });
      return panels;
    }
    if (byOrientation.square.length === 2) {
      set(first, { x: 0.03, y: 0.05, width: 0.45, height: 0.9 });
      set(second, { x: 0.52, y: 0.05, width: 0.45, height: 0.9 });
      return panels;
    }

    const landscape = byOrientation.landscape[0];
    const portrait = byOrientation.portrait[0];
    const square = byOrientation.square[0];
    if (landscape !== undefined && portrait !== undefined) {
      set(landscape, { x: 0.025, y: 0.06, width: 0.59, height: 0.88 });
      set(portrait, { x: 0.645, y: 0.06, width: 0.33, height: 0.88 });
    } else if (landscape !== undefined && square !== undefined) {
      set(landscape, { x: 0.025, y: 0.06, width: 0.58, height: 0.88 });
      set(square, { x: 0.63, y: 0.06, width: 0.345, height: 0.88 });
    } else {
      set(portrait, { x: 0.04, y: 0.06, width: 0.35, height: 0.88 });
      set(square, { x: 0.42, y: 0.06, width: 0.54, height: 0.88 });
    }
    return panels;
  }

  if (byOrientation.landscape.length === 3) {
    const hero = variant % 3;
    const supporting = [0, 1, 2].filter(index => index !== hero);
    set(hero, { x: 0.025, y: 0.04, width: 0.63, height: 0.92 });
    set(supporting[0], { x: 0.68, y: 0.04, width: 0.295, height: 0.44 });
    set(supporting[1], { x: 0.68, y: 0.52, width: 0.295, height: 0.44 });
    return panels;
  }
  if (byOrientation.portrait.length === 3) {
    photos.forEach((_, index) => {
      set(index, { x: 0.025 + index * 0.325, y: 0.04, width: 0.3, height: 0.92 });
    });
    return panels;
  }
  if (byOrientation.square.length === 3) {
    const hero = variant % 3;
    const supporting = [0, 1, 2].filter(index => index !== hero);
    set(hero, { x: 0.025, y: 0.04, width: 0.62, height: 0.92 });
    set(supporting[0], { x: 0.67, y: 0.04, width: 0.305, height: 0.44 });
    set(supporting[1], { x: 0.67, y: 0.52, width: 0.305, height: 0.44 });
    return panels;
  }

  if (byOrientation.landscape.length === 2) {
    const [top, bottom] = byOrientation.landscape;
    const accent = byOrientation.portrait[0] ?? byOrientation.square[0];
    set(top, { x: 0.025, y: 0.04, width: 0.63, height: 0.44 });
    set(bottom, { x: 0.025, y: 0.52, width: 0.63, height: 0.44 });
    set(accent, { x: 0.68, y: 0.04, width: 0.295, height: 0.92 });
    return panels;
  }

  if (byOrientation.portrait.length === 2) {
    const centre = byOrientation.landscape[0] ?? byOrientation.square[0];
    set(byOrientation.portrait[0], { x: 0.025, y: 0.04, width: 0.285, height: 0.92 });
    set(centre, { x: 0.335, y: 0.04, width: 0.33, height: 0.92 });
    set(byOrientation.portrait[1], { x: 0.69, y: 0.04, width: 0.285, height: 0.92 });
    return panels;
  }

  if (byOrientation.square.length === 2) {
    const centre = byOrientation.landscape[0] ?? byOrientation.portrait[0];
    set(byOrientation.square[0], { x: 0.025, y: 0.04, width: 0.3, height: 0.92 });
    set(centre, { x: 0.35, y: 0.04, width: 0.3, height: 0.92 });
    set(byOrientation.square[1], { x: 0.675, y: 0.04, width: 0.3, height: 0.92 });
    return panels;
  }

  const landscape = byOrientation.landscape[0];
  const portrait = byOrientation.portrait[0];
  const square = byOrientation.square[0];
  set(landscape, { x: 0.025, y: 0.04, width: 0.5, height: 0.92 });
  set(square, { x: 0.55, y: 0.04, width: 0.2, height: 0.92 });
  set(portrait, { x: 0.775, y: 0.04, width: 0.2, height: 0.92 });
  return panels;
}

function fitPhoto(photo: ScreensaverPhoto, panel: Panel, containerWidth: number, containerHeight: number) {
  const cellLeft = panel.x * containerWidth;
  const cellTop = panel.y * containerHeight;
  const cellWidth = panel.width * containerWidth;
  const cellHeight = panel.height * containerHeight;
  const aspect = photo.width / photo.height || 1;
  const width = Math.min(cellWidth, cellHeight * aspect);
  const height = width / aspect;
  const align = (space: number, value: 'start' | 'center' | 'end' = 'center') => value === 'start' ? 0 : value === 'end' ? space : space / 2;
  return {
    left: cellLeft + align(cellWidth - width, panel.alignX),
    top: cellTop + align(cellHeight - height, panel.alignY),
    width,
    height,
    zIndex: panel.z,
  };
}

function useContainerSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, size };
}

function avoidImmediateRepeat(nextDeck: PhotoSlide[], previous?: PhotoSlide) {
  if (!previous || nextDeck.length < 2) return nextDeck;
  const previousNames = new Set(previous.photos.map(photo => photo.name));
  if (nextDeck[0].photos.some(photo => previousNames.has(photo.name))) {
    const replacement = nextDeck.findIndex((slide, index) => index > 0 && slide.photos.every(photo => !previousNames.has(photo.name)));
    if (replacement > 0) [nextDeck[0], nextDeck[replacement]] = [nextDeck[replacement], nextDeck[0]];
  }
  return nextDeck;
}

export function PhotoScreensaver({ time, date, source, durationSeconds }: { time: string; date: string; source: ScreensaverPhotoSource; durationSeconds: ScreensaverPhotoSlideDuration }) {
  const [photos, setPhotos] = useState<ScreensaverPhoto[]>([]);
  const [deck, setDeck] = useState<PhotoSlide[]>([]);
  const [slide, setSlide] = useState(0);
  const { ref: containerRef, size } = useContainerSize();

  useEffect(() => {
    let active = true;
    fetch('/api/gallery')
      .then(response => response.json())
      .then(data => {
        if (!active) return;
        const nextPhotos = (data.photos || []).filter((photo: ScreensaverPhoto) => source === 'all' || photo.favorite);
        setPhotos(nextPhotos);
        setDeck(buildDeck(nextPhotos));
        setSlide(0);
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
    const timer = window.setInterval(() => setSlide(value => {
      if (value + 1 < deck.length) return value + 1;
      setDeck(currentDeck => avoidImmediateRepeat(buildDeck(photos), currentDeck.at(-1)));
      return 0;
    }), durationSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [deck.length, durationSeconds, photos]);

  const current = useMemo(() => deck[slide] || { variant: 0, photos: [] }, [deck, slide]);
  const panels = useMemo(() => panelsFor(current.photos, current.variant), [current]);
  const photoRects = useMemo(
    () => current.photos.map((photo, index) => fitPhoto(photo, panels[index], size.width, size.height)),
    [current.photos, panels, size.height, size.width],
  );
  const backdrop = current.photos[current.variant % Math.max(current.photos.length, 1)];

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-black">
      <AnimatePresence mode="wait">
        {current.photos.length > 0 ? (
          <motion.div
            key={`${current.variant}-${current.photos.map(photo => photo.name).join(':')}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeInOut' }}
            className="absolute inset-0 will-change-opacity"
          >
            {backdrop && (
              <div className="absolute inset-0 overflow-hidden">
                <Image src={backdrop.screensaverUrl} alt="" fill unoptimized priority sizes="100vw" className="scale-105 object-cover opacity-40" />
                <div className="absolute inset-0 bg-black/45" />
              </div>
            )}
            {current.photos.map((photo, index) => {
              const rect = photoRects[index];
              return (
                <motion.div
                  key={photo.name}
                  initial={{ opacity: 0, scale: 1.015 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.7, ease: 'easeOut' }}
                  style={rect}
                  className="absolute overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/15"
                >
                  <Image src={photo.screensaverUrl} alt="" fill unoptimized priority sizes={current.photos.length === 1 ? '100vw' : '70vw'} className="object-contain" />
                </motion.div>
              );
            })}
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-white/25">
            <Images size={72} strokeWidth={1.25} />
            <p className="text-xl font-bold">{source === 'favorites' ? 'Mark some favourites in Gallery' : 'Add photos in Gallery'}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-8 left-8 z-30 bg-black/65 px-7 py-5 shadow-2xl backdrop-blur-sm">
        <p className="text-5xl font-black leading-none tracking-tight tabular-nums text-white">{time}</p>
        <p className="mt-2 text-xs font-black uppercase tracking-[0.24em] text-white/55">{date}</p>
      </div>
      {photos.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 z-30 h-1 bg-white/5">
          <motion.div key={`${slide}-${durationSeconds}`} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: durationSeconds, ease: 'linear' }} className="h-full origin-left bg-white/35 will-change-transform" />
        </div>
      )}
    </div>
  );
}

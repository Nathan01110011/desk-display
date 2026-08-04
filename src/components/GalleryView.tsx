import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Heart, ImagePlus, Images, LoaderCircle, MonitorSmartphone, Trash2, Upload, X } from 'lucide-react';
import type { GalleryPhoto } from '@/types';

interface PairingSession {
  token: string;
  expiresAt: number;
  uploadUrl: string;
  qrCode: string;
}

export function GalleryView() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GalleryPhoto | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [pairing, setPairing] = useState<PairingSession | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');

  const loadPhotos = useCallback(async () => {
    const response = await fetch('/api/gallery');
    const data = await response.json();
    setPhotos(data.photos || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      loadPhotos().catch(() => {
        setLoading(false);
        setStatus('Could not load the gallery.');
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [loadPhotos]);

  useEffect(() => {
    if (!pairing) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      loadPhotos().catch(() => undefined);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [loadPhotos, pairing]);

  const startPairing = async () => {
    setStatus('');
    const response = await fetch('/api/screensaver/pair', { method: 'POST' });
    const data = await response.json();
    if (response.ok) {
      setPairing(data);
      setNow(Date.now());
    } else setStatus(data.error || 'Could not start phone upload.');
  };

  const closeAdd = () => {
    if (pairing) fetch(`/api/screensaver/pair?token=${encodeURIComponent(pairing.token)}`, { method: 'DELETE' }).catch(() => undefined);
    setPairing(null);
    setShowAdd(false);
    loadPhotos().catch(() => undefined);
  };

  const uploadPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setStatus('');
    const body = new FormData();
    Array.from(files).forEach(file => { body.append('photos', file); });
    try {
      const response = await fetch('/api/gallery', { method: 'POST', body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed.');
      setPhotos(data.photos || []);
      setStatus(`${files.length} photo${files.length === 1 ? '' : 's'} added.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const toggleFavorite = async (photo: GalleryPhoto) => {
    const response = await fetch('/api/gallery', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: photo.name, favorite: !photo.favorite }),
    });
    const data = await response.json();
    if (response.ok) {
      setPhotos(data.photos || []);
      setSelected(current => current?.name === photo.name ? { ...current, favorite: !photo.favorite } : current);
    }
  };

  const removePhoto = async (photo: GalleryPhoto) => {
    const response = await fetch(`/api/gallery?name=${encodeURIComponent(photo.name)}`, { method: 'DELETE' });
    const data = await response.json();
    if (response.ok) {
      setPhotos(data.photos || []);
      setSelected(null);
    }
  };

  const secondsRemaining = pairing ? Math.max(0, Math.ceil((pairing.expiresAt - now) / 1000)) : 0;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03]">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-8 py-6 pr-28">
        <div><div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.28em] text-white/30"><Images size={18} /> Gallery</div><h2 className="mt-2 text-4xl font-black tracking-tight">Your photos</h2></div>
        <div className="flex items-center gap-4"><span className="text-sm font-black text-white/30">{photos.length} photos · {photos.filter(photo => photo.favorite).length} favourites</span><button onPointerDown={() => setShowAdd(true)} className="flex h-14 items-center gap-3 rounded-2xl bg-white px-6 font-black text-black active:scale-95"><ImagePlus size={22} /> Add photos</button></div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-6 scrollbar-hide">
        {loading ? (
          <div className="flex h-full items-center justify-center text-white/25"><LoaderCircle size={42} className="animate-spin" /></div>
        ) : photos.length > 0 ? (
          <div className="grid grid-cols-5 gap-4">
            {photos.map(photo => (
              <motion.div layout key={photo.name} className="group relative aspect-square overflow-hidden rounded-3xl bg-white/5">
                <button onPointerDown={() => setSelected(photo)} className="absolute inset-0"><Image src={photo.url} alt="Gallery photo" fill unoptimized sizes="18vw" className="object-cover transition-transform duration-500 group-hover:scale-105" /></button>
                <button onPointerDown={() => toggleFavorite(photo)} aria-label={photo.favorite ? 'Remove from favourites' : 'Add to favourites'} className={`absolute bottom-3 right-3 flex size-11 items-center justify-center rounded-2xl backdrop-blur active:scale-90 ${photo.favorite ? 'bg-white text-rose-500' : 'bg-black/65 text-white/65'}`}><Heart size={21} className={photo.favorite ? 'fill-current' : ''} /></button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-white/20"><Images size={72} strokeWidth={1.2} /><p className="text-xl font-black">Your gallery is empty</p><button onPointerDown={() => setShowAdd(true)} className="rounded-2xl bg-white px-6 py-4 font-black text-black">Add your first photos</button></div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[180] flex items-center justify-center bg-black/95 p-8">
            <div className="relative h-full w-full"><Image src={selected.url} alt="Gallery photo" fill unoptimized sizes="100vw" className="object-contain" /></div>
            <div className="absolute right-7 top-7 flex gap-3"><button onPointerDown={() => toggleFavorite(selected)} className={`flex size-14 items-center justify-center rounded-2xl ${selected.favorite ? 'bg-white text-rose-500' : 'bg-white/10 text-white'}`}><Heart size={25} className={selected.favorite ? 'fill-current' : ''} /></button><button onPointerDown={() => removePhoto(selected)} className="flex size-14 items-center justify-center rounded-2xl bg-red-500/20 text-red-200"><Trash2 size={24} /></button><button onPointerDown={() => setSelected(null)} className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-white"><X size={26} /></button></div>
          </motion.div>
        )}

        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[190] flex items-center justify-center bg-black/90 p-8 backdrop-blur-xl">
            <div className="grid h-full w-full max-w-5xl grid-cols-2 overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0a] shadow-2xl">
              <section className="flex flex-col items-center justify-center border-r border-white/10 p-8 text-center"><MonitorSmartphone size={38} className="text-white/60" /><h3 className="mt-4 text-3xl font-black">Add from phone</h3><p className="mt-3 max-w-sm text-sm font-bold leading-relaxed text-white/35">Scan while your phone is on the same Wi-Fi network.</p>{pairing && secondsRemaining > 0 ? <><div className="mt-6 aspect-square w-64 rounded-3xl bg-white p-3"><Image src={pairing.qrCode} alt="Phone upload QR code" width={560} height={560} unoptimized className="size-full" /></div><p className="mt-3 text-sm font-black text-white/45">Expires in {Math.floor(secondsRemaining / 60)}:{String(secondsRemaining % 60).padStart(2, '0')}</p></> : <button onPointerDown={startPairing} className="mt-7 flex h-16 w-full max-w-xs items-center justify-center gap-3 rounded-2xl bg-white font-black text-black active:scale-95"><MonitorSmartphone size={22} /> Show QR code</button>}</section>
              <section className="relative flex flex-col items-center justify-center p-8 text-center"><button onPointerDown={closeAdd} className="absolute right-5 top-5 flex size-12 items-center justify-center rounded-2xl bg-white/5 text-white/60"><X size={24} /></button><Upload size={38} className="text-white/60" /><h3 className="mt-4 text-3xl font-black">On this device</h3><p className="mt-3 max-w-sm text-sm font-bold leading-relaxed text-white/35">Use the local file picker as a fallback.</p><label className="mt-7 flex h-16 w-full max-w-xs cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-white/20 bg-white/5 font-black text-white/55 active:scale-95">{uploading ? <LoaderCircle size={22} className="animate-spin" /> : <Upload size={22} />}{uploading ? 'Uploading…' : 'Choose photos'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={uploading} className="sr-only" onChange={event => uploadPhotos(event.target.files)} /></label>{status && <p className="mt-5 flex items-center gap-2 text-sm font-bold text-white/45"><Check size={18} />{status}</p>}</section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

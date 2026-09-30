'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, Check, ImagePlus, LoaderCircle, Trash2, UploadCloud } from 'lucide-react';

interface SelectedPhoto {
  file: File;
  previewUrl: string;
  id: string;
}

export function MobilePhotoUpload({ token }: { token: string }) {
  const [selected, setSelected] = useState<SelectedPhoto[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'ready' | 'uploading' | 'success' | 'error'>(token ? 'ready' : 'error');
  const [message, setMessage] = useState(token ? '' : 'This upload link is invalid. Start a new session on the display.');
  const previewUrls = useRef(new Set<string>());
  const photoIdSequence = useRef(0);

  useEffect(() => {
    const urls = previewUrls.current;
    return () => urls.forEach(url => {
      URL.revokeObjectURL(url);
    });
  }, []);

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const additions = Array.from(files).filter(file => file.type.startsWith('image/')).map(file => {
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);
      photoIdSequence.current += 1;
      return { file, previewUrl, id: `${file.name}-${file.lastModified}-${file.size}-${photoIdSequence.current}` };
    });
    setSelected(current => [...current, ...additions]);
    setStatus('ready');
    setMessage('');
  };

  const removePhoto = (id: string) => {
    setSelected(current => current.filter(photo => {
      if (photo.id !== id) return true;
      URL.revokeObjectURL(photo.previewUrl);
      previewUrls.current.delete(photo.previewUrl);
      return false;
    }));
  };

  const clearSelection = () => {
    selected.forEach(photo => {
      URL.revokeObjectURL(photo.previewUrl);
      previewUrls.current.delete(photo.previewUrl);
    });
    setSelected([]);
  };

  const upload = () => {
    if (!token || selected.length === 0 || status === 'uploading') return;
    setStatus('uploading');
    setProgress(0);
    setMessage('Sending photos to the display…');

    const body = new FormData();
    body.append('token', token);
    selected.forEach(photo => {
      body.append('photos', photo.file);
    });

    const request = new XMLHttpRequest();
    request.open('POST', '/api/screensaver/pair/upload');
    request.upload.addEventListener('progress', event => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener('load', () => {
      let data: { error?: string; count?: number } = {};
      try { data = JSON.parse(request.responseText); } catch { /* Use fallback below. */ }
      if (request.status >= 200 && request.status < 300) {
        const count = data.count || selected.length;
        clearSelection();
        setProgress(100);
        setStatus('success');
        setMessage(`${count} photo${count === 1 ? '' : 's'} added to the display.`);
      } else {
        setStatus('error');
        setMessage(data.error || 'The upload failed. Please try again.');
      }
    });
    request.addEventListener('error', () => {
      setStatus('error');
      setMessage('Could not reach the display. Check that this phone is on the same Wi-Fi network.');
    });
    request.send(body);
  };

  return (
    <main className="min-h-dvh bg-[#090909] px-5 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-lg flex-col">
        <div className="mb-8">
          <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-white text-black shadow-xl">
            <UploadCloud size={28} strokeWidth={2.5} />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-white/35">Desk Display Gallery</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Send photos</h1>
          <p className="mt-3 text-base font-medium leading-relaxed text-white/45">Choose pictures from this phone. They’ll transfer directly to your display.</p>
        </div>

        {selected.length > 0 && (
          <div className="mb-5 grid grid-cols-3 gap-2.5">
            {selected.map(photo => (
              <div key={photo.id} className="relative aspect-square overflow-hidden rounded-2xl bg-white/5">
                <Image src={photo.previewUrl} alt="Selected photo" fill unoptimized sizes="33vw" className="object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  aria-label={`Remove ${photo.file.name}`}
                  className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-xl bg-black/70 text-white backdrop-blur"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/[0.05] px-4 text-center font-black active:scale-[0.98]">
            <ImagePlus size={28} className="text-white/65" />
            Choose photos
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="sr-only" onChange={event => { addFiles(event.target.files); event.currentTarget.value = ''; }} />
          </label>
          <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/[0.05] px-4 text-center font-black active:scale-[0.98]">
            <Camera size={28} className="text-white/65" />
            Take a photo
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={event => { addFiles(event.target.files); event.currentTarget.value = ''; }} />
          </label>
        </div>

        {(message || status === 'uploading') && (
          <div className={`mt-5 rounded-3xl border p-5 ${
            status === 'success'
              ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100'
              : status === 'error'
                ? 'border-red-300/20 bg-red-300/10 text-red-100'
                : 'border-white/10 bg-white/[0.04] text-white/65'
          }`}>
            <div className="flex items-center gap-3">
              {status === 'success' ? <Check size={22} /> : status === 'uploading' ? <LoaderCircle size={22} className="animate-spin" /> : null}
              <p className="font-bold leading-snug">{message}</p>
            </div>
            {status === 'uploading' && (
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-white transition-[width]" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={upload}
          disabled={!token || selected.length === 0 || status === 'uploading'}
          className="mt-auto flex min-h-16 w-full items-center justify-center gap-3 rounded-3xl bg-white px-6 text-lg font-black text-black shadow-2xl transition-transform active:scale-[0.98] disabled:bg-white/10 disabled:text-white/25 disabled:shadow-none"
        >
          {status === 'uploading' ? <><LoaderCircle size={24} className="animate-spin" /> Uploading {progress}%</> : `Add ${selected.length || ''} photo${selected.length === 1 ? '' : 's'}`}
        </button>
        <p className="mt-4 text-center text-xs font-medium text-white/25">This private upload session expires after 10 minutes.</p>
      </div>
    </main>
  );
}

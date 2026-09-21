import { useEffect, useRef } from 'react';
import { BookOpen } from 'lucide-react';
import { useJoplinNote } from '@/hooks/useJoplinNote';
import { JoplinNoteBody } from './JoplinNoteBody';

export function JoplinScreensaver({ time, date }: { time: string; date: string }) {
  const { note, today, loading, error, stale, message } = useJoplinNote('daily');
  const content = useRef<HTMLDivElement>(null);
  const noteId = note?.id;
  const body = note?.body;

  useEffect(() => {
    const element = content.current;
    if (!element) return;
    element.scrollTop = 0;
    let pauseUntil = Date.now() + 7000;
    let atBottom = false;
    const timer = window.setInterval(() => {
      const maximum = element.scrollHeight - element.clientHeight;
      if (maximum <= 0 || Date.now() < pauseUntil) return;
      if (atBottom) {
        element.scrollTop = 0;
        atBottom = false;
        pauseUntil = Date.now() + 7000;
      } else if (element.scrollTop >= maximum - 1) {
        atBottom = true;
        pauseUntil = Date.now() + 7000;
      } else {
        element.scrollTop += 1;
      }
    }, 40);
    return () => window.clearInterval(timer);
  }, [noteId, body]);

  return (
    <section className="pointer-events-none absolute inset-0 flex flex-col gap-5 overflow-hidden bg-black px-[6vw] py-[5vh]">
      <header className="flex shrink-0 items-start justify-between gap-8 border-b border-white/10 pb-5">
        <div className="min-w-0">
          <p className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-white/40"><BookOpen size={20} />Daily TODO</p>
          <h1 className="mt-3 text-[clamp(1.5rem,3vw,3rem)] font-black">{note?.title || 'Your daily notes'}</h1>
          {note?.day && note.day !== today && <p className="mt-2 text-base text-amber-200/70">Latest daily note with content · {note.day}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[clamp(3rem,6vw,6rem)] font-black leading-none tracking-tight tabular-nums">{time}</p>
          <p className="mt-2 text-sm font-bold text-white/40">{date}</p>
        </div>
      </header>
      {error && <p role="status" className="shrink-0 text-base text-amber-200/75">{stale ? 'Last loaded version · ' : ''}{error}</p>}
      <div ref={content} className="min-h-0 flex-1 overflow-hidden text-[clamp(1.5rem,2.7vw,2.75rem)]">
        {note ? <JoplinNoteBody body={note.body} /> : <p className="pt-16 text-center text-white/30">{loading ? 'Loading daily TODO…' : error ? 'Waiting for Joplin to reconnect…' : message || 'No daily TODO notes yet.'}</p>}
      </div>
      <p className="shrink-0 text-center text-xs uppercase tracking-widest text-white/25">Tap anywhere to return</p>
    </section>
  );
}

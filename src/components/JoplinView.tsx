import { useEffect, useState } from 'react';
import { BookOpen, CalendarCheck, Keyboard, Pin, RefreshCw } from 'lucide-react';
import { useJoplinNote } from '@/hooks/useJoplinNote';
import { JoplinNoteBody } from './JoplinNoteBody';
import { OnScreenKeyboard } from './OnScreenKeyboard';

function parseNoteId(value: string) {
  const input = value.trim();
  if (/^[a-f0-9]{32}$/i.test(input)) return input.toLowerCase();
  const internal = /^\[.*\]\(:\/([a-f0-9]{32})\)$/i.exec(input) || /^:\/([a-f0-9]{32})$/i.exec(input);
  if (internal) return internal[1].toLowerCase();
  try {
    const link = new URL(input);
    const id = link.searchParams.get('id');
    if (link.protocol === 'joplin:' && link.hostname === 'x-callback-url' && link.pathname === '/openNote' && id && /^[a-f0-9]{32}$/i.test(id)) return id.toLowerCase();
  } catch { /* A plain note ID is also accepted. */ }
  return null;
}

export function JoplinView() {
  const [mode, setMode] = useState<'daily' | 'pinned'>('daily');
  const [noteId, setNoteId] = useState('');
  const [draft, setDraft] = useState('');
  const [editingPin, setEditingPin] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [pinError, setPinError] = useState('');
  const [saving, setSaving] = useState(false);
  const { note, today, loading, error, stale, message, refresh } = useJoplinNote(mode, noteId);

  useEffect(() => {
    let active = true;
    fetch('/api/system/settings', { cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(settings => {
        if (!active) return;
        if (typeof settings.joplinNoteId === 'string') setNoteId(settings.joplinNoteId);
        if (settings.joplinViewerMode === 'pinned') setMode('pinned');
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const chooseMode = (nextMode: 'daily' | 'pinned') => {
    setMode(nextMode);
    void fetch('/api/system/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ joplinViewerMode: nextMode }),
    }).catch(() => {});
  };

  const savePin = async () => {
    const id = parseNoteId(draft);
    if (!id) { setPinError('Paste a Joplin note link or its 32-character note ID.'); return; }
    setSaving(true);
    setPinError('');
    try {
      const response = await fetch('/api/system/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joplinNoteId: id, joplinViewerMode: 'pinned' }),
      });
      if (!response.ok) throw new Error();
      setNoteId(id);
      setMode('pinned');
      setEditingPin(false);
      setShowKeyboard(false);
    } catch {
      setPinError('The pinned note could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex h-full w-full flex-col gap-5 overflow-hidden">
      <header className="flex shrink-0 items-center gap-4 pr-32">
        <BookOpen size={36} className="text-white/60" />
        <div><h1 className="text-3xl font-black">Joplin</h1><p className="text-sm text-white/40">Read only · Edit your notes in Joplin</p></div>
      </header>
      <div className="flex flex-wrap items-center gap-3 pr-32">
        <button onPointerDown={() => chooseMode('daily')} className={'flex items-center gap-2 rounded-xl border px-5 py-3 font-bold ' + (mode === 'daily' ? 'border-white bg-white text-black' : 'border-white/10 text-white/50')}><CalendarCheck size={20} />Daily TODO</button>
        <button onPointerDown={() => chooseMode('pinned')} className={'flex items-center gap-2 rounded-xl border px-5 py-3 font-bold ' + (mode === 'pinned' ? 'border-white bg-white text-black' : 'border-white/10 text-white/50')}><Pin size={20} />Pinned note</button>
        <button onPointerDown={() => { setDraft(noteId); setPinError(''); setEditingPin(!editingPin); }} className="rounded-xl border border-white/10 px-5 py-3 font-bold text-white/60">Choose note</button>
        <button onPointerDown={refresh} aria-label="Refresh note" className="rounded-xl border border-white/10 p-3 text-white/60"><RefreshCw size={22} /></button>
      </div>
      {editingPin && (
        <div className="shrink-0 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <label htmlFor="joplin-note-id" className="block text-sm text-white/60">Paste the note link copied from Joplin, or its note ID.</label>
          <div className="flex gap-3">
            <input id="joplin-note-id" value={draft} onChange={event => setDraft(event.target.value)} placeholder="Joplin note link or ID" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black p-3 text-white" />
            <button onPointerDown={() => setShowKeyboard(true)} aria-label="Open keyboard" className="rounded-xl bg-white/10 p-3"><Keyboard size={24} /></button>
            <button disabled={saving} onPointerDown={() => { void savePin(); }} className="rounded-xl bg-white px-5 py-3 font-bold text-black disabled:opacity-40">{saving ? 'Saving…' : 'Save'}</button>
          </div>
          {pinError && <p role="alert" className="text-sm text-amber-300">{pinError}</p>}
        </div>
      )}
      {error && <p role="status" className="shrink-0 rounded-xl bg-amber-500/10 px-4 py-3 text-amber-200">{stale ? 'Showing the last loaded version. ' : ''}{error}</p>}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-3xl border border-white/10 bg-white/[0.025] p-7">
        {note ? (
          <>
            <h2 className="text-3xl font-black">{note.title}</h2>
            {mode === 'daily' && note.day && note.day !== today && <p className="mt-2 text-base text-amber-200/80">Latest daily note with content · {note.day}</p>}
            <div className="mt-6 text-2xl"><JoplinNoteBody body={note.body} /></div>
          </>
        ) : <p className="py-16 text-center text-2xl text-white/40">{loading ? 'Loading note…' : error ? 'Your note will appear when Joplin reconnects.' : message || 'Choose a note to display.'}</p>}
      </div>
      {showKeyboard && <OnScreenKeyboard value={draft} onChange={setDraft} onClose={() => setShowKeyboard(false)} onSubmit={() => setShowKeyboard(false)} />}
    </section>
  );
}

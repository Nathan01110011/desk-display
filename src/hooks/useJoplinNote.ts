import { useCallback, useEffect, useRef, useState } from 'react';

export interface JoplinDisplayNote {
  id: string;
  title: string;
  body: string;
  updatedTime: number;
  day: string | null;
  hasContent: boolean;
}

interface NoteResult {
  note: JoplinDisplayNote | null;
  today: string;
  message?: string;
}

interface NoteState {
  key: string;
  result: NoteResult | null;
  error: string | null;
}

export function useJoplinNote(mode: 'daily' | 'pinned', noteId = '') {
  const key = mode + ':' + noteId;
  const [state, setState] = useState<NoteState>({ key: '', result: null, error: null });
  const refreshRef = useRef<() => void>(() => {});
  const refresh = useCallback(() => refreshRef.current(), []);

  useEffect(() => {
    let active = true;
    let running = false;
    const controller = new AbortController();
    const fetchNote = async () => {
      if (running) return;
      running = true;
      try {
        const params = new URLSearchParams({
          mode, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        if (noteId) params.set('id', noteId);
        const response = await fetch('/api/joplin?' + params, {
          cache: 'no-store',
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        });
        const data = await response.json();
        if (!active) return;
        if (!response.ok) {
          setState(previous => ({
            key,
            result: response.status >= 500 && previous.key === key ? previous.result : null,
            error: data.error || 'The note could not be loaded.',
          }));
          return;
        }
        setState({ key, result: data, error: null });
      } catch {
        if (active) setState(previous => ({
          key, result: previous.key === key ? previous.result : null,
          error: 'Joplin is unavailable. Trying again shortly.',
        }));
      } finally {
        running = false;
      }
    };
    refreshRef.current = () => { void fetchNote(); };
    void fetchNote();
    const timer = window.setInterval(() => { void fetchNote(); }, 60000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
      refreshRef.current = () => {};
    };
  }, [key, mode, noteId]);

  const current = state.key === key ? state : null;
  return {
    note: current?.result?.note ?? null,
    today: current?.result?.today ?? '',
    message: current?.result?.message,
    error: current?.error,
    stale: Boolean(current?.error && current.result?.note),
    loading: !current,
    refresh,
  };
}

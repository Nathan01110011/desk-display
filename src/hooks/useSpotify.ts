import { useState, useEffect, useRef, useCallback } from 'react';
import { SpotifyNowPlaying } from '@/types';

interface SpotifyStatusResponse extends SpotifyNowPlaying {
  error?: string;
  diagnostic?: string;
  status?: string;
}

export function useSpotify() {
  const [spotify, setSpotify] = useState<SpotifyNowPlaying | null>(null);
  const failCount = useRef(0);
  const lastDiagnostic = useRef<string | null>(null);
  const MAX_FAILS = 5; // Allow ~25 seconds of hiccups before clearing UI

  const reportDiagnostic = useCallback((kind: 'info' | 'warn' | 'error', key: string, message: string) => {
    if (lastDiagnostic.current === key) return;
    lastDiagnostic.current = key;

    if (kind === 'error') console.error(`[Spotify] ${message}`);
    else if (kind === 'warn') console.warn(`[Spotify] ${message}`);
    else console.info(`[Spotify] ${message}`);
  }, []);

  const fetchSpotify = useCallback(async () => {
    try {
      const res = await fetch('/api/spotify/now-playing', { cache: 'no-store' });
      const contentType = res.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        failCount.current++;
        reportDiagnostic('warn', `http:${res.status}:non-json`, `Now-playing endpoint returned HTTP ${res.status} with a non-JSON response.`);
        if (failCount.current >= MAX_FAILS) setSpotify(null);
        return;
      }

      const data = await res.json() as SpotifyStatusResponse;

      if (!res.ok) {
        failCount.current++;
        reportDiagnostic(
          'error',
          `http:${res.status}:${data.error || data.diagnostic || 'unknown'}`,
          `Now-playing endpoint failed with HTTP ${res.status}: ${data.diagnostic || data.error || 'Unknown error'}`,
        );
        if (failCount.current >= MAX_FAILS) setSpotify(null);
        return;
      }

      if (data.error) {
        failCount.current++;
        reportDiagnostic(
          'error',
          `api:${data.error}:${data.diagnostic || ''}`,
          `${data.error}${data.diagnostic ? ` — ${data.diagnostic}` : ''}`,
        );
        if (failCount.current >= MAX_FAILS) setSpotify(null);
        return;
      }

      // Success Logic:
      // 1. If it's playing, we are happy.
      // 2. If it's NOT playing but has a title, it's just paused - we are also happy.
      if (data.isPlaying || data.title) {
        if (lastDiagnostic.current) {
          console.info('[Spotify] Connection recovered and now-playing data is available again.');
        }
        lastDiagnostic.current = null;
        setSpotify(data);
        failCount.current = 0;
      } else {
        // No song and not playing = truly inactive. Log only when the state changes so
        // the 5-second poll does not fill the persistent console buffer with duplicates.
        failCount.current++;
        reportDiagnostic(
          'info',
          `inactive:${data.status || 'unknown'}`,
          `No active Spotify item${data.status ? ` (${data.status})` : ''}.`,
        );
        if (failCount.current >= MAX_FAILS) {
          setSpotify(null);
        }
      }
    } catch (error) {
      failCount.current++;
      const message = error instanceof Error ? error.message : String(error);
      reportDiagnostic('error', `fetch:${message}`, `Failed to call the now-playing endpoint: ${message}`);
      if (failCount.current >= MAX_FAILS) setSpotify(null);
    }
  }, [reportDiagnostic]);

  useEffect(() => {
    requestAnimationFrame(() => {
      fetchSpotify();
    });
    const sTimer = setInterval(fetchSpotify, 5000);

    const progressTimer = setInterval(() => {
      setSpotify(prev => {
        if (!prev || !prev.isPlaying || prev.progressMs >= prev.durationMs) return prev;
        return { ...prev, progressMs: prev.progressMs + 100 };
      });
    }, 100);

    return () => {
      clearInterval(sTimer);
      clearInterval(progressTimer);
    };
  }, [fetchSpotify]);

  const handleAction = async (action: 'play' | 'pause' | 'next') => {
    if (!spotify) return;

    if (action === 'play' || action === 'pause') {
      setSpotify({ ...spotify, isPlaying: action === 'play' });
    }

    try {
      const response = await fetch('/api/spotify/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: unknown } | null;
        console.error(`[Spotify] Playback control "${action}" failed with HTTP ${response.status}.`, body?.error || '');
      }

      if (action === 'next') {
        const oldTitle = spotify.title;
        const fastPoll = setInterval(async () => {
          const r = await fetch('/api/spotify/now-playing', { cache: 'no-store' });
          if (r.ok) {
            const d = await r.json();
            if (d.title !== oldTitle) {
              setSpotify(d);
              clearInterval(fastPoll);
            }
          }
        }, 200);
        setTimeout(() => clearInterval(fastPoll), 4000);
      }
    } catch (error) {
      console.error('[Spotify] Playback control request failed:', error);
    }
  };

  return { spotify, handleAction };
}

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, CircleAlert, Music2, RefreshCw, X } from 'lucide-react';
import { SystemUpdateButton } from './SystemUpdateButton';

type SpotifyConnectionState = 'checking' | 'connected' | 'expired' | 'error';

interface SpotifyStatusResponse {
  authRequired?: boolean;
  error?: string;
  diagnostic?: string;
}

export function SpotifyConnectionCard() {
  const [state, setState] = useState<SpotifyConnectionState>('checking');
  const [detail, setDetail] = useState('Checking Spotify authorization…');
  const [authOpen, setAuthOpen] = useState(false);
  const authWindow = useRef<Window | null>(null);

  const check = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify/now-playing', { cache: 'no-store' });
      const data = await response.json().catch(() => ({})) as SpotifyStatusResponse;

      if (data.authRequired) {
        setState('expired');
        setDetail(data.error || 'Spotify authorization has expired.');
        return;
      }

      if (response.ok) {
        setState('connected');
        setDetail('Spotify is authorized.');
        return;
      }

      setState('error');
      setDetail(data.diagnostic || data.error || `Spotify status check failed (HTTP ${response.status}).`);
    } catch (error) {
      setState('error');
      setDetail(error instanceof Error ? error.message : 'Could not check Spotify authorization.');
    }
  }, []);

  useEffect(() => {
    // Defer the initial external-state sync out of the effect body. React's
    // set-state-in-effect rule rejects calling a state-updating callback directly
    // from an effect, even when that callback performs async work first.
    const frame = window.requestAnimationFrame(() => {
      void check();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [check]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'spotify-auth-complete') return;

      setAuthOpen(false);
      authWindow.current = null;
      void check();
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [check]);

  useEffect(() => {
    if (!authOpen) return;

    const timer = window.setInterval(() => {
      if (authWindow.current?.closed) {
        authWindow.current = null;
        setAuthOpen(false);
        window.clearInterval(timer);
      }
    }, 500);

    return () => window.clearInterval(timer);
  }, [authOpen]);

  const reconnect = () => {
    const width = Math.min(900, Math.max(600, window.screen.availWidth - 160));
    const height = Math.min(900, Math.max(650, window.screen.availHeight - 120));
    const left = Math.max(0, Math.floor((window.screen.availWidth - width) / 2));
    const top = Math.max(0, Math.floor((window.screen.availHeight - height) / 2));

    const popup = window.open(
      '/api/spotify/login',
      'spotify-reauth',
      `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
    );

    if (!popup) {
      window.location.assign('/api/spotify/login');
      return;
    }

    authWindow.current = popup;
    setAuthOpen(true);
    popup.focus();
  };

  const cancelAuth = () => {
    try {
      authWindow.current?.close();
    } catch {
      // The popup may already have navigated cross-origin; closing a script-opened window is still attempted above.
    }
    authWindow.current = null;
    setAuthOpen(false);
  };

  return (
    <>
      <div className="space-y-3">
        <div className={`rounded-2xl border p-4 ${state === 'expired' ? 'border-amber-400/25 bg-amber-400/[0.06]' : 'border-white/5 bg-white/[0.03]'}`}>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/55">
              <Music2 size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white/75">Spotify</span>
                {state === 'connected' && <CheckCircle2 size={15} className="text-green-400" />}
                {state === 'expired' && <CircleAlert size={15} className="text-amber-400" />}
                {state === 'checking' && <RefreshCw size={14} className="animate-spin text-white/30" />}
              </div>
              <p className={`mt-0.5 truncate text-xs ${state === 'expired' ? 'text-amber-200/60' : state === 'error' ? 'text-red-300/60' : 'text-white/30'}`} title={detail}>
                {detail}
              </p>
            </div>
            <button
              onPointerDown={reconnect}
              className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-black transition-all active:scale-95 ${
                state === 'expired'
                  ? 'border-green-400/30 bg-green-500/15 text-green-300'
                  : 'border-white/10 bg-white/5 text-white/45'
              }`}
            >
              {state === 'expired' ? 'Reconnect' : 'Reauthorize'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
          <div className="mb-3">
            <div className="font-bold text-white/75">System Update</div>
            <p className="mt-0.5 text-xs text-white/30">Pull latest main, rebuild, restart PM2, and relaunch the kiosk.</p>
          </div>
          <SystemUpdateButton />
        </div>
      </div>

      {authOpen && (
        <div className="fixed inset-0 z-[1000] flex items-start justify-end pointer-events-none p-5">
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/15 bg-black/90 px-4 py-3 shadow-2xl">
            <span className="text-xs font-bold text-white/60">Spotify login open</span>
            <button
              onPointerDown={cancelAuth}
              className="flex size-11 items-center justify-center rounded-xl border border-red-400/25 bg-red-500/15 text-red-300 active:scale-90 transition-all"
              aria-label="Cancel Spotify login"
              title="Cancel Spotify login"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

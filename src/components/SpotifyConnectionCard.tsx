'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, Music2, RefreshCw } from 'lucide-react';

type SpotifyConnectionState = 'checking' | 'connected' | 'expired' | 'error';

interface SpotifyStatusResponse {
  authRequired?: boolean;
  error?: string;
  diagnostic?: string;
}

export function SpotifyConnectionCard() {
  const [state, setState] = useState<SpotifyConnectionState>('checking');
  const [detail, setDetail] = useState('Checking Spotify authorization…');

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const response = await fetch('/api/spotify/now-playing', { cache: 'no-store' });
        const data = await response.json().catch(() => ({})) as SpotifyStatusResponse;
        if (cancelled) return;

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
        if (cancelled) return;
        setState('error');
        setDetail(error instanceof Error ? error.message : 'Could not check Spotify authorization.');
      }
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  const reconnect = () => {
    window.location.assign('/api/spotify/login');
  };

  return (
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
  );
}

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, Music2, RefreshCw } from 'lucide-react';
import { SystemUpdateButton } from './SystemUpdateButton';
import { ServiceHealthDashboard } from './ServiceHealthDashboard';

type SpotifyConnectionState = 'checking' | 'connected' | 'expired' | 'error';

interface SpotifyStatusResponse {
  authRequired?: boolean;
  error?: string;
  diagnostic?: string;
}

export function SpotifyConnectionCard() {
  const [state, setState] = useState<SpotifyConnectionState>('checking');
  const [detail, setDetail] = useState('Checking Spotify authorization…');
  const [launchingAuth, setLaunchingAuth] = useState(false);

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
    const frame = window.requestAnimationFrame(() => {
      void check();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [check]);

  const reconnect = async () => {
    if (launchingAuth) return;

    setLaunchingAuth(true);
    setDetail('Opening Spotify login outside kiosk mode…');

    try {
      const response = await fetch('/api/spotify/auth-window', { method: 'POST' });
      const data = await response.json().catch(() => ({})) as { error?: string };

      if (!response.ok) {
        setLaunchingAuth(false);
        setState('error');
        setDetail(data.error || `Failed to launch Spotify login (HTTP ${response.status}).`);
      }
    } catch (error) {
      setLaunchingAuth(false);
      setState('error');
      setDetail(error instanceof Error ? error.message : 'Failed to launch Spotify login.');
    }
  };

  return (
    <div className="space-y-3">
      <ServiceHealthDashboard />

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
              {(state === 'checking' || launchingAuth) && <RefreshCw size={14} className="animate-spin text-white/30" />}
            </div>
            <p className={`mt-0.5 truncate text-xs ${state === 'expired' ? 'text-amber-200/60' : state === 'error' ? 'text-red-300/60' : 'text-white/30'}`} title={detail}>
              {detail}
            </p>
            <p className="mt-1 text-[10px] text-white/20">Reauth temporarily leaves kiosk mode so the Pi keyboard and window close button remain available.</p>
          </div>
          <button
            onPointerDown={() => void reconnect()}
            disabled={launchingAuth}
            className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-black transition-all active:scale-95 disabled:opacity-50 ${
              state === 'expired'
                ? 'border-green-400/30 bg-green-500/15 text-green-300'
                : 'border-white/10 bg-white/5 text-white/45'
            }`}
          >
            {launchingAuth ? 'Opening…' : state === 'expired' ? 'Reconnect' : 'Reauthorize'}
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
  );
}

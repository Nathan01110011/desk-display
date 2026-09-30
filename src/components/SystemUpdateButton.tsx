'use client';

import React, { useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

export function SystemUpdateButton() {
  const [armed, setArmed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disarmTimer = useRef<number | null>(null);

  const triggerUpdate = async () => {
    setError(null);

    if (!armed) {
      setArmed(true);
      if (disarmTimer.current) window.clearTimeout(disarmTimer.current);
      disarmTimer.current = window.setTimeout(() => setArmed(false), 5000);
      return;
    }

    setStarting(true);
    try {
      const response = await fetch('/api/system/update', { method: 'POST' });
      const data = await response.json().catch(() => ({})) as { success?: boolean; error?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Update failed to start (HTTP ${response.status}).`);
      }

      console.info('[System] Update and rebuild started. The kiosk will restart automatically when complete.');
      setArmed(false);
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : String(updateError);
      console.error('[System] Failed to start update:', updateError);
      setError(message);
      setStarting(false);
      setArmed(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onPointerDown={() => void triggerUpdate()}
        disabled={starting}
        className={`w-full px-5 py-3 rounded-xl border font-bold text-sm active:scale-95 transition-all disabled:opacity-60 ${
          armed
            ? 'bg-amber-500/15 text-amber-300 border-amber-400/30'
            : 'bg-blue-500/10 text-blue-300 border-blue-400/20'
        }`}
      >
        <span className="inline-flex items-center justify-center gap-2">
          {starting ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
          {starting ? 'Starting Update…' : armed ? 'Tap Again to Update' : 'Update & Rebuild'}
        </span>
      </button>
      {error && <p className="text-center text-[10px] text-red-300/70">{error}</p>}
    </div>
  );
}

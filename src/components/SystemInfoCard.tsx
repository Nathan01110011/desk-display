'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Clipboard, MonitorCog, RefreshCw } from 'lucide-react';

interface SystemInfo {
  hostname: string;
  username: string;
  primaryIp: string | null;
  primaryInterface: string | null;
  addresses: { interface: string; address: string }[];
  sshCommand: string | null;
}

export function SystemInfoCard() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/system/info', { cache: 'no-store' });
      const body = await response.json() as SystemInfo;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setInfo(body);
    } catch (error) {
      console.error('[System] Failed to load network information:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void refresh();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [refresh]);

  const copySsh = async () => {
    if (!info?.sshCommand) return;
    try {
      await navigator.clipboard.writeText(info.sshCommand);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('[System] Failed to copy SSH command:', error);
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/55">
          <MonitorCog size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-black text-white/80">Raspberry Pi</div>
          <div className="mt-0.5 text-xs text-white/30">
            {info?.hostname || 'Loading host information…'}
            {info?.primaryInterface ? ` · ${info.primaryInterface}` : ''}
          </div>
        </div>
        <button
          onPointerDown={() => void refresh()}
          disabled={loading}
          className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/45 disabled:opacity-40 active:scale-90 transition-all"
          aria-label="Refresh network information"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-white/5 bg-black/20 p-4">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/25">LAN IP Address</div>
          <div className="mt-1 font-mono text-xl font-black text-white/80">
            {info?.primaryIp || 'No network address found'}
          </div>
          {info?.sshCommand && (
            <div className="mt-1 truncate font-mono text-xs text-blue-300/60">{info.sshCommand}</div>
          )}
        </div>
        <button
          onPointerDown={() => void copySsh()}
          disabled={!info?.sshCommand}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/50 disabled:opacity-30 active:scale-95 transition-all"
        >
          {copied ? <Check size={15} /> : <Clipboard size={15} />}
          {copied ? 'Copied' : 'Copy SSH'}
        </button>
      </div>

      {info && info.addresses.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {info.addresses.map((item) => (
            <span
              key={`${item.interface}-${item.address}`}
              className="rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1 font-mono text-[10px] text-white/30"
            >
              {item.interface}: {item.address}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Clipboard, RefreshCw, Trash2 } from 'lucide-react';
import { SpotifyConnectionCard } from './SpotifyConnectionCard';
import { SystemInfoCard } from './SystemInfoCard';

export type ConsoleLogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  level: ConsoleLogLevel;
  message: string;
}

const STORAGE_KEY = 'desk-display:console-logs';
const EVENT_NAME = 'desk-display:console-log';
const MAX_ENTRIES = 1000;
const MAX_MESSAGE_LENGTH = 10_000;
const INITIAL_RENDER_LIMIT = 150;
const RENDER_LIMIT_STEP = 150;

function safeStringify(value: unknown): string {
  if (value instanceof Error) {
    return value.stack || `${value.name}: ${value.message}`;
  }

  if (typeof value === 'string') return value;
  if (typeof value === 'undefined') return 'undefined';
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
  if (typeof value === 'symbol') return value.toString();

  try {
    const seen = new WeakSet<object>();
    return JSON.stringify(value, (_key, item: unknown) => {
      if (typeof item === 'bigint') return `${item.toString()}n`;
      if (item instanceof Error) {
        return { name: item.name, message: item.message, stack: item.stack };
      }
      if (typeof item === 'object' && item !== null) {
        if (seen.has(item)) return '[Circular]';
        seen.add(item);
      }
      return item;
    });
  } catch {
    return String(value);
  }
}

function formatArgs(args: unknown[]): string {
  return args.map(safeStringify).join(' ').slice(0, MAX_MESSAGE_LENGTH);
}

export function readConsoleLogs(): ConsoleLogEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeConsoleLogs(entries: ConsoleLogEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // If storage is full or unavailable, logging must never break the app.
  }
}

function appendEntry(level: ConsoleLogLevel, args: unknown[]) {
  if (typeof window === 'undefined') return;

  const entry: ConsoleLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
    level,
    message: formatArgs(args),
  };

  const next = [...readConsoleLogs(), entry].slice(-MAX_ENTRIES);
  writeConsoleLogs(next);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: entry }));
}

export function clearConsoleLogs() {
  if (typeof window === 'undefined') return;
  writeConsoleLogs([]);
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function ConsoleLogCapture() {
  useEffect(() => {
    const levels: ConsoleLogLevel[] = ['log', 'info', 'warn', 'error', 'debug'];
    const originals = new Map<ConsoleLogLevel, (...args: unknown[]) => void>();
    const consoleMethods = console as unknown as Record<ConsoleLogLevel, (...args: unknown[]) => void>;

    for (const level of levels) {
      const original = consoleMethods[level].bind(console);
      originals.set(level, original);
      consoleMethods[level] = (...args: unknown[]) => {
        appendEntry(level, args);
        original(...args);
      };
    }

    const handleWindowError = (event: ErrorEvent) => {
      appendEntry('error', [
        'Uncaught error:',
        event.message,
        event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : '',
        event.error || '',
      ]);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      appendEntry('error', ['Unhandled promise rejection:', event.reason]);
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      for (const [level, original] of originals) {
        consoleMethods[level] = original;
      }
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}

interface ConsoleLogViewerProps {
  onBack: () => void;
}

type UpdateState = 'idle' | 'confirm' | 'starting' | 'error';

export function ConsoleLogViewer({ onBack }: ConsoleLogViewerProps) {
  const [logs, setLogs] = useState<ConsoleLogEntry[]>([]);
  const [level, setLevel] = useState<'all' | ConsoleLogLevel>('all');
  const [copied, setCopied] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateState>('idle');
  const [renderLimit, setRenderLimit] = useState(INITIAL_RENDER_LIMIT);

  const refresh = () => setLogs(readConsoleLogs());

  useEffect(() => {
    const refreshTimer = window.setTimeout(refresh, 0);
    const handleLog = () => refresh();
    window.addEventListener(EVENT_NAME, handleLog);
    return () => {
      window.clearTimeout(refreshTimer);
      window.removeEventListener(EVENT_NAME, handleLog);
    };
  }, []);

  const filteredLogs = useMemo(
    () => (level === 'all' ? logs : logs.filter((entry) => entry.level === level)),
    [level, logs],
  );

  const visibleLogs = useMemo(
    () => filteredLogs.slice(-renderLimit),
    [filteredLogs, renderLimit],
  );

  const copyLogs = async () => {
    const text = filteredLogs
      .map((entry) => `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(text || 'No console logs captured.');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('Failed to copy console logs:', error);
    }
  };

  const startUpdate = async () => {
    if (updateState === 'idle' || updateState === 'error') {
      setUpdateState('confirm');
      return;
    }

    if (updateState !== 'confirm') return;

    setUpdateState('starting');
    console.info('[System] Starting update and rebuild from origin/main.');

    try {
      const response = await fetch('/api/system/update', { method: 'POST' });
      const data = await response.json().catch(() => ({})) as { success?: boolean; error?: string; message?: string };

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Update request failed with HTTP ${response.status}`);
      }

      console.info(`[System] ${data.message || 'Update started. The kiosk will restart when it is complete.'}`);
    } catch (error) {
      console.error('[System] Failed to start update:', error);
      setUpdateState('error');
    }
  };

  const levelStyles: Record<ConsoleLogLevel, string> = {
    log: 'text-white/70 border-white/10',
    info: 'text-blue-300 border-blue-400/20',
    warn: 'text-amber-300 border-amber-400/20',
    error: 'text-red-300 border-red-400/20',
    debug: 'text-violet-300 border-violet-400/20',
  };

  const updateLabel = updateState === 'confirm'
    ? 'Tap Again to Update'
    : updateState === 'starting'
      ? 'Updating…'
      : updateState === 'error'
        ? 'Retry Update'
        : 'Update & Rebuild';

  return (
    <div className="w-full max-w-6xl mx-auto h-full overflow-y-auto overscroll-contain py-8 pr-4 scrollbar-hide touch-pan-y">
      <div className="flex min-h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onPointerDown={onBack}
            className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 active:scale-90 transition-all"
            aria-label="Back to settings"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-white/30">Settings</div>
            <h2 className="text-2xl font-black text-white/85">System Admin</h2>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            onPointerDown={startUpdate}
            disabled={updateState === 'starting'}
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold active:scale-95 transition-all disabled:cursor-wait disabled:opacity-60 ${
              updateState === 'confirm'
                ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                : 'border-white/10 bg-white/5 text-white/55'
            }`}
          >
            <RefreshCw size={17} className={updateState === 'starting' ? 'animate-spin' : ''} /> {updateLabel}
          </button>
          <button
            onPointerDown={refresh}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/55 active:scale-95 transition-all"
          >
            <RefreshCw size={17} /> Refresh
          </button>
          <button
            onPointerDown={copyLogs}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/55 active:scale-95 transition-all"
          >
            {copied ? <Check size={17} /> : <Clipboard size={17} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onPointerDown={() => {
              clearConsoleLogs();
              refresh();
            }}
            className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400 active:scale-95 transition-all"
          >
            <Trash2 size={17} /> Clear
          </button>
        </div>
      </div>

      {updateState === 'starting' && (
        <div className="rounded-2xl border border-blue-400/20 bg-blue-400/[0.06] px-4 py-3 text-xs font-bold text-blue-200/70">
          Update launched. The kiosk will close shortly while it pulls, installs and builds, then Chromium will relaunch automatically.
        </div>
      )}

      <SystemInfoCard />

      <SpotifyConnectionCard />

      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'error', 'warn', 'info', 'log', 'debug'] as const).map((option) => {
          const selected = level === option;
          return (
            <button
              key={option}
              onPointerDown={() => { setLevel(option); setRenderLimit(INITIAL_RENDER_LIMIT); }}
              className={`rounded-xl border px-4 py-2 text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
                selected ? 'border-white bg-white text-black' : 'border-white/10 bg-white/[0.03] text-white/35'
              }`}
            >
              {option}
            </button>
          );
        })}
        <span className="ml-auto text-xs font-bold text-white/25">{visibleLogs.length} shown · {filteredLogs.length} matching · {logs.length} stored</span>
      </div>

      <div className="rounded-3xl border border-white/10 bg-black/40 p-4 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="flex h-full min-h-56 items-center justify-center text-center text-white/25">
            No logs captured yet. Errors and console output will appear here automatically.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.length > visibleLogs.length && (
              <button
                onPointerDown={() => setRenderLimit((current) => current + RENDER_LIMIT_STEP)}
                className="mb-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-black uppercase tracking-widest text-white/35 active:scale-[0.99] transition-all"
              >
                Load older logs ({filteredLogs.length - visibleLogs.length} remaining)
              </button>
            )}
            {visibleLogs.map((entry) => (
              <div key={entry.id} className={`rounded-xl border bg-white/[0.025] p-3 ${levelStyles[entry.level]}`}>
                <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60">
                  <span>{entry.level}</span>
                  <span>·</span>
                  <time dateTime={entry.timestamp}>{new Date(entry.timestamp).toLocaleString()}</time>
                </div>
                <pre className="whitespace-pre-wrap break-words font-mono leading-relaxed">{entry.message}</pre>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="pb-4 text-center text-[10px] text-white/20">
        Stores the latest {MAX_ENTRIES} browser-side entries on this device, including uncaught errors and rejected promises.
      </p>
      </div>
    </div>
  );
}

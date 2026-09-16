'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Clipboard, RefreshCw, Trash2 } from 'lucide-react';

export type ConsoleLogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  level: ConsoleLogLevel;
  message: string;
}

const STORAGE_KEY = 'desk-display:console-logs';
const EVENT_NAME = 'desk-display:console-log';
const MAX_ENTRIES = 300;
const MAX_MESSAGE_LENGTH = 10_000;

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

    for (const level of levels) {
      const original = console[level].bind(console) as (...args: unknown[]) => void;
      originals.set(level, original);
      console[level] = (...args: unknown[]) => {
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
        console[level] = original;
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

export function ConsoleLogViewer({ onBack }: ConsoleLogViewerProps) {
  const [logs, setLogs] = useState<ConsoleLogEntry[]>([]);
  const [level, setLevel] = useState<'all' | ConsoleLogLevel>('all');
  const [copied, setCopied] = useState(false);

  const refresh = () => setLogs(readConsoleLogs());

  useEffect(() => {
    refresh();
    const handleLog = () => refresh();
    window.addEventListener(EVENT_NAME, handleLog);
    return () => window.removeEventListener(EVENT_NAME, handleLog);
  }, []);

  const filteredLogs = useMemo(
    () => (level === 'all' ? logs : logs.filter((entry) => entry.level === level)),
    [level, logs],
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

  const levelStyles: Record<ConsoleLogLevel, string> = {
    log: 'text-white/70 border-white/10',
    info: 'text-blue-300 border-blue-400/20',
    warn: 'text-amber-300 border-amber-400/20',
    error: 'text-red-300 border-red-400/20',
    debug: 'text-violet-300 border-violet-400/20',
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex h-full flex-col gap-4 py-8 pr-4">
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
            <h2 className="text-2xl font-black text-white/85">Console Logs</h2>
          </div>
        </div>

        <div className="flex gap-2">
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

      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'error', 'warn', 'info', 'log', 'debug'] as const).map((option) => {
          const selected = level === option;
          return (
            <button
              key={option}
              onPointerDown={() => setLevel(option)}
              className={`rounded-xl border px-4 py-2 text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
                selected ? 'border-white bg-white text-black' : 'border-white/10 bg-white/[0.03] text-white/35'
              }`}
            >
              {option}
            </button>
          );
        })}
        <span className="ml-auto text-xs font-bold text-white/25">{filteredLogs.length} shown · {logs.length} stored</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-3xl border border-white/10 bg-black/40 p-4 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="flex h-full min-h-56 items-center justify-center text-center text-white/25">
            No logs captured yet. Errors and console output will appear here automatically.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((entry) => (
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

      <p className="text-center text-[10px] text-white/20">
        Stores the latest {MAX_ENTRIES} browser-side entries on this device, including uncaught errors and rejected promises.
      </p>
    </div>
  );
}

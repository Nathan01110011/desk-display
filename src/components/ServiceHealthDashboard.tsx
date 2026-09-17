'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

type ServiceHealthStatus = 'healthy' | 'degraded' | 'down';

interface ServiceHealthResult {
  id: string;
  name: string;
  status: ServiceHealthStatus;
  detail: string;
  latencyMs?: number;
}

interface HealthResponse {
  overall: ServiceHealthStatus;
  checkedAt: string;
  services: ServiceHealthResult[];
}

const statusStyles: Record<ServiceHealthStatus, { dot: string; text: string; label: string }> = {
  healthy: { dot: 'bg-green-400', text: 'text-green-300', label: 'Healthy' },
  degraded: { dot: 'bg-amber-400', text: 'text-amber-300', label: 'Degraded' },
  down: { dot: 'bg-red-400', text: 'text-red-300', label: 'Down' },
};

const loadingSlots = ['health-1', 'health-2', 'health-3', 'health-4', 'health-5', 'health-6', 'health-7', 'health-8'];

export function ServiceHealthDashboard() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/system/health', { cache: 'no-store' });
      const body = await response.json().catch(() => null) as HealthResponse | null;
      if (!response.ok || !body) {
        throw new Error(`Health check failed with HTTP ${response.status}`);
      }

      setData(body);
      for (const service of body.services) {
        const message = `[Health] ${service.name}: ${service.status} — ${service.detail}${typeof service.latencyMs === 'number' ? ` (${service.latencyMs}ms)` : ''}`;
        if (service.status === 'down') console.error(message);
        else if (service.status === 'degraded') console.warn(message);
        else console.info(message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error(`[Health] Service health check failed: ${message}`);
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

  const overall = data ? statusStyles[data.overall] : null;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-white/80">Service Health</h3>
            {overall && <span className={`text-xs font-black ${overall.text}`}>{overall.label}</span>}
          </div>
          <p className="mt-0.5 text-xs text-white/30">
            {data ? `Last checked ${new Date(data.checkedAt).toLocaleTimeString()}` : 'Checking configured integrations…'}
          </p>
        </div>
        <button
          onPointerDown={() => void refresh()}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/50 disabled:opacity-40 active:scale-95 transition-all"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Check now
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/[0.07] p-4 text-sm text-red-300">
          Health endpoint failed: {error}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {(data?.services || []).map((service) => {
            const style = statusStyles[service.status];
            return (
              <div key={service.id} className="min-w-0 rounded-2xl border border-white/5 bg-black/20 p-3">
                <div className="flex items-center gap-2">
                  <span className={`size-2.5 shrink-0 rounded-full ${style.dot}`} />
                  <span className="truncate text-sm font-black text-white/70">{service.name}</span>
                </div>
                <p className={`mt-2 text-[11px] font-bold ${style.text}`}>{style.label}</p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-white/30" title={service.detail}>
                  {service.detail}
                </p>
                {typeof service.latencyMs === 'number' && (
                  <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-white/15">{service.latencyMs} ms</p>
                )}
              </div>
            );
          })}

          {loading && !data && loadingSlots.map((slot) => (
            <div key={slot} className="h-24 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-black uppercase tracking-widest text-white/20">
        <span><i className="mr-1.5 inline-block size-2 rounded-full bg-green-400" />Healthy</span>
        <span><i className="mr-1.5 inline-block size-2 rounded-full bg-amber-400" />Fallback / partial / unconfigured</span>
        <span><i className="mr-1.5 inline-block size-2 rounded-full bg-red-400" />Failed / auth required</span>
      </div>
    </div>
  );
}

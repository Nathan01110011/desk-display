import { useState, useEffect, useCallback } from 'react';
import { FitbitStats } from '@/types';

export function useFitbit(enabled: boolean = false) {
  const [stats, setStats] = useState<FitbitStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const res = await fetch('/api/google-health/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch Fitbit stats', e);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      queueMicrotask(() => {
        setLoading(false);
      });
      return;
    }
    queueMicrotask(() => {
      fetchStats();
    });
    const timer = setInterval(fetchStats, 1000 * 60 * 5); // Refresh every 5 minutes
    return () => clearInterval(timer);
  }, [fetchStats, enabled]);

  return { stats, loading, refresh: fetchStats };
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { SportMatch } from '@/types';

export function useSports() {
  const [matches, setMatches] = useState<SportMatch[]>([]);
  const matchesRef = useRef<SportMatch[]>([]);

  const fetchSports = useCallback(async () => {
    try {
      const res = await fetch('/api/sports');
      if (res.ok) {
        const data = await res.json();
        setMatches(data);
        matchesRef.current = data;
      }
    } catch (e) {
      console.error("Sports Fetch Error:", e);
    }
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      fetchSports();
    });
    
    // Check ref for live status to avoid dependency loop
    const isLive = matchesRef.current.some(m => m.status === 'IN');
    const interval = isLive ? 30000 : 300000;

    const timer = setInterval(fetchSports, interval);
    return () => clearInterval(timer);
  }, [fetchSports]);

  return { matches };
}

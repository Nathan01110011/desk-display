import { useState, useEffect, useCallback } from 'react';
import { SportMatch } from '@/types';

export function useSports() {
  const [matches, setMatches] = useState<SportMatch[]>([]);

  const fetchSports = useCallback(async () => {
    try {
      const res = await fetch('/api/sports');
      if (res.ok) {
        const data = await res.json();
        setMatches(data);
      }
    } catch (e) {
      console.error("Sports Fetch Error:", e);
    }
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      fetchSports();
    });

    // Check live status to determine initial interval
    const isLive = matches.some(m => m.status === 'IN');
    const interval = isLive ? 30000 : 300000;

    const timer = setInterval(fetchSports, interval);
    return () => clearInterval(timer);
  }, [fetchSports, matches]); // Include matches to handle dynamic polling interval correctly
 // Re-run effect if matches count changes

  return { matches };
}

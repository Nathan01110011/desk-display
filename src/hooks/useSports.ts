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
    fetchSports();
    
    // Create a dynamic interval
    const getInterval = () => {
      const isLive = matches.some(m => m.status === 'IN');
      return isLive ? 30000 : 300000;
    };

    const timer = setInterval(fetchSports, getInterval());
    return () => clearInterval(timer);
  }, [fetchSports, matches.length]); // Re-run effect if matches count changes

  return { matches };
}

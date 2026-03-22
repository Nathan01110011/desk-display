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
    // Initial fetch
    fetchSports();
    
    // Interval based polling (Stable 5 min interval)
    const timer = setInterval(() => {
      fetchSports();
    }, 300000);

    return () => clearInterval(timer);
  }, [fetchSports]);

  return { matches };
}

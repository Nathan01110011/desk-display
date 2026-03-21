import { useState, useEffect } from 'react';
import { SpotifyNowPlaying } from '@/types';

export function useSpotify() {
  const [spotify, setSpotify] = useState<SpotifyNowPlaying | null>(null);

  const fetchSpotify = async () => {
    try {
      const res = await fetch('/api/spotify/now-playing');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setSpotify(data);
      }
    } catch (e) { console.error("Spotify Fetch Error:", e); }
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      fetchSpotify();
    });
    const sTimer = setInterval(fetchSpotify, 5000);

    const progressTimer = setInterval(() => {
      setSpotify(prev => {
        if (!prev || !prev.isPlaying || prev.progressMs >= prev.durationMs) return prev;
        return { ...prev, progressMs: prev.progressMs + 100 };
      });
    }, 100);

    return () => {
      clearInterval(sTimer);
      clearInterval(progressTimer);
    };
  }, []);

  const handleAction = async (action: 'play' | 'pause' | 'next') => {
    if (!spotify) return;
    
    if (action === 'play' || action === 'pause') {
      setSpotify({ ...spotify, isPlaying: action === 'play' });
    }

    try {
      await fetch('/api/spotify/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      if (action === 'next') {
        const oldTitle = spotify.title;
        const fastPoll = setInterval(async () => {
          const r = await fetch('/api/spotify/now-playing');
          if (r.ok) {
            const d = await r.json();
            if (d.title !== oldTitle) { 
              setSpotify(d); 
              clearInterval(fastPoll); 
            }
          }
        }, 200);
        setTimeout(() => clearInterval(fastPoll), 4000);
      }
    } catch (e) { console.error(e); }
  };

  return { spotify, handleAction };
}

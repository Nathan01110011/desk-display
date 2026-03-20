"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Music, Clock, Play, Pause, SkipForward } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

interface CalendarEvent {
  summary: string;
  start: string;
  end: string;
  location?: string;
  isAllDay: boolean;
}

interface SpotifyNowPlaying {
  isPlaying: boolean;
  title: string;
  artist: string;
  album: string;
  albumImageUrl: string;
  progressMs: number;
  durationMs: number;
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [calendar, setCalendar] = useState<CalendarEvent[]>([]);
  const [spotify, setSpotify] = useState<SpotifyNowPlaying | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);

    const fetchData = async () => {
      try {
        const [sRes, cRes] = await Promise.all([
          fetch('/api/spotify/now-playing'),
          fetch('/api/calendar')
        ]);
        if (sRes.ok) setSpotify(await sRes.json());
        if (cRes.ok) setCalendar(await cRes.json());
      } catch (e) { console.error(e); }
    };

    fetchData();
    const sTimer = setInterval(fetchData, 5000);
    const cTimer = setInterval(fetchData, 120000);

    const progressTimer = setInterval(() => {
      setSpotify(prev => {
        if (!prev || !prev.isPlaying || prev.progressMs >= prev.durationMs) return prev;
        return { ...prev, progressMs: prev.progressMs + 100 };
      });
    }, 100);

    return () => {
      clearInterval(clockTimer);
      clearInterval(sTimer);
      clearInterval(cTimer);
      clearInterval(progressTimer);
    };
  }, []);

  const handleAction = async (action: 'play' | 'pause' | 'next') => {
    if (!spotify) return;
    
    if (action === 'play' || action === 'pause') {
      setSpotify({ ...spotify, isPlaying: action === 'play' });
    }

    try {
      const res = await fetch('/api/spotify/control', {
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

  function formatTime(ms: number) {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  if (!mounted || !currentTime) return <main className="fixed inset-0 bg-black" />;

  return (
    <main className="fixed inset-0 bg-black text-white flex overflow-hidden font-sans select-none antialiased">
      <AnimatePresence mode="wait">
        {spotify?.albumImageUrl && (
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={spotify.albumImageUrl} 
              alt="" 
              className="absolute inset-0 w-full h-full object-cover blur-[100px] saturate-[150%] opacity-40" 
            />
          </div>
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full flex h-full">
        {/* Left Column: Calendar */}
        <div className="w-1/3 border-r border-white/10 p-10 flex flex-col bg-black/40 backdrop-blur-3xl">
          <div className="mb-12">
            <h1 className="text-6xl font-bold tracking-tighter mb-2">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </h1>
            <p className="text-2xl text-white/50 font-medium">
              {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <div className="flex-1 space-y-10 overflow-y-auto scrollbar-hide">
            <h2 className="text-sm uppercase tracking-[0.2em] text-white/30 font-bold flex items-center gap-3">
              <CalendarIcon size={18} /> Today
            </h2>
            {calendar.length > 0 ? calendar.map((event, i) => (
              <div key={i} className="space-y-1">
                <p className="text-2xl font-bold leading-tight line-clamp-2">{event.summary}</p>
                <div className="text-white/40 text-lg flex items-center gap-2">
                  <Clock size={16} />
                  {event.isAllDay ? "All Day" : new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
              </div>
            )) : <div className="text-white/20 italic text-xl">No events left</div>}
          </div>
        </div>

        {/* Right Column: Spotify */}
        <div className="w-2/3 p-12 flex items-center justify-center">
          {spotify ? (
            <div className="w-full flex items-center gap-12 max-w-5xl">
              <div className="relative w-[340px] h-[340px] shrink-0 shadow-2xl rounded-2xl overflow-hidden">
                {spotify.albumImageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={spotify.albumImageUrl} alt="Album Art" className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full bg-white/5 flex items-center justify-center">
                    <Music size={100} className="text-white/10" />
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col justify-center space-y-8 min-w-0">
                <div className="space-y-2">
                  <h3 className="text-6xl font-black tracking-tight leading-tight line-clamp-2">
                    {spotify.title || "Inactive"}
                  </h3>
                  <p className="text-3xl font-medium text-white/60 truncate">
                    {spotify.artist || "No track playing"}
                  </p>
                </div>
                {spotify.title && (
                  <div className="w-full space-y-10">
                    <div className="w-full space-y-4">
                      <Progress value={(spotify.progressMs / spotify.durationMs) * 100} className="h-3 bg-white/10" />
                      <div className="flex justify-between text-xl font-mono text-white/20 tracking-widest">
                        <span>{formatTime(spotify.progressMs)}</span>
                        <span>{formatTime(spotify.durationMs)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <button 
                        onPointerDown={() => handleAction(spotify.isPlaying ? 'pause' : 'play')}
                        className="p-12 rounded-full bg-white text-black shadow-2xl active:scale-90 transition-transform"
                      >
                        {spotify.isPlaying ? <Pause size={64} fill="currentColor" /> : <Play size={64} fill="currentColor" className="ml-2" />}
                      </button>
                      <button 
                        onPointerDown={() => handleAction('next')}
                        className="p-10 rounded-full bg-white/10 text-white shadow-xl active:scale-90 transition-transform"
                      >
                        <SkipForward size={48} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 opacity-20 text-center">
              <Music size={100} />
              <p className="text-2xl uppercase tracking-widest">Connecting to Spotify...</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

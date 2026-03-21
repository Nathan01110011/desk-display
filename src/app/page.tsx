"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Music, Clock, Play, Pause, SkipForward, Timer, X, RotateCcw } from 'lucide-react';
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
  const [activeView, setActiveView] = useState<'dashboard' | 'pomodoro'>('dashboard');

  // Pomodoro State
  const [pomoTime, setPomoTime] = useState(25 * 60);
  const [pomoActive, setPomoActive] = useState(false);
  const [pomoMode, setPomoMode] = useState<'work' | 'break'>('work');

  useEffect(() => {
    // Avoid synchronous state updates in effect
    requestAnimationFrame(() => {
      setMounted(true);
      setCurrentTime(new Date());
    });
    
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

    // Pomodoro Countdown Logic
    const pomoTimer = setInterval(() => {
      if (pomoActive) {
        setPomoTime(prev => {
          if (prev <= 0) {
            setPomoActive(false);
            // Simple alert or sound could go here
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      clearInterval(clockTimer);
      clearInterval(sTimer);
      clearInterval(cTimer);
      clearInterval(progressTimer);
      clearInterval(pomoTimer);
    };
  }, [pomoActive]);

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

  function formatTime(ms: number) {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  function formatPomoTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
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

        {/* Right Column: Spotify & Apps OR Pomodoro */}
        <div className="w-2/3 p-12 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {activeView === 'dashboard' ? (
              <motion.div
                key="dashboard-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full flex flex-col items-center space-y-12"
              >
                {/* Compact Spotify Section (2/3 height equivalent) */}
                {spotify ? (
                  <div className="w-full flex items-center gap-10 max-w-4xl">
                    <div className="relative w-[240px] h-[240px] shrink-0 shadow-2xl rounded-2xl overflow-hidden">
                      {spotify.albumImageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={spotify.albumImageUrl} alt="Album Art" className="object-cover w-full h-full" />
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                          <Music size={80} className="text-white/10" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-center space-y-6 min-w-0">
                      <div className="space-y-1">
                        <h3 className="text-4xl font-black tracking-tight leading-tight line-clamp-2">
                          {spotify.title || "Inactive"}
                        </h3>
                        <p className="text-xl font-medium text-white/60 truncate">
                          {spotify.artist || "No track playing"}
                        </p>
                      </div>

                      {spotify.title && (
                        <div className="w-full space-y-6">
                          <div className="w-full space-y-2">
                            <Progress value={(spotify.progressMs / spotify.durationMs) * 100} className="h-2 bg-white/10" />
                            <div className="flex justify-between text-lg font-mono text-white/20 tracking-widest">
                              <span>{formatTime(spotify.progressMs)}</span>
                              <span>{formatTime(spotify.durationMs)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <button 
                              onPointerDown={() => handleAction(spotify.isPlaying ? 'pause' : 'play')}
                              className="p-8 rounded-full bg-white text-black shadow-xl active:scale-90 transition-transform"
                            >
                              {spotify.isPlaying ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="ml-1" />}
                            </button>
                            <button 
                              onPointerDown={() => handleAction('next')}
                              className="p-6 rounded-full bg-white/10 text-white shadow-lg active:scale-90 transition-transform"
                            >
                              <SkipForward size={32} fill="currentColor" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 opacity-20 py-10">
                    <Music size={80} />
                    <p className="text-xl uppercase tracking-widest">Spotify Offline</p>
                  </div>
                )}

                {/* App Launcher Section (1/3 height equivalent) */}
                <div className="w-full max-w-4xl border-t border-white/5 pt-12">
                  <div className="grid grid-cols-4 gap-6">
                    <button
                      onPointerDown={() => setActiveView('pomodoro')}
                      className="aspect-square rounded-3xl bg-white/5 flex flex-col items-center justify-center gap-3 hover:bg-white/10 active:scale-95 transition-all border border-white/5"
                    >
                      <Timer size={48} className="text-white/80" />
                      <span className="text-lg font-bold text-white/40">Pomodoro</span>
                    </button>
                    {/* Placeholder for future apps */}
                    <div className="aspect-square rounded-3xl bg-white/[0.02] flex items-center justify-center border border-dashed border-white/5 opacity-30">
                      <span className="text-sm font-bold text-white/20 uppercase tracking-widest">Next App</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Pomodoro View */
              <motion.div
                key="pomodoro-view"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full flex flex-col items-center space-y-12"
              >
                <div className="flex items-center gap-4 text-white/30 font-bold uppercase tracking-[0.3em] text-sm">
                  <Timer size={20} /> Pomodoro
                </div>

                <div className="text-[12rem] font-black tracking-tighter leading-none text-white tabular-nums">
                  {formatPomoTime(pomoTime)}
                </div>

                <div className="flex items-center gap-8">
                  <button
                    onPointerDown={() => {
                      setPomoMode(pomoMode === 'work' ? 'break' : 'work');
                      setPomoTime(pomoMode === 'work' ? 5 * 60 : 25 * 60);
                      setPomoActive(false);
                    }}
                    className="px-8 py-4 rounded-2xl bg-white/5 text-xl font-bold border border-white/10"
                  >
                    {pomoMode === 'work' ? 'Switch to Break' : 'Switch to Work'}
                  </button>
                  
                  <button
                    onPointerDown={() => setPomoActive(!pomoActive)}
                    className="p-12 rounded-full bg-white text-black shadow-2xl active:scale-90 transition-transform"
                  >
                    {pomoActive ? <Pause size={64} fill="currentColor" /> : <Play size={64} fill="currentColor" className="ml-2" />}
                  </button>

                  <button
                    onPointerDown={() => {
                      setPomoActive(false);
                      setPomoTime(pomoMode === 'work' ? 25 * 60 : 5 * 60);
                    }}
                    className="p-8 rounded-full bg-white/10 text-white shadow-xl active:scale-90 transition-transform"
                  >
                    <RotateCcw size={40} />
                  </button>
                </div>

                <button
                  onPointerDown={() => setActiveView('dashboard')}
                  className="absolute top-0 right-0 p-6 text-white/20 hover:text-white/60 active:scale-90 transition-all"
                >
                  <X size={48} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

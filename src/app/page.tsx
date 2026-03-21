"use client";

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSpotify } from '@/hooks/useSpotify';
import { useCalendar } from '@/hooks/useCalendar';
import { usePomodoro } from '@/hooks/usePomodoro';
import { CalendarView } from '@/components/CalendarView';
import { SpotifyPlayer } from '@/components/SpotifyPlayer';
import { PomodoroView } from '@/components/PomodoroView';
import { AppLauncher } from '@/components/AppLauncher';
import { ViewState } from '@/types';

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [activeView, setActiveView] = useState<ViewState>('dashboard');

  const { spotify, handleAction } = useSpotify();
  const { calendar } = useCalendar();
  const { pomoTime, pomoActive, pomoMode, togglePomo, resetPomo, switchMode } = usePomodoro();

  useEffect(() => {
    // Avoid synchronous state updates in effect
    requestAnimationFrame(() => {
      setMounted(true);
      setCurrentTime(new Date());
    });
    
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  if (!mounted || !currentTime) return <main className="fixed inset-0 bg-black" />;

  return (
    <main className="fixed inset-0 bg-black text-white flex overflow-hidden font-sans select-none antialiased">
      {/* Background Glassmorphism Layer */}
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
        {/* Left Column: Calendar (Constant) */}
        <div className="w-1/3 border-r border-white/10 p-10 flex flex-col bg-black/40 backdrop-blur-3xl">
          <div className="mb-12">
            <h1 className="text-6xl font-bold tracking-tighter mb-2">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </h1>
            <p className="text-2xl text-white/50 font-medium">
              {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <CalendarView calendar={calendar} />
        </div>

        {/* Right Column: View Switching */}
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
                <SpotifyPlayer spotify={spotify} onAction={handleAction} />
                <AppLauncher 
                  onOpenPomo={() => setActiveView('pomodoro')} 
                  pomoActive={pomoActive} 
                  pomoTime={pomoTime} 
                />
              </motion.div>
            ) : (
              <PomodoroView 
                pomoTime={pomoTime}
                pomoActive={pomoActive}
                pomoMode={pomoMode}
                onToggle={togglePomo}
                onReset={resetPomo}
                onSwitchMode={() => switchMode()}
                onClose={() => setActiveView('dashboard')}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

"use client";

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSpotify } from '@/hooks/useSpotify';
import { useCalendar } from '@/hooks/useCalendar';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useSports } from '@/hooks/useSports';
import { useTime } from '@/hooks/useTime';
import { CalendarView } from '@/components/CalendarView';
import { SpotifyPlayer } from '@/components/SpotifyPlayer';
import { PomodoroView } from '@/components/PomodoroView';
import { SportsView } from '@/components/SportsView';
import { AppLauncher } from '@/components/AppLauncher';
import { SettingsView } from '@/components/SettingsView';
import { WeatherView } from '@/components/WeatherView';
import { useWeather } from '@/hooks/useWeather';
import { ViewState, AppConfig } from '@/types';

const DEFAULT_CONFIG: AppConfig = {
  pomodoro: true,
  sports: true,
  weather: true
};

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  const { spotify, handleAction } = useSpotify();
  const { calendar } = useCalendar();
  const { matches } = useSports();
  const { weather } = useWeather();
  const { 
    pomoTime, pomoActive, pomoMode, workDuration, breakDuration, 
    togglePomo, resetPomo, switchMode, updateDurations 
  } = usePomodoro();

  // The main clock uses the offset from the weather city, or system time if loading
  const { time, date, clocks, updateClocks } = useTime(weather?.timezone);

  const isSportsLive = matches.some(m => m.status === 'IN');

  useEffect(() => {
    const initSettings = async () => {
      // 1. Try backend first
      try {
        const res = await fetch('/api/system/settings');
        const data = await res.json();
        
        if (data.appConfig) setAppConfig(data.appConfig);
        if (data.worldClocks) updateClocks(data.worldClocks);
        if (data.weatherLocation) localStorage.setItem('weatherLocation', data.weatherLocation);
        
        // Sync Pomodoro Durations
        if (data.pomoWork) updateDurations(data.pomoWork, data.pomoBreak || 5);
      } catch (e) {
        const savedConfig = localStorage.getItem('appConfig');
        if (savedConfig) setAppConfig(JSON.parse(savedConfig));
      }
      
      setMounted(true);
    };

    initSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateAppConfig = async (newConfig: AppConfig) => {
    setAppConfig(newConfig);
    localStorage.setItem('appConfig', JSON.stringify(newConfig));
    // Persist to backend
    await fetch('/api/system/settings', {
      method: 'POST',
      body: JSON.stringify({ appConfig: newConfig })
    });
  };

  const handleUpdateDurations = async (work: number, brk: number) => {
    updateDurations(work, brk);
    // Persist to backend
    await fetch('/api/system/settings', {
      method: 'POST',
      body: JSON.stringify({ pomoWork: work, pomoBreak: brk })
    });
  };

  if (!mounted) return <main className="fixed inset-0 bg-black" />;

  return (
    <main className="fixed inset-0 bg-black text-white flex overflow-hidden font-sans select-none antialiased">
      {/* Background Glassmorphism */}
      <AnimatePresence mode="wait">
        {spotify?.albumImageUrl ? (
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={spotify.albumImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-[100px] saturate-[150%] opacity-40" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-black" />
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full flex h-full">
        {/* Left Column (Static) */}
        <div className="w-1/3 border-r border-white/10 p-10 flex flex-col bg-black/40 backdrop-blur-3xl">
          <div className="mb-12">
            <h1 className="text-6xl font-bold tracking-tighter mb-2">{time}</h1>
            <p className="text-2xl text-white/50 font-medium mb-6">{date}</p>
            
            {/* Additional Clocks */}
            {clocks.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-white/5">
                {clocks.map(c => (
                  <div key={c.id} className="flex justify-between items-center text-white/40">
                    <span className="text-lg font-bold uppercase tracking-widest">{c.label}</span>
                    <span className="text-2xl font-mono tabular-nums">{c.displayTime}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <CalendarView calendar={calendar} />
        </div>

        {/* Right Column (Dynamic Views) */}
        <div className="w-2/3 p-12 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {activeView === 'dashboard' && (
              <motion.div
                key="dashboard-view"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="w-full flex flex-col items-center space-y-12"
              >
                <SpotifyPlayer spotify={spotify} onAction={handleAction} />
                <AppLauncher 
                  onOpenPomo={() => setActiveView('pomodoro')} 
                  onOpenSettings={() => setActiveView('settings')}
                  onOpenSports={() => setActiveView('sports')}
                  onOpenWeather={() => setActiveView('weather')}
                  pomoActive={pomoActive} 
                  pomoTime={pomoTime} 
                  pomoMode={pomoMode}
                  isSportsLive={isSportsLive}
                  appConfig={appConfig}
                />
              </motion.div>
            )}

            {activeView === 'pomodoro' && (
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

            {activeView === 'sports' && (
              <SportsView 
                matches={matches}
                onClose={() => setActiveView('dashboard')}
              />
            )}

            {activeView === 'weather' && (
              <WeatherView 
                weather={weather}
                onClose={() => setActiveView('dashboard')}
              />
            )}

            {activeView === 'settings' && (
              <SettingsView 
                workDuration={workDuration}
                breakDuration={breakDuration}
                onUpdateDurations={handleUpdateDurations}
                onClose={() => setActiveView('dashboard')}
                appConfig={appConfig}
                onUpdateAppConfig={updateAppConfig}
                worldClocks={clocks}
                onUpdateClocks={updateClocks}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

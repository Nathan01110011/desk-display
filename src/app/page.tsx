"use client";

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
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
  weather: true,
  appOrder: ['pomodoro', 'sports', 'weather']
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

  const { time, date, clocks, updateClocks } = useTime(weather?.timezone);

  const isSportsLive = matches.some(m => m.status === 'IN');

  useEffect(() => {
    const initSettings = async () => {
      try {
        const res = await fetch('/api/system/settings');
        const data = await res.json();
        
        if (data.appConfig) setAppConfig({ ...DEFAULT_CONFIG, ...data.appConfig });
        if (data.worldClocks) updateClocks(data.worldClocks);
        if (data.weatherLocation) localStorage.setItem('weatherLocation', data.weatherLocation);
        if (data.pomoWork) updateDurations(data.pomoWork, data.pomoBreak || 5);
      } catch (e) {
        const savedConfig = localStorage.getItem('appConfig');
        if (savedConfig) setAppConfig({ ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) });
      }
      setMounted(true);
    };
    initSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateAppConfig = async (newConfig: AppConfig) => {
    setAppConfig(newConfig);
    localStorage.setItem('appConfig', JSON.stringify(newConfig));
    await fetch('/api/system/settings', {
      method: 'POST',
      body: JSON.stringify({ appConfig: newConfig })
    });
  };

  const handleUpdateDurations = async (work: number, brk: number) => {
    updateDurations(work, brk);
    await fetch('/api/system/settings', {
      method: 'POST',
      body: JSON.stringify({ pomoWork: work, pomoBreak: brk })
    });
  };

  if (!mounted) return <main className="fixed inset-0 bg-black" />;

  return (
    <main className="fixed inset-0 bg-[#000000] text-white flex overflow-hidden font-sans select-none antialiased">
      <AnimatePresence mode="wait">
        {spotify?.albumImageUrl ? (
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={spotify.albumImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-[100px] saturate-[150%] opacity-40" />
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-0" 
            style={{ background: 'radial-gradient(circle at center, #333333 0%, #000000 70%)' }}
          />
        )}
      </AnimatePresence>
<div className="relative z-10 w-full flex h-full">
        {/* Left Column (Static) */}
        <div className="w-1/3 border-r border-white/10 p-10 flex flex-col bg-black/40 backdrop-blur-3xl">
          <div className="mb-10 flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-7xl font-black tracking-tighter leading-none">{time}</h1>
              <p className="text-xl text-white/40 font-bold uppercase tracking-widest mt-2">{date}</p>
            </div>
            
            {/* World Clocks Integrated on Right */}
            {clocks.length > 0 && (
              <div className="flex flex-col items-end gap-2 pt-1">
                {clocks.map(c => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">{c.label}</span>
                    <span className="text-base font-bold tabular-nums text-white/60">{c.displayTime}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <CalendarView calendar={calendar} />
        </div>


        <div className="w-2/3 p-12 flex flex-col h-full overflow-hidden relative">
          {/* Persistent Close Button for Apps */}
          <AnimatePresence>
            {activeView !== 'dashboard' && (
              <motion.button
                key="close-button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onPointerDown={() => setActiveView('dashboard')}
                className="absolute top-6 right-6 z-[100] p-6 text-white/20 hover:text-white/60 active:scale-90 transition-all rounded-full bg-white/5"
              >
                <X size={48} />
              </motion.button>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {activeView === 'dashboard' ? (
              <motion.div
                key="dashboard-view"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="w-full h-full flex flex-col justify-between items-center py-8"
              >
                <div className="w-full flex-1 flex items-center justify-center">
                  <SpotifyPlayer spotify={spotify} onAction={handleAction} />
                </div>
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
            ) : (
              <motion.div
                key="app-view"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                className="w-full h-full flex items-center justify-center"
              >
                {activeView === 'pomodoro' && (
                  <PomodoroView 
                    pomoTime={pomoTime} pomoActive={pomoActive} pomoMode={pomoMode}
                    onToggle={togglePomo} onReset={resetPomo} onSwitchMode={() => switchMode()}
                    onClose={() => setActiveView('dashboard')}
                  />
                )}
                {activeView === 'sports' && <SportsView matches={matches} onClose={() => setActiveView('dashboard')} />}
                {activeView === 'weather' && <WeatherView weather={weather} onClose={() => setActiveView('dashboard')} />}
                {activeView === 'settings' && (
                  <SettingsView 
                    workDuration={workDuration} breakDuration={breakDuration}
                    onUpdateDurations={handleUpdateDurations} onClose={() => setActiveView('dashboard')}
                    appConfig={appConfig} onUpdateAppConfig={updateAppConfig}
                    worldClocks={clocks} onUpdateClocks={updateClocks}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

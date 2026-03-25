"use client";

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useSpotify } from '@/hooks/useSpotify';
import { useCalendar } from '@/hooks/useCalendar';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useSports } from '@/hooks/useSports';
import { useTime } from '@/hooks/useTime';
import { useWeather } from '@/hooks/useWeather';
import { useFitbit } from '@/hooks/useFitbit';
import { useSmartHome } from '@/hooks/useSmartHome';
import { CalendarView } from '@/components/CalendarView';
import { SpotifyPlayer } from '@/components/SpotifyPlayer';
import { PomodoroView } from '@/components/PomodoroView';
import { SportsView } from '@/components/SportsView';
import { AppLauncher } from '@/components/AppLauncher';
import { SettingsView } from '@/components/SettingsView';
import { WeatherView } from '@/components/WeatherView';
import { FitbitView } from '@/components/FitbitView';
import { SmartHomeView } from '@/components/SmartHomeView';
import { ViewState, AppConfig } from '@/types';

const DEFAULT_CONFIG: AppConfig = {
  pomodoro: true,
  sports: true,
  weather: true,
  fitbit: false,
  home: true,
  appOrder: ['pomodoro', 'sports', 'weather', 'fitbit', 'home']
};

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [weatherDetail, setWeatherDetail] = useState(false);

  const { spotify, handleAction } = useSpotify();
  const { calendar } = useCalendar();
  const { matches } = useSports();
  const { weather } = useWeather();
  const { stats: fitbitStats, loading: fitbitLoading } = useFitbit(appConfig.fitbit);
  const { devices: smartDevices, loading: smartLoading, updateDevice } = useSmartHome(appConfig.home);
  const { 
    pomoTime, pomoActive, pomoMode, workDuration, breakDuration, 
    togglePomo, resetPomo, switchMode, updateDurations 
  } = usePomodoro();

  const { time, date, clocks, updateClocks, rawTime } = useTime(weather?.timezone);

  const isSportsLive = matches.some(m => m.status === 'IN');

  useEffect(() => {
    const initSettings = async () => {
      try {
        const res = await fetch('/api/system/settings');
        const data = await res.json();
        
        if (data.appConfig) {
          const mergedConfig = { ...DEFAULT_CONFIG, ...data.appConfig };
          if (mergedConfig.appOrder) {
            if (!mergedConfig.appOrder.includes('fitbit')) mergedConfig.appOrder.push('fitbit');
            if (!mergedConfig.appOrder.includes('home')) mergedConfig.appOrder.push('home');
          }
          setAppConfig(mergedConfig);
        }
        
        if (data.worldClocks) updateClocks(data.worldClocks);
        if (data.weatherLocation) localStorage.setItem('weatherLocation', data.weatherLocation);
        if (data.pomoWork) updateDurations(data.pomoWork, data.pomoBreak || 5);
      } catch (e) {
        const savedConfig = localStorage.getItem('appConfig');
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);
          setAppConfig({ ...DEFAULT_CONFIG, ...parsed });
        }
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

  const isFullscreenView = activeView === 'weather' && weatherDetail;

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
        {/* Sidebar (Animated Width) */}
        <motion.div 
          animate={{ 
            width: isFullscreenView ? "0%" : "33.333333%",
            opacity: isFullscreenView ? 0 : 1,
            x: isFullscreenView ? -100 : 0
          }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} 
          className="border-r border-white/10 flex flex-col bg-black/40 backdrop-blur-3xl overflow-hidden shrink-0 relative"
        >
          <div className="p-10 w-[33.33vw] h-full flex flex-col">
            <div className="mb-10 flex items-start justify-between w-full">
              <div className="flex-1">
                <h1 className="text-7xl font-black tracking-tighter leading-none">{time}</h1>
                <p className="text-xl text-white/40 font-bold uppercase tracking-widest mt-2">{date}</p>
              </div>
              {clocks.length > 0 && (
                <div className="flex flex-col items-end gap-2 pt-1 shrink-0">
                  {clocks.map(c => (
                    <div key={c.id} className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">{c.label}</span>
                      <span className="text-base font-bold tabular-nums text-white/60">{c.displayTime}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <CalendarView calendar={calendar} now={rawTime} />
          </div>
        </motion.div>

        {/* Main Area (Flex-1) */}
        <div className="flex-1 p-12 flex flex-col h-full overflow-hidden relative">
          <AnimatePresence>
            {activeView !== 'dashboard' && (
              <motion.button
                key="close-button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onPointerDown={() => {
                  setActiveView('dashboard');
                  setWeatherDetail(false);
                }}
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
                  onOpenFitbit={() => setActiveView('fitbit')}
                  onOpenHome={() => setActiveView('home')}
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
                {activeView === 'weather' && (
                  <WeatherView 
                    weather={weather} 
                    onClose={() => setActiveView('dashboard')} 
                    isExtended={weatherDetail}
                    onToggleExtended={setWeatherDetail}
                  />
                )}
                {activeView === 'fitbit' && <FitbitView stats={fitbitStats} loading={fitbitLoading} onClose={() => setActiveView('dashboard')} />}
                {activeView === 'home' && <SmartHomeView devices={smartDevices} loading={smartLoading} onUpdate={updateDevice} onClose={() => setActiveView('dashboard')} />}
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

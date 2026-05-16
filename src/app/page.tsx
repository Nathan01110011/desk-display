"use client";

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, BellOff, Timer, Hourglass } from 'lucide-react';
import { useSpotify } from '@/hooks/useSpotify';
import { useCalendar } from '@/hooks/useCalendar';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useSports } from '@/hooks/useSports';
import { useTime } from '@/hooks/useTime';
import { useWeather } from '@/hooks/useWeather';
import { useFitbit } from '@/hooks/useFitbit';
import { useSmartHome } from '@/hooks/useSmartHome';
import { useTimer } from '@/hooks/useTimer';
import { CalendarView } from '@/components/CalendarView';
import { CalendarAppView } from '@/components/CalendarAppView';
import { SpotifyPlayer } from '@/components/SpotifyPlayer';
import { PomodoroView } from '@/components/PomodoroView';
import { SportsView } from '@/components/SportsView';
import { AppLauncher } from '@/components/AppLauncher';
import { SettingsView } from '@/components/SettingsView';
import { WeatherView } from '@/components/WeatherView';
import { FitbitView } from '@/components/FitbitView';
import { SmartHomeView } from '@/components/SmartHomeView';
import { TimerView } from '@/components/TimerView';
import { RuleView } from '@/components/RuleView';
import { formatPomoTime } from '@/lib/format';
import { ViewState, AppConfig, RuleLockSettings } from '@/types';
import dynamic from 'next/dynamic';

const TodoView = dynamic(() => import('@/components/TodoView').then(mod => mod.TodoView), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full opacity-20"><Timer size={48} className="animate-spin" /></div>
});

const DEFAULT_CONFIG: AppConfig = {
  calendar: true,
  pomodoro: true,
  sports: true,
  weather: true,
  fitbit: false,
  home: true,
  timer: true,
  todo: true,
  rule: true,
  appOrder: ['calendar', 'pomodoro', 'sports', 'weather', 'fitbit', 'home', 'timer', 'todo', 'rule']
};

const DEFAULT_RULE_LOCK: RuleLockSettings = {
  enabled: true,
  timeoutMinutes: 10
};

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [ruleLock, setRuleLock] = useState<RuleLockSettings>(DEFAULT_RULE_LOCK);
  const [isRuleLocked, setIsRuleLocked] = useState(false);
  const [lastActivity, setLastActivity] = useState(() => Date.now());
  const [weatherDetail, setWeatherDetail] = useState(false);

  const { spotify, handleAction } = useSpotify();
  const { calendar } = useCalendar();
  const { matches } = useSports();
  const { weather, refresh: refreshWeather } = useWeather();
  const { stats: fitbitStats, loading: fitbitLoading } = useFitbit(appConfig.fitbit);
  const { devices: smartDevices, loading: smartLoading, updateDevice } = useSmartHome(appConfig.home);
  const { 
    timeLeft: timerSeconds, isActive: timerRunning, isFinished: timerUp,
    startTimer, pauseTimer, resumeTimer, resetTimer, dismissAlert
  } = useTimer();
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
            if (!mergedConfig.appOrder.includes('calendar')) mergedConfig.appOrder.unshift('calendar');
            if (!mergedConfig.appOrder.includes('fitbit')) mergedConfig.appOrder.push('fitbit');
            if (!mergedConfig.appOrder.includes('home')) mergedConfig.appOrder.push('home');
            if (!mergedConfig.appOrder.includes('timer')) mergedConfig.appOrder.push('timer');
            if (!mergedConfig.appOrder.includes('todo')) mergedConfig.appOrder.push('todo');
            if (!mergedConfig.appOrder.includes('rule')) mergedConfig.appOrder.push('rule');
          }
          setAppConfig(mergedConfig);
        }

        const loadedRuleLock = {
          enabled: data.ruleLockEnabled ?? DEFAULT_RULE_LOCK.enabled,
          timeoutMinutes: data.ruleLockTimeoutMinutes ?? DEFAULT_RULE_LOCK.timeoutMinutes
        };
        setRuleLock(loadedRuleLock);
        setIsRuleLocked(loadedRuleLock.enabled);
        
        if (data.worldClocks) updateClocks(data.worldClocks);
        if (data.weatherLocation) localStorage.setItem('weatherLocation', data.weatherLocation);
        if (data.weatherUnit) localStorage.setItem('weatherUnit', data.weatherUnit);
        if (data.pomoWork) updateDurations(data.pomoWork, data.pomoBreak || 5);
      } catch {
        const savedConfig = localStorage.getItem('appConfig');
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);
          setAppConfig({ ...DEFAULT_CONFIG, ...parsed });
        }
        setIsRuleLocked(DEFAULT_RULE_LOCK.enabled);
      }
      setMounted(true);
    };
    initSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mounted || !ruleLock.enabled || isRuleLocked) return;

    const markActivity = () => setLastActivity(Date.now());
    window.addEventListener('pointerdown', markActivity);
    window.addEventListener('keydown', markActivity);

    return () => {
      window.removeEventListener('pointerdown', markActivity);
      window.removeEventListener('keydown', markActivity);
    };
  }, [isRuleLocked, mounted, ruleLock.enabled]);

  useEffect(() => {
    if (!mounted || !ruleLock.enabled || isRuleLocked) return;

    const timeout = window.setTimeout(
      () => setIsRuleLocked(true),
      Math.max(1, ruleLock.timeoutMinutes) * 60 * 1000
    );

    return () => window.clearTimeout(timeout);
  }, [isRuleLocked, lastActivity, mounted, ruleLock.enabled, ruleLock.timeoutMinutes]);

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

  const handleUpdateRuleLock = (settings: RuleLockSettings) => {
    setRuleLock(settings);
    if (!settings.enabled) {
      setIsRuleLocked(false);
    }
    setLastActivity(Date.now());
  };

  const handleRuleUnlock = () => {
    setIsRuleLocked(false);
    setLastActivity(Date.now());
  };

  if (!mounted) return <main className="fixed inset-0 bg-black" />;

  const isFullscreenView = activeView === 'calendar' || (activeView === 'weather' && weatherDetail) || activeView === 'todo' || activeView === 'rule';

  return (
    <main className="fixed inset-0 bg-[#000000] text-white flex overflow-hidden font-sans select-none antialiased">
      <AnimatePresence mode="wait">
        {spotify?.albumImageUrl ? (
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={spotify.albumImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-[40px] saturate-125 opacity-30" />
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

      {/* Global Timer Alert Overlay */}
      <AnimatePresence>
        {isRuleLocked && (
          <motion.div
            key="rule-lock"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[800] bg-black"
          >
            <RuleView lockMode onSolved={handleRuleUnlock} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {timerUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.5, 1, 0] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="fixed inset-0 z-[500] bg-red-600/80 backdrop-blur-2xl flex flex-col items-center justify-center gap-12"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="flex flex-col items-center gap-4"
            >
              <BellOff size={120} className="text-white" />
              <h1 className="text-8xl font-black uppercase tracking-tighter italic">Time&apos;s Up!</h1>
            </motion.div>
            
            <button
              onPointerDown={dismissAlert}
              className="px-16 py-8 rounded-[3rem] bg-white text-black text-4xl font-black uppercase tracking-widest shadow-2xl active:scale-90 transition-transform"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full flex h-full">
        {/* Sidebar (Animated Width) */}
        <AnimatePresence>
          {!isFullscreenView && (
            <motion.div 
              key="sidebar"
              initial={{ x: -64, opacity: 0 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ x: -64, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }} 
              className="w-1/3 border-r border-white/10 flex flex-col bg-black/70 overflow-hidden shrink-0 relative"
            >
              <div className="p-8 w-[33.33vw] h-full flex flex-col">
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
          )}
        </AnimatePresence>

        {/* Main Area (Flex-1) */}
        <div className="flex-1 p-8 flex flex-col h-full overflow-hidden relative">
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
                  refreshWeather();
                }}
                className="absolute top-6 right-6 z-[100] p-6 text-white/50 hover:text-white active:scale-90 transition-all rounded-full bg-black/70 border border-white/10 shadow-2xl"
              >
                <X size={48} strokeWidth={3} />
              </motion.button>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {activeView === 'dashboard' ? (
              <motion.div
                key="dashboard-view"
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-full h-full flex flex-col justify-between items-center py-8 relative"
              >
                {/* Active Status Indicators */}
                <div className="absolute top-0 right-0 flex items-center gap-4">
                  <AnimatePresence>
                    {(pomoActive || (pomoTime === 0 && !pomoActive)) && (
                      <motion.div
                        key="pomo-status"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 text-white/60 active:scale-95 transition-all"
                      >
                        <div 
                          onPointerDown={() => setActiveView('pomodoro')}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Timer size={16} className={pomoActive ? "text-red-400 animate-pulse" : "text-green-500"} />
                          <span className="text-sm font-black tabular-nums">
                            {pomoActive ? formatPomoTime(pomoTime) : "DONE"}
                          </span>
                        </div>
                        {!pomoActive && (
                          <button 
                            onPointerDown={(e) => { e.stopPropagation(); resetPomo(); }}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </motion.div>
                    )}
                    {(timerRunning || (timerSeconds === 0 && !timerRunning && timerUp)) && (
                      <motion.div
                        key="timer-status"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 text-white/60 active:scale-95 transition-all"
                      >
                        <div 
                          onPointerDown={() => setActiveView('timer')}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Hourglass size={16} className={timerRunning ? "text-blue-400 animate-pulse" : "text-green-500"} />
                          <span className="text-sm font-black tabular-nums">
                            {timerRunning ? formatPomoTime(timerSeconds) : "DONE"}
                          </span>
                        </div>
                        {!timerRunning && (
                          <button 
                            onPointerDown={(e) => { e.stopPropagation(); dismissAlert(); }}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="w-full flex-1 flex items-center justify-center">
                  <SpotifyPlayer spotify={spotify} onAction={handleAction} />
                </div>
                <AppLauncher 
                  onOpenCalendar={() => setActiveView('calendar')}
                  onOpenPomo={() => setActiveView('pomodoro')} 
                  onOpenSettings={() => setActiveView('settings')}
                  onOpenSports={() => setActiveView('sports')}
                  onOpenWeather={() => setActiveView('weather')}
                  onOpenFitbit={() => setActiveView('fitbit')}
                  onOpenHome={() => setActiveView('home')}
                  onOpenTimer={() => setActiveView('timer')}
                  onOpenTodo={() => setActiveView('todo')}
                  onOpenRule={() => setActiveView('rule')}
                  onResetPomo={resetPomo}
                  onResetTimer={dismissAlert}
                  pomoActive={pomoActive} 
                  pomoTime={pomoTime} 
                  pomoFinished={pomoTime === 0 && !pomoActive}
                  pomoMode={pomoMode}
                  timerActive={timerRunning}
                  timerTime={timerSeconds}
                  timerFinished={timerUp}
                  isSportsLive={isSportsLive}
                  appConfig={appConfig}
                />
              </motion.div>
            ) : (
              <motion.div
                key="app-view"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-full h-full flex items-center justify-center"
              >
                {activeView === 'pomodoro' && (
                  <PomodoroView 
                    pomoTime={pomoTime} pomoActive={pomoActive} pomoMode={pomoMode}
                    onToggle={togglePomo} onReset={resetPomo} onSwitchMode={() => switchMode()}
                    onClose={() => setActiveView('dashboard')}
                  />
                )}
                {activeView === 'calendar' && <CalendarAppView now={rawTime} />}
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
                {activeView === 'timer' && (
                  <TimerView 
                    timeLeft={timerSeconds} isActive={timerRunning} isFinished={timerUp}
                    onStart={startTimer} onPause={pauseTimer} onResume={resumeTimer} onReset={resetTimer}
                    onDismiss={dismissAlert}
                    onClose={() => setActiveView('dashboard')}
                  />
                )}
                {activeView === 'settings' && (
                  <SettingsView 
                    workDuration={workDuration} breakDuration={breakDuration}
                    onUpdateDurations={handleUpdateDurations} onClose={() => setActiveView('dashboard')}
                    appConfig={appConfig} onUpdateAppConfig={updateAppConfig}
                    worldClocks={clocks} onUpdateClocks={updateClocks}
                    ruleLock={ruleLock} onUpdateRuleLock={handleUpdateRuleLock}
                  />
                )}
                {activeView === 'todo' && (
                  <TodoView />
                )}
                {activeView === 'rule' && (
                  <RuleView />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

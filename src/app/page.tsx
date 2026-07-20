"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { DashboardPomodoroPanel } from '@/components/DashboardPomodoroPanel';
import { DashboardTimerPanel } from '@/components/DashboardTimerPanel';
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
  lockOnOpen: true,
  lockOnInactivity: true,
  timeoutMinutes: 10
};

const DEFAULT_IDLE_CLOCK_TIMEOUT_MINUTES = 15;

const FULLSCREEN_APP_EXIT_MS = 240;
const FULLSCREEN_SIDEBAR_RETURN_MS = 280;

type FullscreenReturnPhase = 'idle' | 'app-exit' | 'sidebar-enter';

function isFullscreenAppView(view: ViewState, weatherDetail: boolean) {
  return view === 'calendar' || view === 'fitbit' || (view === 'weather' && weatherDetail) || view === 'todo' || view === 'rule';
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [ruleLock, setRuleLock] = useState<RuleLockSettings>(DEFAULT_RULE_LOCK);
  const [idleClockTimeoutMinutes, setIdleClockTimeoutMinutes] = useState(DEFAULT_IDLE_CLOCK_TIMEOUT_MINUTES);
  const [isRuleLocked, setIsRuleLocked] = useState(false);
  const [showIdleClock, setShowIdleClock] = useState(false);
  const [lastActivity, setLastActivity] = useState(() => Date.now());
  const [weatherDetail, setWeatherDetail] = useState(false);
  const [fullscreenReturnPhase, setFullscreenReturnPhase] = useState<FullscreenReturnPhase>('idle');
  const fullscreenReturnTimers = useRef<number[]>([]);

  const { spotify, handleAction } = useSpotify();
  const {
    calendar,
    allCalendar,
    personalCalendar,
    personalCalendarLoading,
    savePersonalCalendarEvent,
    deletePersonalCalendarEvent
  } = useCalendar();
  const { matches, loading: sportsLoading, refresh: refreshSports } = useSports();
  const { weather, refresh: refreshWeather } = useWeather();
  const { stats: fitbitStats, loading: fitbitLoading, refresh: refreshFitbit } = useFitbit(appConfig.fitbit);
  const { devices: smartDevices, loading: smartLoading, updateDevice } = useSmartHome(appConfig.home);
  const { 
    timeLeft: timerSeconds, duration: timerDuration, isActive: timerRunning, isFinished: timerUp,
    startTimer, pauseTimer, resumeTimer, resetTimer, dismissAlert
  } = useTimer();
  const { 
    pomoTime, pomoActive, pomoMode, workDuration, breakDuration, 
    togglePomo, resetPomo, switchMode, updateDurations 
  } = usePomodoro();

  const { time, date, clocks, updateClocks, rawTime } = useTime(weather?.timezone);

  const isSportsLive = matches.some(m => m.status === 'IN');
  const hasPomodoroHero = pomoActive;
  const hasTimerHero = timerRunning || timerUp;
  const hasBothTimerHeroes = hasPomodoroHero && hasTimerHero;
  const hasVisibleMusic = Boolean(spotify?.title);
  const hasDashboardHero = hasVisibleMusic || hasPomodoroHero || hasTimerHero;

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
          lockOnOpen: data.ruleLockOnOpen ?? data.ruleLockEnabled ?? DEFAULT_RULE_LOCK.lockOnOpen,
          lockOnInactivity: data.ruleLockOnInactivity ?? data.ruleLockEnabled ?? DEFAULT_RULE_LOCK.lockOnInactivity,
          timeoutMinutes: data.ruleLockTimeoutMinutes ?? DEFAULT_RULE_LOCK.timeoutMinutes
        };
        setRuleLock(loadedRuleLock);
        setIdleClockTimeoutMinutes(
          data.idleClockTimeoutMinutes ?? data.screenClockTimeoutMinutes ?? DEFAULT_IDLE_CLOCK_TIMEOUT_MINUTES
        );
        setIsRuleLocked(loadedRuleLock.lockOnOpen);
        
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
        setIsRuleLocked(DEFAULT_RULE_LOCK.lockOnOpen);
      }
      setMounted(true);
    };
    initSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const markActivity = useCallback(() => {
    setShowIdleClock(false);
    setLastActivity(Date.now());
  }, []);

  useEffect(() => {
    if (!mounted || isRuleLocked) return;

    window.addEventListener('pointerdown', markActivity);
    window.addEventListener('keydown', markActivity);

    return () => {
      window.removeEventListener('pointerdown', markActivity);
      window.removeEventListener('keydown', markActivity);
    };
  }, [isRuleLocked, markActivity, mounted]);

  useEffect(() => {
    if (!mounted || isRuleLocked || showIdleClock) return;

    const timeout = window.setTimeout(
      () => setShowIdleClock(true),
      Math.max(1, idleClockTimeoutMinutes) * 60 * 1000
    );

    return () => window.clearTimeout(timeout);
  }, [idleClockTimeoutMinutes, isRuleLocked, lastActivity, mounted, showIdleClock]);

  useEffect(() => {
    if (!mounted || !ruleLock.lockOnInactivity || isRuleLocked) return;

    const timeout = window.setTimeout(
      () => setIsRuleLocked(true),
      Math.max(1, ruleLock.timeoutMinutes) * 60 * 1000
    );

    return () => window.clearTimeout(timeout);
  }, [isRuleLocked, lastActivity, mounted, ruleLock.lockOnInactivity, ruleLock.timeoutMinutes]);

  useEffect(() => {
    return () => {
      fullscreenReturnTimers.current.forEach(timer => {
        window.clearTimeout(timer);
      });
      fullscreenReturnTimers.current = [];
    };
  }, []);

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
    if (!settings.lockOnOpen && !settings.lockOnInactivity) {
      setIsRuleLocked(false);
    }
    markActivity();
  };

  const handleUpdateIdleClockTimeout = (timeoutMinutes: number) => {
    setIdleClockTimeoutMinutes(timeoutMinutes);
    markActivity();
  };

  const handleRuleUnlock = () => {
    setIsRuleLocked(false);
    markActivity();
  };

  const clearFullscreenReturnTimers = () => {
    fullscreenReturnTimers.current.forEach(timer => {
      window.clearTimeout(timer);
    });
    fullscreenReturnTimers.current = [];
  };

  const openView = (view: ViewState) => {
    markActivity();
    clearFullscreenReturnTimers();
    setFullscreenReturnPhase('idle');
    setActiveView(view);
  };

  const closeActiveView = () => {
    markActivity();
    const wasFullscreen = isFullscreenAppView(activeView, weatherDetail);
    clearFullscreenReturnTimers();

    if (wasFullscreen) {
      setFullscreenReturnPhase('app-exit');
      fullscreenReturnTimers.current = [
        window.setTimeout(() => {
          setFullscreenReturnPhase('sidebar-enter');
        }, FULLSCREEN_APP_EXIT_MS),
        window.setTimeout(() => {
          setFullscreenReturnPhase('idle');
          fullscreenReturnTimers.current = [];
        }, FULLSCREEN_APP_EXIT_MS + FULLSCREEN_SIDEBAR_RETURN_MS),
      ];
    } else {
      setFullscreenReturnPhase('idle');
    }

    setActiveView('dashboard');
    setWeatherDetail(false);
    refreshWeather();
  };

  if (!mounted) return <main className="fixed inset-0 bg-black" />;

  const isActiveFullscreenView = isFullscreenAppView(activeView, weatherDetail);
  const isReturningFromFullscreen = fullscreenReturnPhase !== 'idle';
  const showSidebar = !isActiveFullscreenView && fullscreenReturnPhase !== 'app-exit';
  const showDashboardHome = activeView === 'dashboard' && !isReturningFromFullscreen;

  return (
    <main className="fixed inset-0 bg-[#000000] text-white flex overflow-hidden font-sans select-none antialiased">
      <AnimatePresence mode="wait">
        {hasVisibleMusic && spotify?.albumImageUrl ? (
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

      <AnimatePresence>
        {showIdleClock && !isRuleLocked && (
          <motion.div
            key="idle-clock"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            onPointerDown={markActivity}
            className="fixed inset-0 z-[400] bg-black flex items-center justify-center px-[6vw]"
          >
            <motion.div
              initial={{ y: 16, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 16, scale: 0.98 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={`grid w-full items-center gap-[5vw] ${
                clocks.length > 0 ? 'max-w-[92vw] grid-cols-[minmax(0,1fr)_minmax(16rem,22vw)]' : 'max-w-[90vw] grid-cols-1'
              }`}
            >
              <div className={`${clocks.length > 0 ? 'text-left' : 'text-center'}`}>
                <p className="text-[clamp(2.25rem,4vw,5rem)] font-black uppercase tracking-[0.35em] text-white/35">{date}</p>
                <h1 className={`${clocks.length > 0 ? 'text-[clamp(11rem,20vw,24rem)]' : 'text-[clamp(12rem,23vw,28rem)]'} mt-8 font-black tracking-tighter leading-none tabular-nums text-white`}>
                  {time}
                </h1>
              </div>
              {clocks.length > 0 && (
                <div className="flex flex-col items-end gap-[clamp(1.25rem,3vh,2.5rem)]">
                  {clocks.map(clock => (
                    <div key={clock.id} className="flex flex-col items-end gap-1">
                      <span className="text-[clamp(1.1rem,1.7vw,2rem)] font-black uppercase tracking-[0.22em] text-white/35">{clock.label}</span>
                      <span className="text-[clamp(2.75rem,5vw,5.75rem)] font-black tabular-nums leading-none text-white/80">{clock.displayTime}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full flex h-full">
        {/* Sidebar (Animated Width) */}
        <AnimatePresence>
          {showSidebar && (
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
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">{c.label}</span>
                          <span className="text-base font-bold tabular-nums text-white">{c.displayTime}</span>
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
                onPointerDown={closeActiveView}
                className="absolute top-6 right-6 z-[100] p-6 text-white/50 hover:text-white active:scale-90 transition-all rounded-full bg-black/70 border border-white/10 shadow-2xl"
              >
                <X size={48} strokeWidth={3} />
              </motion.button>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {showDashboardHome ? (
              <motion.div
                key="dashboard-view"
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                layout
                className={`w-full h-full flex flex-col items-center py-8 relative transition-[justify-content] duration-500 ease-out ${
                  hasDashboardHero ? 'justify-between' : 'justify-center'
                }`}
              >
                {/* Active Status Indicators */}
                <div className="absolute top-0 right-0 flex items-center gap-4">
                  <AnimatePresence>
                    {!pomoActive && (pomoTime === 0 && !pomoActive) && (
                      <motion.div
                        key="pomo-status"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 text-white/60 active:scale-95 transition-all"
                      >
                        <div 
                          onPointerDown={() => openView('pomodoro')}
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
                    {!timerRunning && (timerSeconds === 0 && !timerRunning && timerUp) && (
                      <motion.div
                        key="timer-status"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 text-white/60 active:scale-95 transition-all"
                      >
                        <div 
                          onPointerDown={() => openView('timer')}
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

                <AnimatePresence initial={false}>
                  {hasDashboardHero && (
                    <motion.div
                      key="dashboard-hero"
                      layout
                      initial={{ opacity: 0, y: -24, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -24, scale: 0.98 }}
                      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                      className="w-full flex-1 min-h-0 flex items-center justify-center"
                    >
                      {hasPomodoroHero || hasTimerHero ? (
                        <div
                          className={`grid w-full h-full max-h-[24rem] min-w-0 gap-5 items-stretch overflow-hidden ${
                            hasVisibleMusic ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : 'max-w-2xl grid-cols-1'
                          }`}
                        >
                          {hasVisibleMusic && (
                            <div className="min-w-0 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 flex items-center">
                              <SpotifyPlayer spotify={spotify} onAction={handleAction} compact />
                            </div>
                          )}
                          {hasBothTimerHeroes ? (
                            <div className="grid min-h-0 min-w-0 grid-rows-2 gap-4 overflow-hidden">
                              <DashboardPomodoroPanel
                                compact
                                timeLeft={pomoTime}
                                totalTime={(pomoMode === 'work' ? workDuration : breakDuration) * 60}
                                active={pomoActive}
                                mode={pomoMode}
                                onOpen={() => openView('pomodoro')}
                                onToggle={togglePomo}
                                onReset={resetPomo}
                              />
                              <DashboardTimerPanel
                                compact
                                timeLeft={timerSeconds}
                                totalTime={timerDuration}
                                active={timerRunning}
                                finished={timerUp}
                                onOpen={() => openView('timer')}
                                onPause={pauseTimer}
                                onResume={resumeTimer}
                                onReset={resetTimer}
                                onDismiss={dismissAlert}
                              />
                            </div>
                          ) : (
                            <>
                              {hasPomodoroHero && (
                                <DashboardPomodoroPanel
                                  timeLeft={pomoTime}
                                  totalTime={(pomoMode === 'work' ? workDuration : breakDuration) * 60}
                                  active={pomoActive}
                                  mode={pomoMode}
                                  onOpen={() => openView('pomodoro')}
                                  onToggle={togglePomo}
                                  onReset={resetPomo}
                                />
                              )}
                              {hasTimerHero && (
                                <DashboardTimerPanel
                                  timeLeft={timerSeconds}
                                  totalTime={timerDuration}
                                  active={timerRunning}
                                  finished={timerUp}
                                  onOpen={() => openView('timer')}
                                  onPause={pauseTimer}
                                  onResume={resumeTimer}
                                  onReset={resetTimer}
                                  onDismiss={dismissAlert}
                                />
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <SpotifyPlayer spotify={spotify} onAction={handleAction} />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div layout transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="w-full flex justify-center">
                  <AppLauncher 
                    onOpenCalendar={() => openView('calendar')}
                    onOpenPomo={() => openView('pomodoro')} 
                    onOpenSettings={() => openView('settings')}
                    onOpenSports={() => openView('sports')}
                    onOpenWeather={() => openView('weather')}
                    onOpenFitbit={() => openView('fitbit')}
                    onOpenHome={() => openView('home')}
                    onOpenTimer={() => openView('timer')}
                    onOpenTodo={() => openView('todo')}
                    onOpenRule={() => openView('rule')}
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
                    centered={!hasDashboardHero}
                  />
                </motion.div>
              </motion.div>
            ) : activeView === 'dashboard' ? (
              <motion.div
                key="returning-to-dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                className="w-full h-full"
              />
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
                    workDuration={workDuration} breakDuration={breakDuration}
                    onToggle={togglePomo} onReset={resetPomo} onSwitchMode={() => switchMode()}
                    onUpdateDurations={handleUpdateDurations}
                    onClose={closeActiveView}
                  />
                )}
                {activeView === 'calendar' && (
                  <CalendarAppView
                    now={rawTime}
                    calendar={allCalendar}
                    personalCalendar={personalCalendar}
                    personalCalendarLoading={personalCalendarLoading}
                    onSavePersonalEvent={savePersonalCalendarEvent}
                    onDeletePersonalEvent={deletePersonalCalendarEvent}
                  />
                )}
                {activeView === 'sports' && <SportsView matches={matches} loading={sportsLoading} onRefresh={refreshSports} onClose={closeActiveView} />}
                {activeView === 'weather' && (
                  <WeatherView 
                    weather={weather} 
                    onClose={closeActiveView} 
                    isExtended={weatherDetail}
                    onToggleExtended={setWeatherDetail}
                  />
                )}
                {activeView === 'fitbit' && <FitbitView stats={fitbitStats} loading={fitbitLoading} onRefresh={refreshFitbit} onClose={closeActiveView} />}
                {activeView === 'home' && <SmartHomeView devices={smartDevices} loading={smartLoading} onUpdate={updateDevice} onClose={closeActiveView} />}
                {activeView === 'timer' && (
                  <TimerView 
                    timeLeft={timerSeconds} totalTime={timerDuration} isActive={timerRunning} isFinished={timerUp}
                    onStart={startTimer} onPause={pauseTimer} onResume={resumeTimer} onReset={resetTimer}
                    onDismiss={dismissAlert}
                    onClose={closeActiveView}
                  />
                )}
                {activeView === 'settings' && (
                  <SettingsView 
                    onClose={closeActiveView}
                  appConfig={appConfig} onUpdateAppConfig={updateAppConfig}
                  worldClocks={clocks} onUpdateClocks={updateClocks}
                  ruleLock={ruleLock} onUpdateRuleLock={handleUpdateRuleLock}
                  idleClockTimeoutMinutes={idleClockTimeoutMinutes}
                  onUpdateIdleClockTimeout={handleUpdateIdleClockTimeout}
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

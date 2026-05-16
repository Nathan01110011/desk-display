import React from 'react';
import { Timer, Settings, Trophy, CheckCircle2, CloudSun, Activity, Home, Hourglass, X, List, CalendarDays } from 'lucide-react';
import { PomodoroMode, AppConfig } from '@/types';

type AppId = NonNullable<AppConfig['appOrder']>[number];

interface AppLauncherProps {
  onOpenPomo: () => void;
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
  onOpenSports: () => void;
  onOpenWeather: () => void;
  onOpenFitbit: () => void;
  onOpenHome: () => void;
  onOpenTimer: () => void;
  onOpenTodo: () => void;
  onResetPomo: () => void;
  onResetTimer: () => void;
  pomoActive: boolean;
  pomoTime: number;
  pomoFinished: boolean;
  pomoMode: PomodoroMode;
  timerActive: boolean;
  timerTime: number;
  timerFinished: boolean;
  isSportsLive: boolean;
  appConfig: AppConfig;
}

export function AppLauncher({ 
  onOpenPomo, 
  onOpenCalendar,
  onOpenSettings, 
  onOpenSports, 
  onOpenWeather,
  onOpenFitbit,
  onOpenHome,
  onOpenTimer,
  onOpenTodo,
  onResetPomo,
  onResetTimer,
  pomoActive, 
  pomoFinished,
  timerActive,
  timerFinished,
  isSportsLive,
  appConfig
}: AppLauncherProps) {
  const order: AppId[] = appConfig.appOrder || ['calendar', 'pomodoro', 'sports', 'weather', 'fitbit', 'home', 'timer', 'todo'];

  const apps: Record<AppId, React.ReactNode> = {
    calendar: (
      <button
        onPointerDown={onOpenCalendar}
        className="w-full aspect-square rounded-[2.5rem] bg-white/5 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-white/5"
      >
        <CalendarDays size={40} className="text-white/80" />
        <span className="text-base font-bold text-white/40">Calendar</span>
      </button>
    ),
    pomodoro: (
      <div className="relative group">
        <button
          onPointerDown={onOpenPomo}
          className={`w-full aspect-square rounded-[2.5rem] flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border ${
            pomoActive || pomoFinished
              ? 'bg-white/10 border-white/20' 
              : 'bg-white/5 border-white/5'
          }`}
        >
          <div className="relative">
            {pomoFinished ? (
              <CheckCircle2 size={40} className="text-green-500 animate-bounce" />
            ) : (
              <>
                <Timer size={40} className={pomoActive ? 'text-white' : 'text-white/80'} />
                {pomoActive && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-black animate-pulse" />
                )}
              </>
            )}
          </div>
          <span className={`text-base font-bold ${pomoActive || pomoFinished ? 'text-white' : 'text-white/40'}`}>
            {pomoFinished ? 'Done!' : 'Pomodoro'}
          </span>
        </button>
        {pomoFinished && (
          <button 
            onPointerDown={(e) => { e.stopPropagation(); onResetPomo(); }}
            className="absolute -top-2 -right-2 p-3 bg-white text-black rounded-full shadow-xl active:scale-90 transition-all z-20"
          >
            <X size={20} strokeWidth={3} />
          </button>
        )}
      </div>
    ),
    sports: (
      <button
        onPointerDown={onOpenSports}
        className={`w-full aspect-square rounded-[2.5rem] flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border ${
          isSportsLive 
            ? 'bg-red-500/10 border-red-500/20' 
            : 'bg-white/5 border-white/5'
        }`}
      >
        <div className="relative">
          <Trophy size={40} className={isSportsLive ? 'text-red-500 animate-pulse' : 'text-white/80'} />
          {isSportsLive && (
            <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-black" />
          )}
        </div>
        <span className={`text-base font-bold ${isSportsLive ? 'text-white' : 'text-white/40'}`}>
          {isSportsLive ? 'Live' : 'Sports'}
        </span>
      </button>
    ),
    weather: (
      <button
        onPointerDown={onOpenWeather}
        className="w-full aspect-square rounded-[2.5rem] bg-white/5 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-white/5"
      >
        <CloudSun size={40} className="text-white/80" />
        <span className="text-base font-bold text-white/40">Weather</span>
      </button>
    ),
    fitbit: (
      <button
        onPointerDown={onOpenFitbit}
        className="w-full aspect-square rounded-[2.5rem] bg-white/5 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-white/5"
      >
        <Activity size={40} className="text-white/80" />
        <span className="text-base font-bold text-white/40">Fitbit</span>
      </button>
    ),
    home: (
      <button
        onPointerDown={onOpenHome}
        className="w-full aspect-square rounded-[2.5rem] bg-white/5 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-white/5"
      >
        <Home size={40} className="text-white/80" />
        <span className="text-base font-bold text-white/40">Home</span>
      </button>
    ),
    timer: (
      <div className="relative group">
        <button
          onPointerDown={onOpenTimer}
          className={`w-full aspect-square rounded-[2.5rem] flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border ${
            timerActive || timerFinished
              ? 'bg-white/10 border-white/20' 
              : 'bg-white/5 border-white/5'
          }`}
        >
          <div className="relative">
            {timerFinished ? (
              <CheckCircle2 size={40} className="text-green-500 animate-bounce" />
            ) : (
              <>
                <Hourglass size={40} className={timerActive ? 'text-white' : 'text-white/80'} />
                {timerActive && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-black animate-pulse" />
                )}
              </>
            )}
          </div>
          <span className={`text-base font-bold ${timerActive || timerFinished ? 'text-white' : 'text-white/40'}`}>
            {timerFinished ? 'Done!' : 'Timer'}
          </span>
        </button>
        {timerFinished && (
          <button 
            onPointerDown={(e) => { e.stopPropagation(); onResetTimer(); }}
            className="absolute -top-2 -right-2 p-3 bg-white text-black rounded-full shadow-xl active:scale-90 transition-all z-20"
          >
            <X size={20} strokeWidth={3} />
          </button>
        )}
      </div>
    ),
    todo: (
      <button
        onPointerDown={onOpenTodo}
        className="w-full aspect-square rounded-[2.5rem] bg-white/5 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-white/5"
      >
        <List size={40} className="text-white/80" />
        <span className="text-base font-bold text-white/40">TODO</span>
      </button>
    )
  };

  const activeApps = order.filter(appId => appConfig[appId]);
  const launcherItems = [
    ...activeApps.map(appId => ({ id: appId, content: apps[appId] })),
    {
      id: 'settings',
      content: (
        <button
          onPointerDown={onOpenSettings}
          className="w-full aspect-square rounded-[2.5rem] bg-white/5 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-white/5"
        >
          <Settings size={40} className="text-white/80" />
          <span className="text-base font-bold text-white/40">Settings</span>
        </button>
      )
    }
  ];
  const totalIcons = launcherItems.length;
  const isMultiRow = totalIcons > 5;
  const columnCount = isMultiRow ? Math.ceil(totalIcons / 2) : totalIcons;
  const multiRowTileMaxWidth = '9rem';
  const rows = isMultiRow
    ? [launcherItems.slice(0, columnCount), launcherItems.slice(columnCount)]
    : [launcherItems];

  return (
    <div className={`w-full border-t border-white/5 px-4 ${isMultiRow ? 'max-w-5xl pt-6' : 'max-w-5xl pt-10'}`}>
      <div className={`flex flex-col w-full mx-auto ${isMultiRow ? 'gap-4' : 'gap-5'}`}>
        {rows.map((row, index) => (
          <div key={index} className={`flex justify-center ${isMultiRow ? 'gap-4' : 'gap-5'}`}>
            {row.map(item => (
              <div
                key={item.id}
                className="w-full"
                style={{ maxWidth: isMultiRow ? multiRowTileMaxWidth : undefined }}
              >
                {item.content}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

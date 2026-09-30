import React from 'react';
import { Timer, Settings, Trophy, CheckCircle2, CloudSun, Activity, Home, Hourglass, X, List, CalendarDays, ShieldQuestion, Images } from 'lucide-react';
import { PomodoroMode, AppConfig } from '@/types';

type AppId = NonNullable<AppConfig['appOrder']>[number];

interface AppLauncherProps {
  onOpenPomo: () => void;
  onOpenCalendar: () => void;
  onOpenGallery: () => void;
  onOpenSettings: () => void;
  onOpenSports: () => void;
  onOpenWeather: () => void;
  onOpenFitbit: () => void;
  onOpenHome: () => void;
  onOpenTimer: () => void;
  onOpenTodo: () => void;
  onOpenRule: () => void;
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
  centered?: boolean;
}

export function AppLauncher({
  onOpenPomo,
  onOpenCalendar,
  onOpenGallery,
  onOpenSettings,
  onOpenSports,
  onOpenWeather,
  onOpenFitbit,
  onOpenHome,
  onOpenTimer,
  onOpenTodo,
  onOpenRule,
  onResetPomo,
  onResetTimer,
  pomoActive,
  pomoFinished,
  timerActive,
  timerFinished,
  isSportsLive,
  appConfig,
  centered = false
}: AppLauncherProps) {
  const order: AppId[] = appConfig.appOrder || ['calendar', 'gallery', 'pomodoro', 'sports', 'weather', 'fitbit', 'home', 'timer', 'todo', 'rule'];

  const apps: Record<AppId, React.ReactNode> = {
    calendar: (
      <button
        onPointerDown={onOpenCalendar}
        className="w-full aspect-square rounded-3xl bg-white/[0.06] hover:bg-white/10 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-white/15"
      >
        <CalendarDays size={40} className="text-white/80" />
        <span className="text-base font-bold text-white/85">Calendar</span>
      </button>
    ),
    gallery: (
      <button onPointerDown={onOpenGallery} className="w-full aspect-square rounded-3xl bg-white/[0.06] hover:bg-white/10 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-white/15">
        <Images size={40} className="text-white/80" />
        <span className="text-base font-bold text-white/85">Gallery</span>
      </button>
    ),
    pomodoro: (
      <div className="relative group">
        <button
          onPointerDown={onOpenPomo}
          className={`w-full aspect-square rounded-3xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border ${
            pomoActive || pomoFinished
              ? 'bg-white/10 border-white/20'
              : 'bg-white/[0.06] hover:bg-white/10 border-white/15'
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
          <span className={`text-base font-bold ${pomoActive || pomoFinished ? 'text-white' : 'text-white/85'}`}>
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
        className={`w-full aspect-square rounded-3xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border ${
          isSportsLive
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-white/[0.06] hover:bg-white/10 border-white/15'
        }`}
      >
        <div className="relative">
          <Trophy size={40} className={isSportsLive ? 'text-red-500 animate-pulse' : 'text-white/80'} />
          {isSportsLive && (
            <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-black" />
          )}
        </div>
        <span className={`text-base font-bold ${isSportsLive ? 'text-white' : 'text-white/85'}`}>
          {isSportsLive ? 'Live' : 'Sports'}
        </span>
      </button>
    ),
    weather: (
      <button
        onPointerDown={onOpenWeather}
        className="w-full aspect-square rounded-3xl bg-white/[0.06] hover:bg-white/10 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-white/15"
      >
        <CloudSun size={40} className="text-white/80" />
        <span className="text-base font-bold text-white/85">Weather</span>
      </button>
    ),
    fitbit: (
      <button
        onPointerDown={onOpenFitbit}
        className="w-full aspect-square rounded-3xl bg-white/[0.06] hover:bg-white/10 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-white/15"
      >
        <Activity size={40} className="text-white/80" />
        <span className="text-base font-bold text-white/85">Health</span>
      </button>
    ),
    home: (
      <button
        onPointerDown={onOpenHome}
        className="w-full aspect-square rounded-3xl bg-white/[0.06] hover:bg-white/10 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-white/15"
      >
        <Home size={40} className="text-white/80" />
        <span className="text-base font-bold text-white/85">Home</span>
      </button>
    ),
    timer: (
      <div className="relative group">
        <button
          onPointerDown={onOpenTimer}
          className={`w-full aspect-square rounded-3xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border ${
            timerActive || timerFinished
              ? 'bg-white/10 border-white/20'
              : 'bg-white/[0.06] hover:bg-white/10 border-white/15'
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
          <span className={`text-base font-bold ${timerActive || timerFinished ? 'text-white' : 'text-white/85'}`}>
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
        className="w-full aspect-square rounded-3xl bg-white/[0.06] hover:bg-white/10 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-white/15"
      >
        <List size={40} className="text-white/80" />
        <span className="text-base font-bold text-white/85">TODO</span>
      </button>
    ),
    rule: (
      <button
        onPointerDown={onOpenRule}
        className="w-full aspect-square rounded-3xl bg-white/[0.06] hover:bg-white/10 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-white/15"
      >
        <ShieldQuestion size={40} className="text-white/80" />
        <span className="text-base font-bold text-white/85">Rule</span>
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
          className="w-full aspect-square rounded-3xl bg-white/[0.06] hover:bg-white/10 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-white/15"
        >
          <Settings size={40} className="text-white/80" />
          <span className="text-base font-bold text-white/85">Settings</span>
        </button>
      )
    }
  ];
  const totalIcons = launcherItems.length;
  const isMultiRow = totalIcons > 5;
  const columnCount = isMultiRow ? Math.ceil(totalIcons / 2) : totalIcons;
  const multiRowTileMaxWidth = '8rem';
  const rows = isMultiRow
    ? [launcherItems.slice(0, columnCount), launcherItems.slice(columnCount)]
    : [launcherItems];

  return (
    <div
      className={`w-full px-4 transition-all duration-500 ease-out ${
        centered
          ? 'max-w-5xl'
          : `border-t border-white/15 ${isMultiRow ? 'max-w-5xl pt-5' : 'max-w-5xl pt-10'}`
      }`}
    >
      <div className={`flex flex-col w-full mx-auto ${isMultiRow ? 'gap-3' : 'gap-5'}`}>
        {rows.map((row, index) => (
          <div key={index} className={`flex justify-center ${isMultiRow ? 'gap-3' : 'gap-5'}`}>
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

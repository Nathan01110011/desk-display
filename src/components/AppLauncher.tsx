import React from 'react';
import { Timer, Settings, Trophy, CheckCircle2, CloudSun, Activity, Home, Hourglass } from 'lucide-react';
import { formatPomoTime } from '@/lib/format';
import { PomodoroMode, AppConfig } from '@/types';

interface AppLauncherProps {
  onOpenPomo: () => void;
  onOpenSettings: () => void;
  onOpenSports: () => void;
  onOpenWeather: () => void;
  onOpenFitbit: () => void;
  onOpenHome: () => void;
  onOpenTimer: () => void;
  pomoActive: boolean;
  pomoTime: number;
  pomoMode: PomodoroMode;
  isSportsLive: boolean;
  appConfig: AppConfig;
}

export function AppLauncher({ 
  onOpenPomo, 
  onOpenSettings, 
  onOpenSports, 
  onOpenWeather,
  onOpenFitbit,
  onOpenHome,
  onOpenTimer,
  pomoActive, 
  pomoTime,
  pomoMode,
  isSportsLive,
  appConfig
}: AppLauncherProps) {
  const isPomoFinished = pomoTime === 0 && !pomoActive;
  const order = appConfig.appOrder || ['pomodoro', 'sports', 'weather', 'fitbit', 'home', 'timer'];

  const apps = {
    pomodoro: (
      <button
        onPointerDown={onOpenPomo}
        className={`w-full aspect-square rounded-[2.5rem] flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border ${
          pomoActive || isPomoFinished
            ? 'bg-white/10 border-white/20' 
            : 'bg-white/5 border-white/5'
        }`}
      >
        <div className="relative">
          {isPomoFinished ? (
            <CheckCircle2 size={40} className="text-green-500 animate-bounce" />
          ) : (
            <>
              <Timer size={40} className={pomoActive ? 'text-white animate-pulse' : 'text-white/80'} />
              {pomoActive && (
                <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-black" />
              )}
            </>
          )}
        </div>
        <span className={`text-base font-bold ${pomoActive || isPomoFinished ? 'text-white' : 'text-white/40'}`}>
          {isPomoFinished 
            ? 'Done!'
            : pomoActive ? formatPomoTime(pomoTime) : 'Pomodoro'
          }
        </span>
      </button>
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
      <button
        onPointerDown={onOpenTimer}
        className="w-full aspect-square rounded-[2.5rem] bg-white/5 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-white/5"
      >
        <Hourglass size={40} className="text-white/80" />
        <span className="text-base font-bold text-white/40">Timer</span>
      </button>
    )
  };

  const activeApps = order.filter(appId => appConfig[appId as keyof AppConfig]);
  const totalIcons = activeApps.length + 1; // +1 for Settings

  return (
    <div className="w-full max-w-5xl border-t border-white/5 pt-10 px-4">
      <div 
        className="grid gap-4 w-full" 
        style={{ gridTemplateColumns: `repeat(${totalIcons}, minmax(0, 1fr))` }}
      >
        {activeApps.map(appId => (
          <div key={appId}>{(apps as any)[appId]}</div>
        ))}

        {/* Settings (Always Visible) */}
        <button
          onPointerDown={onOpenSettings}
          className="w-full aspect-square rounded-[2.5rem] bg-white/5 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-white/5"
        >
          <Settings size={40} className="text-white/80" />
          <span className="text-base font-bold text-white/40">Settings</span>
        </button>
      </div>
    </div>
  );
}

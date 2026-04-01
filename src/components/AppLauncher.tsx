import React from 'react';
import { Timer, Settings, Trophy, CheckCircle2, CloudSun, Activity, Home, Hourglass, X } from 'lucide-react';
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
  onOpenSettings, 
  onOpenSports, 
  onOpenWeather,
  onOpenFitbit,
  onOpenHome,
  onOpenTimer,
  onResetPomo,
  onResetTimer,
  pomoActive, 
  pomoTime,
  pomoFinished,
  pomoMode,
  timerActive,
  timerTime,
  timerFinished,
  isSportsLive,
  appConfig
}: AppLauncherProps) {
  const order = appConfig.appOrder || ['pomodoro', 'sports', 'weather', 'fitbit', 'home', 'timer'];

  const apps = {
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

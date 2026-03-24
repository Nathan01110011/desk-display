import React from 'react';
import { Timer, Settings, Trophy, CheckCircle2, CloudSun, Activity } from 'lucide-react';
import { formatPomoTime } from '@/lib/format';
import { PomodoroMode, AppConfig } from '@/types';

interface AppLauncherProps {
  onOpenPomo: () => void;
  onOpenSettings: () => void;
  onOpenSports: () => void;
  onOpenWeather: () => void;
  onOpenFitbit: () => void;
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
  pomoActive, 
  pomoTime,
  pomoMode,
  isSportsLive,
  appConfig
}: AppLauncherProps) {
  const isPomoFinished = pomoTime === 0 && !pomoActive;
  const order = appConfig.appOrder || ['pomodoro', 'sports', 'weather', 'fitbit'];

  const apps = {
    pomodoro: (
      <button
        key="pomo"
        onPointerDown={onOpenPomo}
        className={`aspect-square rounded-3xl flex flex-col items-center justify-center gap-3 active:scale-95 transition-all border ${
          pomoActive || isPomoFinished
            ? 'bg-white/10 border-white/20' 
            : 'bg-white/5 border-white/5 hover:bg-white/10'
        }`}
      >
        <div className="relative">
          {isPomoFinished ? (
            <CheckCircle2 size={48} className="text-green-500 animate-bounce" />
          ) : (
            <>
              <Timer size={48} className={pomoActive ? 'text-white animate-pulse' : 'text-white/80'} />
              {pomoActive && (
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-black" />
              )}
            </>
          )}
        </div>
        <span className={`text-lg font-bold ${pomoActive || isPomoFinished ? 'text-white' : 'text-white/40'}`}>
          {isPomoFinished 
            ? (pomoMode === 'work' ? 'Work Done!' : 'Break Done!')
            : pomoActive ? formatPomoTime(pomoTime) : 'Pomodoro'
          }
        </span>
      </button>
    ),
    sports: (
      <button
        key="sports"
        onPointerDown={onOpenSports}
        className={`aspect-square rounded-3xl flex flex-col items-center justify-center gap-3 active:scale-95 transition-all border ${
          isSportsLive 
            ? 'bg-red-500/10 border-red-500/20' 
            : 'bg-white/5 border-white/5 hover:bg-white/10'
        }`}
      >
        <div className="relative">
          <Trophy size={48} className={isSportsLive ? 'text-red-500 animate-pulse' : 'text-white/80'} />
          {isSportsLive && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-black" />
          )}
        </div>
        <span className={`text-lg font-bold ${isSportsLive ? 'text-white' : 'text-white/40'}`}>
          {isSportsLive ? 'Live Score' : 'Sports'}
        </span>
      </button>
    ),
    weather: (
      <button
        key="weather"
        onPointerDown={onOpenWeather}
        className="aspect-square rounded-3xl bg-white/5 flex flex-col items-center justify-center gap-3 hover:bg-white/10 active:scale-95 transition-all border border-white/5"
      >
        <CloudSun size={48} className="text-white/80" />
        <span className="text-lg font-bold text-white/40">Weather</span>
      </button>
    ),
    fitbit: (
      <button
        key="fitbit"
        onPointerDown={onOpenFitbit}
        className="aspect-square rounded-3xl bg-white/5 flex flex-col items-center justify-center gap-3 hover:bg-white/10 active:scale-95 transition-all border border-white/5"
      >
        <Activity size={48} className="text-white/80" />
        <span className="text-lg font-bold text-white/40">Fitbit</span>
      </button>
    )
  };

  const activeAppCount = order.filter(appId => appConfig[appId as keyof AppConfig]).length + 1; // +1 for Settings

  return (
    <div className="w-full max-w-4xl border-t border-white/5 pt-12">
      <div 
        className="grid gap-6 mx-auto" 
        style={{ 
          gridTemplateColumns: `repeat(${activeAppCount}, minmax(0, 1fr))`,
          maxWidth: activeAppCount * 180 // Keep buttons from getting too wide
        }}
      >
        {order.map(appId => appConfig[appId as keyof AppConfig] ? (apps as any)[appId] : null)}

        {/* Settings (Always Visible) */}
        <button
          onPointerDown={onOpenSettings}
          className="aspect-square rounded-3xl bg-white/5 flex flex-col items-center justify-center gap-3 hover:bg-white/10 active:scale-95 transition-all border border-white/5"
        >
          <Settings size={48} className="text-white/80" />
          <span className="text-lg font-bold text-white/40">Settings</span>
        </button>
      </div>
    </div>
  );
}

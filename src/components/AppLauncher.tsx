import React from 'react';
import { Timer, Settings, Trophy } from 'lucide-react';
import { formatPomoTime } from '@/lib/format';

interface AppLauncherProps {
  onOpenPomo: () => void;
  onOpenSettings: () => void;
  onOpenSports: () => void;
  pomoActive: boolean;
  pomoTime: number;
  isSportsLive: boolean;
}

export function AppLauncher({ 
  onOpenPomo, 
  onOpenSettings, 
  onOpenSports, 
  pomoActive, 
  pomoTime,
  isSportsLive
}: AppLauncherProps) {
  return (
    <div className="w-full max-w-4xl border-t border-white/5 pt-12">
      <div className="grid grid-cols-4 gap-6">
        <button
          onPointerDown={onOpenPomo}
          className={`aspect-square rounded-3xl flex flex-col items-center justify-center gap-3 active:scale-95 transition-all border ${
            pomoActive 
              ? 'bg-white/10 border-white/20' 
              : 'bg-white/5 border-white/5 hover:bg-white/10'
          }`}
        >
          <div className="relative">
            <Timer size={48} className={pomoActive ? 'text-white animate-pulse' : 'text-white/80'} />
            {pomoActive && (
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-black" />
            )}
          </div>
          <span className={`text-lg font-bold ${pomoActive ? 'text-white' : 'text-white/40'}`}>
            {pomoActive ? formatPomoTime(pomoTime) : 'Pomodoro'}
          </span>
        </button>

        <button
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

        <button
          onPointerDown={onOpenSettings}
          className="aspect-square rounded-3xl bg-white/5 flex flex-col items-center justify-center gap-3 hover:bg-white/10 active:scale-95 transition-all border border-white/5"
        >
          <Settings size={48} className="text-white/80" />
          <span className="text-lg font-bold text-white/40">Settings</span>
        </button>
        
        {/* Placeholder for future apps */}
        <div className="aspect-square rounded-3xl bg-white/[0.02] flex items-center justify-center border border-dashed border-white/5 opacity-30">
          <span className="text-sm font-bold text-white/20 uppercase tracking-widest">Next App</span>
        </div>
      </div>
    </div>
  );
}

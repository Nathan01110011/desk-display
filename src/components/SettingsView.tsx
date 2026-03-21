import React from 'react';
import { motion } from 'framer-motion';
import { Settings, X, Minus, Plus, Check } from 'lucide-react';
import { AppConfig } from '@/types';

interface SettingsViewProps {
  workDuration: number;
  breakDuration: number;
  onUpdateDurations: (work: number, breakTime: number) => void;
  onClose: () => void;
  appConfig: AppConfig;
  onUpdateAppConfig: (config: AppConfig) => void;
}

export function SettingsView({ 
  workDuration, 
  breakDuration, 
  onUpdateDurations, 
  onClose,
  appConfig,
  onUpdateAppConfig
}: SettingsViewProps) {
  
  const handleExitApp = async () => {
    try {
      await fetch('/api/system/exit', { method: 'POST' });
    } catch (e) {
      console.error('Failed to exit app:', e);
    }
  };

  const toggleApp = (app: keyof AppConfig) => {
    onUpdateAppConfig({
      ...appConfig,
      [app]: !appConfig[app]
    });
  };

  return (
    <motion.div
      key="settings-view"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full max-w-5xl mx-auto flex flex-col space-y-10 py-4"
    >
      <div className="flex items-center gap-4 text-white/30 font-bold uppercase tracking-[0.3em] text-sm">
        <Settings size={20} /> Settings
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Left Column: Pomodoro & System */}
        <div className="space-y-8">
          <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-6">
            <h3 className="text-xl font-bold text-white/80">Pomodoro Timer</h3>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <p className="text-white/40 uppercase tracking-widest text-xs font-bold">Work</p>
                <div className="flex items-center gap-4">
                  <button onPointerDown={() => onUpdateDurations(Math.max(1, workDuration - 1), breakDuration)} className="p-2 rounded-xl bg-white/5 active:scale-90"><Minus size={24} /></button>
                  <span className="text-4xl font-black">{workDuration}</span>
                  <button onPointerDown={() => onUpdateDurations(workDuration + 1, breakDuration)} className="p-2 rounded-xl bg-white/5 active:scale-90"><Plus size={24} /></button>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-white/40 uppercase tracking-widest text-xs font-bold">Break</p>
                <div className="flex items-center gap-4">
                  <button onPointerDown={() => onUpdateDurations(workDuration, Math.max(1, breakDuration - 1))} className="p-2 rounded-xl bg-white/5 active:scale-90"><Minus size={24} /></button>
                  <span className="text-4xl font-black">{breakDuration}</span>
                  <button onPointerDown={() => onUpdateDurations(workDuration, breakDuration + 1)} className="p-2 rounded-xl bg-white/5 active:scale-90"><Plus size={24} /></button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 p-8 rounded-3xl border border-white/5 flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white/80">System</h3>
              <p className="text-white/30 text-sm">Return to Pi Desktop</p>
            </div>
            <button onPointerDown={handleExitApp} className="px-6 py-4 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 font-bold active:scale-95">Exit Kiosk</button>
          </div>
        </div>

        {/* Right Column: App Toggles */}
        <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-6">
          <h3 className="text-xl font-bold text-white/80">Dashboard Apps</h3>
          <div className="space-y-4">
            {(['pomodoro', 'sports', 'weather'] as const).map((app) => (
              <button
                key={app}
                onPointerDown={() => toggleApp(app)}
                className="w-full flex items-center justify-between p-5 rounded-2xl bg-white/[0.03] border border-white/5 active:scale-[0.98] transition-all"
              >
                <span className="text-xl font-bold capitalize text-white/70">{app}</span>
                {appConfig[app] ? (
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black">
                    <Check size={20} strokeWidth={4} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg border-2 border-white/20" />
                )}
              </button>
            ))}
          </div>
          
          <div className="pt-4 border-t border-white/5 space-y-3">
            <p className="text-white/40 uppercase tracking-widest text-xs font-bold">Weather Location</p>
            <input 
              type="text" 
              placeholder="Auto-locate (IP)" 
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/10 focus:outline-none focus:border-white/30"
              defaultValue={localStorage.getItem('weatherLocation') || ''}
              onChange={(e) => localStorage.setItem('weatherLocation', e.target.value)}
            />
          </div>
        </div>
      </div>

      <button
        onPointerDown={onClose}
        className="absolute top-0 right-0 p-6 text-white/20 hover:text-white/60 active:scale-90 transition-all"
      >
        <X size={48} />
      </button>
    </motion.div>
  );
}

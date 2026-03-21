import React from 'react';
import { motion } from 'framer-motion';
import { Settings, X, LogOut, Minus, Plus } from 'lucide-react';

interface SettingsViewProps {
  workDuration: number;
  breakDuration: number;
  onUpdateDurations: (work: number, breakTime: number) => void;
  onClose: () => void;
}

export function SettingsView({ 
  workDuration, 
  breakDuration, 
  onUpdateDurations, 
  onClose 
}: SettingsViewProps) {
  
  const handleExitApp = async () => {
    try {
      await fetch('/api/system/exit', { method: 'POST' });
    } catch (e) {
      console.error('Failed to exit app:', e);
    }
  };

  return (
    <motion.div
      key="settings-view"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full max-w-4xl mx-auto flex flex-col space-y-12"
    >
      <div className="flex items-center gap-4 text-white/30 font-bold uppercase tracking-[0.3em] text-sm">
        <Settings size={20} /> Settings
      </div>

      <div className="grid grid-cols-2 gap-12">
        {/* Pomodoro Settings */}
        <div className="space-y-8 bg-white/5 p-10 rounded-3xl border border-white/5">
          <h3 className="text-2xl font-bold text-white/80">Pomodoro Timer</h3>
          
          <div className="space-y-10">
            {/* Work Duration */}
            <div className="space-y-4">
              <p className="text-white/40 uppercase tracking-widest text-sm font-bold">Work (Minutes)</p>
              <div className="flex items-center gap-6">
                <button 
                  onPointerDown={() => onUpdateDurations(Math.max(1, workDuration - 1), breakDuration)}
                  className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-90 transition-all"
                >
                  <Minus size={32} />
                </button>
                <span className="text-6xl font-black min-w-[3ch] text-center">{workDuration}</span>
                <button 
                  onPointerDown={() => onUpdateDurations(workDuration + 1, breakDuration)}
                  className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-90 transition-all"
                >
                  <Plus size={32} />
                </button>
              </div>
            </div>

            {/* Break Duration */}
            <div className="space-y-4">
              <p className="text-white/40 uppercase tracking-widest text-sm font-bold">Break (Minutes)</p>
              <div className="flex items-center gap-6">
                <button 
                  onPointerDown={() => onUpdateDurations(workDuration, Math.max(1, breakDuration - 1))}
                  className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-90 transition-all"
                >
                  <Minus size={32} />
                </button>
                <span className="text-6xl font-black min-w-[3ch] text-center">{breakDuration}</span>
                <button 
                  onPointerDown={() => onUpdateDurations(workDuration, breakDuration + 1)}
                  className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-90 transition-all"
                >
                  <Plus size={32} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="space-y-8 bg-white/5 p-10 rounded-3xl border border-white/5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-white/80">System</h3>
            <p className="text-white/40 text-lg leading-relaxed">
              Close the dashboard to access the operating system, Wi-Fi settings, or perform maintenance.
            </p>
          </div>

          <button
            onPointerDown={handleExitApp}
            className="w-full py-8 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 flex items-center justify-center gap-4 text-2xl font-bold active:scale-95 transition-all"
          >
            <LogOut size={32} /> Exit Dashboard
          </button>
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

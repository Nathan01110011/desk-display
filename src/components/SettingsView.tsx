import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, X, Minus, Plus, Check, Keyboard, Globe, Trash2 } from 'lucide-react';
import { AppConfig, AdditionalClock } from '@/types';
import { OnScreenKeyboard } from './OnScreenKeyboard';

interface SettingsViewProps {
  workDuration: number;
  breakDuration: number;
  onUpdateDurations: (work: number, breakTime: number) => void;
  onClose: () => void;
  appConfig: AppConfig;
  onUpdateAppConfig: (config: AppConfig) => void;
  worldClocks: AdditionalClock[];
  onUpdateClocks: (clocks: AdditionalClock[]) => void;
}

export function SettingsView({ 
  workDuration, 
  breakDuration, 
  onUpdateDurations, 
  onClose,
  appConfig,
  onUpdateAppConfig,
  worldClocks,
  onUpdateClocks
}: SettingsViewProps) {
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [kbMode, setKbMode] = useState<'weather' | 'clock'>('weather');
  const [kbValue, setKbValue] = useState('');

  React.useEffect(() => {
    if (!showKeyboard && kbMode === 'weather') {
      setKbValue(localStorage.getItem('weatherLocation') || '');
    }
  }, [showKeyboard, kbMode]);
  
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

  const handleAddClock = async (city: string) => {
    try {
      const res = await fetch(`/api/system/resolve-city?city=${encodeURIComponent(city)}`);
      if (res.ok) {
        const data = await res.json();
        const newClock: AdditionalClock = {
          id: Math.random().toString(36).substr(2, 9),
          label: data.city,
          city: data.city,
          offset: data.offset
        };
        onUpdateClocks([...worldClocks, newClock].slice(0, 5));
      }
    } catch (e) {
      console.error("Failed to add clock", e);
    }
  };

  const handleRemoveClock = (id: string) => {
    onUpdateClocks(worldClocks.filter(c => c.id !== id));
  };

  return (
    <motion.div
      key="settings-view"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full max-w-6xl mx-auto flex flex-col space-y-8 py-4 h-[650px] overflow-y-auto pr-4 scrollbar-hide"
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

          {/* World Clocks */}
          <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white/80 flex items-center gap-3"><Globe size={24} /> World Clocks</h3>
              <span className="text-xs font-bold text-white/20 uppercase">{worldClocks.length}/5</span>
            </div>
            
            <div className="space-y-3">
              {worldClocks.map(clock => (
                <div key={clock.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-lg font-bold text-white/60">{clock.label}</span>
                  <button onPointerDown={() => handleRemoveClock(clock.id)} className="text-red-500/40 hover:text-red-500 active:scale-90 p-2"><Trash2 size={20} /></button>
                </div>
              ))}
              {worldClocks.length < 5 && (
                <button 
                  onPointerDown={() => {
                    setKbMode('clock');
                    setKbValue('');
                    setShowKeyboard(true);
                  }}
                  className="w-full py-4 rounded-2xl border border-dashed border-white/10 text-white/30 font-bold hover:bg-white/5 active:scale-[0.98] transition-all"
                >
                  + Add Clock
                </button>
              )}
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
            <div className="flex gap-3">
              <div 
                onPointerDown={() => {
                  setKbMode('weather');
                  setKbValue(localStorage.getItem('weatherLocation') || '');
                  setShowKeyboard(true);
                }}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 text-white text-xl min-h-[3.5rem] flex items-center overflow-hidden truncate"
              >
                {localStorage.getItem('weatherLocation') || <span className="opacity-20 italic text-lg">Auto-locate (IP)</span>}
              </div>
              <button 
                onPointerDown={() => {
                  setKbMode('weather');
                  setKbValue(localStorage.getItem('weatherLocation') || '');
                  setShowKeyboard(true);
                }}
                className="p-4 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/20 active:scale-90 transition-all"
              >
                <Keyboard size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showKeyboard && (
        <OnScreenKeyboard 
          value={kbValue}
          onChange={setKbValue}
          onClose={() => setShowKeyboard(false)}
          onSubmit={() => {
            if (kbMode === 'weather') {
              localStorage.setItem('weatherLocation', kbValue);
              setShowKeyboard(false);
              window.location.reload();
            } else {
              handleAddClock(kbValue);
              setShowKeyboard(false);
            }
          }}
        />
      )}

      <button
        onPointerDown={onClose}
        className="absolute top-0 right-0 p-6 text-white/20 hover:text-white/60 active:scale-90 transition-all"
      >
        <X size={48} />
      </button>
    </motion.div>
  );
}

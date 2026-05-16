import React, { useState } from 'react';
import { motion, Reorder } from 'framer-motion';
import { Settings, Minus, Plus, Check, Keyboard, Globe, Trash2, GripVertical } from 'lucide-react';
import { AppConfig, AdditionalClock, RuleLockSettings } from '@/types';
import { OnScreenKeyboard } from './OnScreenKeyboard';

interface SettingsViewProps {
  onClose: () => void;
  appConfig: AppConfig;
  onUpdateAppConfig: (config: AppConfig) => void;
  worldClocks: AdditionalClock[];
  onUpdateClocks: (clocks: AdditionalClock[]) => void;
  ruleLock: RuleLockSettings;
  onUpdateRuleLock: (settings: RuleLockSettings) => void;
}

export function SettingsView({ 
  appConfig,
  onUpdateAppConfig,
  worldClocks,
  onUpdateClocks,
  ruleLock,
  onUpdateRuleLock
}: SettingsViewProps) {
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [kbMode, setKbMode] = useState<'weather' | 'clock'>('weather');
  const [kbValue, setKbValue] = useState('');
  const [currentUnit, setCurrentUnit] = useState(localStorage.getItem('weatherUnit') || 'C');

  const allAvailableApps = ['calendar', 'pomodoro', 'sports', 'weather', 'fitbit', 'home', 'timer', 'todo', 'rule'] as const;
  type AvailableApp = typeof allAvailableApps[number];
  const savedOrder = appConfig.appOrder || allAvailableApps;
  const appOrder = [...new Set([...savedOrder, ...allAvailableApps])].filter((app): app is AvailableApp => allAvailableApps.includes(app as AvailableApp));

  React.useEffect(() => {
    if (!showKeyboard && kbMode === 'weather') {
      queueMicrotask(() => {
        setKbValue(localStorage.getItem('weatherLocation') || '');
      });
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
    if (app === 'appOrder') return;
    onUpdateAppConfig({
      ...appConfig,
      [app]: !appConfig[app]
    });
  };

  const handleUnitToggle = async (unit: 'C' | 'F') => {
    setCurrentUnit(unit);
    localStorage.setItem('weatherUnit', unit);
    await fetch('/api/system/settings', { method: 'POST', body: JSON.stringify({ weatherUnit: unit }) });
    // Note: No reload here, the next weather fetch will naturally pick up the new unit
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
        const updatedClocks = [...worldClocks, newClock].slice(0, 5);
        onUpdateClocks(updatedClocks);
        await fetch('/api/system/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ worldClocks: updatedClocks })
        });
      }
    } catch (e) {
      console.error("Failed to add clock", e);
    }
  };

  const handleRemoveClock = async (id: string) => {
    const updatedClocks = worldClocks.filter(c => c.id !== id);
    onUpdateClocks(updatedClocks);
    await fetch('/api/system/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worldClocks: updatedClocks })
    });
  };

  const updateRuleLock = async (settings: RuleLockSettings) => {
    onUpdateRuleLock(settings);
    await fetch('/api/system/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ruleLockOnOpen: settings.lockOnOpen,
        ruleLockOnInactivity: settings.lockOnInactivity,
        ruleLockTimeoutMinutes: settings.timeoutMinutes
      })
    });
  };

  const updateRuleLockTime = (hours: number, minutes: number) => {
    const timeoutMinutes = Math.max(1, Math.min(24 * 60, (hours * 60) + minutes));
    updateRuleLock({ ...ruleLock, timeoutMinutes });
  };

  const ruleLockHours = Math.floor(ruleLock.timeoutMinutes / 60);
  const ruleLockMinutes = ruleLock.timeoutMinutes % 60;

  return (
    <motion.div
      key="settings-view"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className="w-full max-w-6xl mx-auto flex flex-col space-y-6 py-8 h-full overflow-y-auto pr-4 scrollbar-hide"
    >
      <div className="flex items-center gap-3 text-white/30 font-bold uppercase tracking-[0.3em] text-xs">
        <Settings size={18} /> Settings
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white/80 flex items-center gap-3"><Globe size={20} /> World Clocks</h3>
              <span className="text-xs font-bold text-white/20 uppercase">{worldClocks.length}/5</span>
            </div>
            
            <Reorder.Group 
              axis="y" 
              values={worldClocks} 
              onReorder={(newClocks) => {
                onUpdateClocks(newClocks);
                fetch('/api/system/settings', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ worldClocks: newClocks })
                });
              }}
              className="space-y-3"
            >
              {worldClocks.map(clock => (
                <Reorder.Item key={clock.id} value={clock} className="flex items-center gap-3 group">
                  <div className="cursor-grab active:cursor-grabbing p-2 text-white/10 group-active:text-blue-400 transition-colors">
                    <GripVertical size={20} />
                  </div>
                  <div className="flex-1 flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-lg font-bold text-white/60">{clock.label}</span>
                    <button onPointerDown={() => handleRemoveClock(clock.id)} className="text-red-500/40 hover:text-red-500 active:scale-90 p-2 transition-all"><Trash2 size={20} /></button>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>

            {worldClocks.length < 5 && (
              <button 
                onPointerDown={() => { setKbMode('clock'); setKbValue(''); setShowKeyboard(true); }}
                className="w-full py-3 rounded-xl border border-dashed border-white/10 text-white/30 font-bold hover:bg-white/5 active:scale-[0.98] transition-all"
              >
                + Add Clock
              </button>
            )}
          </div>

          <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white/80">System</h3>
              <p className="text-white/30 text-xs">Return to Pi Desktop</p>
            </div>
            <button onPointerDown={handleExitApp} className="px-5 py-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 font-bold text-sm active:scale-95 transition-all">Exit Kiosk</button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white/80">Rule Lock</h3>
                <p className="text-white/30 text-xs">Page load and idle timeout</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onPointerDown={() => updateRuleLock({ ...ruleLock, lockOnOpen: !ruleLock.lockOnOpen })}
                  className="flex items-center justify-between rounded-2xl bg-white/[0.03] border border-white/5 p-4 active:scale-[0.98] transition-all"
                >
                  <span className="text-sm font-black uppercase tracking-widest text-white/50">On Open</span>
                  <span className={`size-8 rounded-xl border flex items-center justify-center ${
                    ruleLock.lockOnOpen ? 'bg-white text-black border-white' : 'border-white/20'
                  }`}>
                    {ruleLock.lockOnOpen && <Check size={18} strokeWidth={4} />}
                  </span>
                </button>

                <button
                  onPointerDown={() => updateRuleLock({ ...ruleLock, lockOnInactivity: !ruleLock.lockOnInactivity })}
                  className="flex items-center justify-between rounded-2xl bg-white/[0.03] border border-white/5 p-4 active:scale-[0.98] transition-all"
                >
                  <span className="text-sm font-black uppercase tracking-widest text-white/50">Idle Lock</span>
                  <span className={`size-8 rounded-xl border flex items-center justify-center ${
                    ruleLock.lockOnInactivity ? 'bg-white text-black border-white' : 'border-white/20'
                  }`}>
                    {ruleLock.lockOnInactivity && <Check size={18} strokeWidth={4} />}
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-3 bg-white/[0.03] p-4 rounded-2xl border border-white/5">
              <p className="text-white/40 uppercase tracking-widest text-[10px] font-black">Timeout</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-2xl bg-black/20 p-3 border border-white/5">
                  <button
                    onPointerDown={() => updateRuleLockTime(Math.max(0, ruleLockHours - 1), ruleLockMinutes)}
                    className="p-2 rounded-xl bg-white/5 active:scale-90 transition-all"
                    aria-label="Decrease hours"
                  >
                    <Minus size={20} />
                  </button>
                  <div className="text-center">
                    <div className="text-3xl font-black tabular-nums">{ruleLockHours}</div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Hours</div>
                  </div>
                  <button
                    onPointerDown={() => updateRuleLockTime(Math.min(24, ruleLockHours + 1), ruleLockMinutes)}
                    className="p-2 rounded-xl bg-white/5 active:scale-90 transition-all"
                    aria-label="Increase hours"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-black/20 p-3 border border-white/5">
                  <button
                    onPointerDown={() => updateRuleLockTime(ruleLockHours, Math.max(0, ruleLockMinutes - 5))}
                    className="p-2 rounded-xl bg-white/5 active:scale-90 transition-all"
                    aria-label="Decrease minutes"
                  >
                    <Minus size={20} />
                  </button>
                  <div className="text-center">
                    <div className="text-3xl font-black tabular-nums">{ruleLockMinutes}</div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Minutes</div>
                  </div>
                  <button
                    onPointerDown={() => updateRuleLockTime(ruleLockHours, Math.min(55, ruleLockMinutes + 5))}
                    className="p-2 rounded-xl bg-white/5 active:scale-90 transition-all"
                    aria-label="Increase minutes"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
            <h3 className="text-lg font-bold text-white/80">Dashboard Apps</h3>
            
            <Reorder.Group 
              axis="y" 
              values={appOrder} 
              onReorder={(newOrder) => onUpdateAppConfig({ ...appConfig, appOrder: newOrder })}
              className="space-y-3"
            >
              {appOrder.map((app) => (
                <Reorder.Item key={app} value={app} className="flex items-center gap-3 group">
                  <div className="cursor-grab active:cursor-grabbing p-3 text-white/10 group-active:text-blue-400 transition-colors">
                    <GripVertical size={24} />
                  </div>
                  <button
                    onPointerDown={() => toggleApp(app)}
                    className="flex-1 flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 active:scale-[0.98] transition-all"
                  >
                    <span className="text-lg font-bold capitalize text-white/70">{app === 'home' ? 'Smart Home' : app === 'todo' ? 'TODO' : app}</span>
                    {appConfig[app as keyof AppConfig] ? (
                      <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-black">
                        <Check size={18} strokeWidth={4} />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg border-2 border-white/20" />
                    )}
                  </button>
                </Reorder.Item>
              ))}
            </Reorder.Group>
            
            {appConfig.weather && (
              <div className="pt-4 border-t border-white/5 space-y-4">
                <div className="space-y-2">
                  <p className="text-white/40 uppercase tracking-widest text-[10px] font-black">Weather Location</p>
                  <div className="flex gap-2">
                    <div 
                      onPointerDown={() => { setKbMode('weather'); setKbValue(localStorage.getItem('weatherLocation') || ''); setShowKeyboard(true); }}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white text-lg min-h-[3rem] flex items-center overflow-hidden truncate"
                    >
                      {localStorage.getItem('weatherLocation') || <span className="opacity-20 italic text-base">Auto-locate</span>}
                    </div>
                    <button 
                      onPointerDown={() => { setKbMode('weather'); setKbValue(localStorage.getItem('weatherLocation') || ''); setShowKeyboard(true); }}
                      className="p-3 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/20 active:scale-90 transition-all"
                    >
                      <Keyboard size={20} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-white/40 uppercase tracking-widest text-[10px] font-black">Temperature Unit</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onPointerDown={() => handleUnitToggle('C')}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 font-bold text-sm ${currentUnit === 'C' ? 'bg-white text-black border-white shadow-lg' : 'bg-white/5 border-white/10 text-white/40 active:scale-95'}`}
                    >
                      Celsius (°C)
                    </button>
                    <button 
                      onPointerDown={() => handleUnitToggle('F')}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 font-bold text-sm ${currentUnit === 'F' ? 'bg-white text-black border-white shadow-lg' : 'bg-white/5 border-white/10 text-white/40 active:scale-95'}`}
                    >
                      Fahrenheit (°F)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showKeyboard && (
        <OnScreenKeyboard 
          value={kbValue}
          onChange={setKbValue}
          onClose={() => setShowKeyboard(false)}
          onSubmit={async () => {
            if (kbMode === 'weather') {
              localStorage.setItem('weatherLocation', kbValue);
              await fetch('/api/system/settings', { method: 'POST', body: JSON.stringify({ weatherLocation: kbValue }) });
              setShowKeyboard(false);
              window.location.reload();
            } else {
              handleAddClock(kbValue);
              setShowKeyboard(false);
            }
          }}
        />
      )}
    </motion.div>
  );
}

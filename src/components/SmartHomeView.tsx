import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Lightbulb, Zap, Loader2, ChevronLeft, Sun, Thermometer, Palette, Flame, Snowflake } from 'lucide-react';
import { SmartDevice } from '@/types';

interface SmartHomeViewProps {
  devices: SmartDevice[];
  loading: boolean;
  onUpdate: (id: string, params: Partial<SmartDevice>) => void;
  onClose: () => void;
}

export function SmartHomeView({ devices, loading, onUpdate, onClose }: SmartHomeViewProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const selectedDevice = devices.find(d => d.id === selectedDeviceId);

  const handleToggle = (device: SmartDevice) => {
    onUpdate(device.id, { isOn: !device.isOn });
  };

  const PRESET_COLORS = [
    { name: 'Red', r: 255, g: 0, b: 0 },
    { name: 'Green', r: 0, g: 255, b: 0 },
    { name: 'Blue', r: 0, g: 0, b: 255 },
    { name: 'Purple', r: 168, g: 85, b: 247 },
    { name: 'Orange', r: 249, g: 115, b: 22 },
    { name: 'Cyan', r: 6, g: 182, b: 212 },
    { name: 'Pink', r: 236, g: 72, b: 153 },
    { name: 'Gold', r: 234, g: 179, b: 8 },
    { name: 'Mint', r: 52, g: 211, b: 153 },
  ];

  if (loading && devices.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 opacity-20">
        <Home size={80} className="animate-pulse" />
        <p className="text-xl font-bold uppercase tracking-widest">Scanning Network...</p>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 opacity-20">
        <Home size={80} />
        <p className="text-xl font-bold uppercase tracking-widest text-white/40">Smart Home Ready</p>
        <p className="text-sm">Connect a supported bulb or plug to begin.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center py-8 relative">
      <style jsx global>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 40px;
          height: 40px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          border: 4px solid rgba(0,0,0,0.2);
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
        input[type='range']::-moz-range-thumb {
          width: 40px;
          height: 40px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          border: 4px solid rgba(0,0,0,0.2);
        }
      `}</style>

      <AnimatePresence mode="wait">
        {!selectedDeviceId ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full flex flex-col items-center gap-8"
          >
            <div className="flex items-center gap-4 text-white/30 font-bold uppercase tracking-[0.3em] text-sm mb-4">
              <Home size={20} /> Smart Home
            </div>

            <div className="grid grid-cols-3 gap-8 w-full px-8">
              {devices.map((device) => (
                <button
                  key={device.id}
                  onPointerDown={() => setSelectedDeviceId(device.id)}
                  className={`
                    relative flex flex-col items-center justify-center gap-6 p-10 rounded-[3rem] border transition-all active:scale-95 aspect-square overflow-hidden
                    ${device.isOn 
                      ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' 
                      : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}
                  `}
                >
                  {device.isOn && (
                    <div className="absolute inset-0 bg-yellow-500/10 blur-3xl rounded-full scale-150" />
                  )}
                  <div className="relative z-10">
                    {device.loading ? (
                      <Loader2 size={64} className="animate-spin" />
                    ) : (
                      <Lightbulb size={64} className={device.isOn ? 'fill-yellow-400/20 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]' : ''} />
                    )}
                  </div>
                  <div className="relative z-10 flex flex-col items-center gap-1 text-center">
                    <span className="text-2xl font-bold tracking-tight">{device.name}</span>
                    <span className={`text-sm font-black uppercase tracking-widest ${
                      device.isOffline ? 'text-red-500/50' : (device.isOn ? `${device.brightness || 100}%` : 'OFF')}
                    `}>
                      {device.isOffline ? 'OFFLINE' : (device.isOn ? `${device.brightness || 100}%` : 'OFF')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="w-full h-full max-w-6xl flex flex-col gap-12 px-4"
          >
            <div className="flex items-center justify-between">
              <button 
                onPointerDown={() => setSelectedDeviceId(null)}
                className="p-4 rounded-2xl bg-white/5 text-white/60 flex items-center gap-3 font-bold active:scale-90 transition-all"
              >
                <ChevronLeft size={24} /> Back
              </button>
              <div className="flex items-center gap-4">
                <span className="text-3xl font-black">{selectedDevice?.name}</span>
                <div className={`w-3 h-3 rounded-full ${selectedDevice?.isOn ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'bg-white/10'}`} />
              </div>
              <button 
                onPointerDown={() => selectedDevice && handleToggle(selectedDevice)}
                className={`px-8 py-4 rounded-2xl font-bold transition-all active:scale-95 ${
                  selectedDevice?.isOn ? 'bg-white text-black' : 'bg-white/10 text-white/40 border border-white/10'
                }`}
              >
                {selectedDevice?.isOn ? 'Turn OFF' : 'Turn ON'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-12 flex-1">
              {/* Sliders and Quick Scenes */}
              <div className="space-y-8 bg-white/5 p-10 rounded-[3rem] border border-white/5 flex flex-col justify-center">
                <div className="space-y-6">
                  <div className="flex items-center justify-between text-white/40 uppercase font-black tracking-widest text-xs">
                    <div className="flex items-center gap-3"><Sun size={20} /> Brightness</div>
                    <span className="text-lg text-white/60">{selectedDevice?.brightness || 100}%</span>
                  </div>
                  <input 
                    type="range" min="10" max="100" 
                    value={selectedDevice?.brightness || 100}
                    onChange={(e) => onUpdate(selectedDeviceId!, { brightness: parseInt(e.target.value) })}
                    className="w-full h-12 bg-white/10 rounded-2xl appearance-none cursor-pointer accent-white"
                  />
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between text-white/40 uppercase font-black tracking-widest text-xs">
                    <div className="flex items-center gap-3"><Thermometer size={20} /> Temperature</div>
                    <span className="text-lg text-white/60">{selectedDevice?.colorTemp || 4000}K</span>
                  </div>
                  <input 
                    type="range" min="2500" max="6500" step="100"
                    value={selectedDevice?.colorTemp || 4000}
                    onChange={(e) => onUpdate(selectedDeviceId!, { colorTemp: parseInt(e.target.value) })}
                    className="w-full h-12 rounded-2xl appearance-none cursor-pointer"
                    style={{ background: 'linear-gradient(to right, #ff9e33, #ffffff, #a5c9ff)' }}
                  />
                </div>

                <div className="pt-4 grid grid-cols-2 gap-4">
                  <button 
                    onPointerDown={() => onUpdate(selectedDeviceId!, { colorTemp: 2700, brightness: 50 })}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 active:scale-95 transition-all gap-1"
                  >
                    <Flame size={20} className="text-orange-400" />
                    <span className="text-xs font-black uppercase text-orange-200">Warm 50%</span>
                  </button>
                  <button 
                    onPointerDown={() => onUpdate(selectedDeviceId!, { colorTemp: 2700, brightness: 100 })}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-orange-500/20 border border-orange-500/30 active:scale-95 transition-all gap-1"
                  >
                    <Flame size={24} className="text-orange-400" />
                    <span className="text-xs font-black uppercase text-white">Warm 100%</span>
                  </button>
                  <button 
                    onPointerDown={() => onUpdate(selectedDeviceId!, { colorTemp: 6000, brightness: 50 })}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 active:scale-95 transition-all gap-1"
                  >
                    <Snowflake size={20} className="text-blue-400" />
                    <span className="text-xs font-black uppercase text-blue-200">Cool 50%</span>
                  </button>
                  <button 
                    onPointerDown={() => onUpdate(selectedDeviceId!, { colorTemp: 6000, brightness: 100 })}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-blue-500/20 border border-blue-500/30 active:scale-95 transition-all gap-1"
                  >
                    <Snowflake size={24} className="text-blue-400" />
                    <span className="text-xs font-black uppercase text-white">Cool 100%</span>
                  </button>
                </div>
              </div>

              <div className="space-y-8 bg-white/5 p-10 rounded-[3rem] border border-white/5">
                <div className="flex items-center gap-2 text-white/40 uppercase font-black tracking-widest text-xs">
                  <Palette size={20} /> Color Presets
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.name}
                      onPointerDown={() => onUpdate(selectedDeviceId!, { color: { r: color.r, g: color.g, b: color.b } })}
                      className="aspect-square rounded-2xl border-4 border-white/5 active:scale-90 transition-all flex flex-col items-center justify-center gap-2"
                      style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b}, 0.15)`, borderColor: `rgb(${color.r}, ${color.g}, ${color.b}, 0.3)` }}
                    >
                      <div className="w-8 h-8 rounded-full shadow-lg" style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }} />
                      <span className="text-[10px] font-bold uppercase text-white/40">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

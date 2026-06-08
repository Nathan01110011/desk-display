import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Lightbulb, Loader2, ChevronLeft, Sun, Thermometer, Palette, Flame, Snowflake, Sparkles, X } from 'lucide-react';
import { SmartDevice } from '@/types';

interface SmartHomeViewProps {
  devices: SmartDevice[];
  loading: boolean;
  onUpdate: (id: string, params: Partial<SmartDevice>) => void;
  onClose: () => void;
}

const EFFECT_SCENES = [
  { id: 1, name: 'Ocean', swatch: '#0ea5e9' },
  { id: 2, name: 'Romance', swatch: '#f472b6' },
  { id: 3, name: 'Sunset', swatch: '#fb923c' },
  { id: 4, name: 'Party', swatch: '#a855f7' },
  { id: 5, name: 'Fireplace', swatch: '#f97316' },
  { id: 7, name: 'Forest', swatch: '#22c55e' },
  { id: 8, name: 'Pastel', swatch: '#c4b5fd' },
  { id: 29, name: 'Candle', swatch: '#facc15' },
  { id: 31, name: 'Pulse', swatch: '#ef4444' },
  { id: 36, name: 'Snowy', swatch: '#bfdbfe' },
];

export function SmartHomeView({ devices, loading, onUpdate }: SmartHomeViewProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [draftColor, setDraftColor] = useState({ r: 255, g: 255, b: 255 });

  const selectedDevice = devices.find(d => d.id === selectedDeviceId);
  const selectedColor = selectedDevice?.color || { r: 255, g: 255, b: 255 };
  const selectedColorHex = rgbToHex(selectedColor.r, selectedColor.g, selectedColor.b);
  const draftColorHex = rgbToHex(draftColor.r, draftColor.g, draftColor.b);
  const selectedSpeed = selectedDevice?.speed || 120;

  const handleToggle = (state: boolean) => {
    onUpdate(selectedDeviceId!, { isOn: state });
  };

  const openColorPicker = () => {
    setDraftColor(selectedColor);
    setColorPickerOpen(true);
  };

  const handleColorChange = (nextColor: { r: number; g: number; b: number }) => {
    const color = {
      r: clampColor(nextColor.r),
      g: clampColor(nextColor.g),
      b: clampColor(nextColor.b),
    };

    setDraftColor(color);
    onUpdate(selectedDeviceId!, { color, sceneId: undefined });
  };

  const handleEffectChange = (sceneId: number) => {
    onUpdate(selectedDeviceId!, { isOn: true, sceneId, speed: selectedSpeed });
  };

  if (loading && devices.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 opacity-20">
        <Home size={80} className="animate-pulse" />
        <p className="text-xl font-bold uppercase tracking-widest">Scanning Network...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center py-4 relative">
      <style jsx global>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 36px;
          height: 36px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          border: 4px solid rgba(0,0,0,0.2);
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
      `}</style>

      <AnimatePresence mode="wait">
        {!selectedDeviceId ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
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
                    relative flex flex-col items-center justify-center gap-6 p-8 rounded-[3rem] border transition-all active:scale-95 aspect-square overflow-hidden
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
            initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
            className="w-full h-full max-w-6xl flex flex-col gap-6 px-4"
          >
            <div className="flex items-center justify-between">
              <button 
                onPointerDown={() => setSelectedDeviceId(null)}
                className="p-3 rounded-xl bg-white/5 text-white/60 flex items-center gap-3 font-bold active:scale-90 transition-all"
              >
                <ChevronLeft size={24} /> Back
              </button>
              <div className="flex items-center gap-4">
                <span className="text-3xl font-black">{selectedDevice?.name}</span>
                <div className={`w-2 h-2 rounded-full ${selectedDevice?.isOn ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'bg-white/10'}`} />
              </div>
              <div className="w-24" />
            </div>

            <div className="grid grid-cols-2 gap-8 flex-1 overflow-hidden">
              <div className="space-y-6 bg-white/5 p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-center">
                <div className="flex p-1 bg-black/40 rounded-2xl border border-white/5">
                  <button 
                    onPointerDown={() => handleToggle(false)}
                    className={`flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${!selectedDevice?.isOn ? 'bg-white/10 text-white shadow-lg' : 'text-white/20'}`}
                  >
                    OFF
                  </button>
                  <button 
                    onPointerDown={() => handleToggle(true)}
                    className={`flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${selectedDevice?.isOn ? 'bg-yellow-500 text-black shadow-lg' : 'text-white/20'}`}
                  >
                    ON
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-white/40 uppercase font-black tracking-widest text-[10px]">
                    <div className="flex items-center gap-2"><Sun size={16} /> Brightness</div>
                    <span className="text-sm text-white/60">{selectedDevice?.brightness || 100}%</span>
                  </div>
                  <input 
                    type="range" min="10" max="100" 
                    value={selectedDevice?.brightness || 100}
                    onChange={(e) => onUpdate(selectedDeviceId!, { brightness: parseInt(e.target.value, 10) })}
                    className="w-full h-10 bg-white/10 rounded-xl appearance-none cursor-pointer accent-white"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-white/40 uppercase font-black tracking-widest text-[10px]">
                    <div className="flex items-center gap-2"><Thermometer size={16} /> Temperature</div>
                    <span className="text-sm text-white/60">{selectedDevice?.colorTemp || 4000}K</span>
                  </div>
                  <input 
                    type="range" min="2500" max="6500" step="100"
                    value={selectedDevice?.colorTemp || 4000}
                    onChange={(e) => onUpdate(selectedDeviceId!, { colorTemp: parseInt(e.target.value, 10), sceneId: undefined })}
                    className="w-full h-10 rounded-xl appearance-none cursor-pointer"
                    style={{ background: 'linear-gradient(to right, #ff9e33, #ffffff, #a5c9ff)' }}
                  />
                </div>

                <div className="pt-2 grid grid-cols-2 gap-3">
                  <button 
                    onPointerDown={() => onUpdate(selectedDeviceId!, { colorTemp: 2700, brightness: 50, sceneId: undefined })}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 active:scale-95 transition-all gap-1"
                  >
                    <Flame size={18} className="text-orange-400" />
                    <span className="text-[9px] font-black uppercase text-orange-200">Warm 50%</span>
                  </button>
                  <button 
                    onPointerDown={() => onUpdate(selectedDeviceId!, { colorTemp: 2700, brightness: 100, sceneId: undefined })}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 active:scale-95 transition-all gap-1"
                  >
                    <Flame size={18} className="text-orange-400" />
                    <span className="text-[9px] font-black uppercase text-white">Warm 100%</span>
                  </button>
                  <button 
                    onPointerDown={() => onUpdate(selectedDeviceId!, { colorTemp: 6000, brightness: 50, sceneId: undefined })}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 active:scale-95 transition-all gap-1"
                  >
                    <Snowflake size={18} className="text-blue-400" />
                    <span className="text-[9px] font-black uppercase text-blue-200">Cool 50%</span>
                  </button>
                  <button 
                    onPointerDown={() => onUpdate(selectedDeviceId!, { colorTemp: 6000, brightness: 100, sceneId: undefined })}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 active:scale-95 transition-all gap-1"
                  >
                    <Snowflake size={18} className="text-blue-400" />
                    <span className="text-[9px] font-black uppercase text-white">Cool 100%</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4 bg-white/5 p-5 rounded-[2.5rem] border border-white/5 overflow-y-auto scrollbar-hide flex flex-col justify-start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-white/40 uppercase font-black tracking-widest text-[10px]">
                    <div className="flex items-center gap-2"><Palette size={18} /> Color</div>
                    <span className="text-sm text-white/60 tabular-nums">{selectedColorHex.toUpperCase()}</span>
                  </div>
                  <button
                    onPointerDown={openColorPicker}
                    className="relative flex w-full items-center gap-4 rounded-2xl bg-black/30 border border-white/10 p-3 active:scale-[0.98] transition-transform overflow-hidden text-left"
                  >
                    <span
                      className="size-14 shrink-0 rounded-2xl border border-white/20 shadow-[0_0_24px_rgba(255,255,255,0.08)]"
                      style={{ backgroundColor: selectedColorHex }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-black text-white">Pick Color</span>
                      <span className="block text-xs font-bold text-white/35 tabular-nums mt-1">
                        R {clampColor(selectedColor.r)} · G {clampColor(selectedColor.g)} · B {clampColor(selectedColor.b)}
                      </span>
                    </span>
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-white/40 uppercase font-black tracking-widest text-[10px]">
                    <div className="flex items-center gap-2"><Sparkles size={18} /> Glow Modes</div>
                    <span className="text-sm text-white/60 tabular-nums">{selectedSpeed}</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    step="10"
                    value={selectedSpeed}
                    onChange={(e) => onUpdate(selectedDeviceId!, { speed: parseInt(e.target.value, 10) })}
                    className="w-full h-10 bg-white/10 rounded-xl appearance-none cursor-pointer accent-white"
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    {EFFECT_SCENES.map(scene => (
                      <button
                        key={scene.id}
                        onPointerDown={() => handleEffectChange(scene.id)}
                        className={`flex items-center gap-3 rounded-2xl border p-2.5 text-left active:scale-95 transition-all ${
                          selectedDevice?.sceneId === scene.id
                            ? 'bg-white text-black border-white'
                            : 'bg-black/20 text-white/70 border-white/5'
                        }`}
                      >
                        <span
                          className="size-7 shrink-0 rounded-xl border border-white/20"
                          style={{ backgroundColor: scene.swatch }}
                        />
                        <span className="text-[11px] font-black uppercase tracking-widest">{scene.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {colorPickerOpen && selectedDeviceId && (
          <motion.div
            key="color-picker-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl flex items-center justify-center p-8"
          >
            <motion.div
              initial={{ scale: 0.96, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 20 }}
              className="w-[90vw] max-w-5xl h-[90vh] rounded-[3rem] border border-white/10 bg-[#101010] shadow-2xl overflow-hidden grid grid-cols-[0.95fr_1.05fr]"
            >
              <div
                className="relative min-h-0"
                style={{ backgroundColor: draftColorHex }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_24%,rgba(255,255,255,0.65),transparent_30%),linear-gradient(to_bottom,rgba(255,255,255,0.08),rgba(0,0,0,0.35))]" />
                <div className="absolute inset-x-6 bottom-6 rounded-[2rem] bg-black/30 border border-white/15 p-5 backdrop-blur-md">
                  <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">Selected Color</div>
                  <div className="mt-2 text-4xl font-black tabular-nums tracking-tight">{draftColorHex.toUpperCase()}</div>
                </div>
              </div>

              <div className="p-6 flex flex-col min-h-0">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-white/40 uppercase font-black tracking-widest text-[10px]">
                      <Palette size={18} /> Color
                    </div>
                    <h3 className="text-3xl font-black mt-2">{selectedDevice?.name}</h3>
                  </div>
                  <button
                    onPointerDown={() => setColorPickerOpen(false)}
                    className="size-14 rounded-2xl bg-white/5 border border-white/10 text-white/60 flex items-center justify-center active:scale-90 transition-all"
                    aria-label="Close color picker"
                  >
                    <X size={26} />
                  </button>
                </div>

                <div className="flex-1 flex flex-col justify-center gap-5">
                  <ColorSlider
                    label="Red"
                    value={draftColor.r}
                    gradient="linear-gradient(to right, rgb(0, 0, 0), rgb(255, 0, 0))"
                    onChange={(value) => handleColorChange({ ...draftColor, r: value })}
                  />
                  <ColorSlider
                    label="Green"
                    value={draftColor.g}
                    gradient="linear-gradient(to right, rgb(0, 0, 0), rgb(0, 255, 0))"
                    onChange={(value) => handleColorChange({ ...draftColor, g: value })}
                  />
                  <ColorSlider
                    label="Blue"
                    value={draftColor.b}
                    gradient="linear-gradient(to right, rgb(0, 0, 0), rgb(0, 80, 255))"
                    onChange={(value) => handleColorChange({ ...draftColor, b: value })}
                  />
                  <ColorSlider
                    label="Spectrum"
                    value={rgbToHue(draftColor.r, draftColor.g, draftColor.b)}
                    max={360}
                    gradient="linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)"
                    onChange={(value) => handleColorChange(hueToRgb(value))}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <ColorMetric label="R" value={draftColor.r} />
                  <ColorMetric label="G" value={draftColor.g} />
                  <ColorMetric label="B" value={draftColor.b} />
                </div>

                <button
                  onPointerDown={() => setColorPickerOpen(false)}
                  className="mt-4 w-full rounded-2xl bg-white text-black py-4 text-sm font-black uppercase tracking-widest active:scale-[0.98] transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map(value => clampColor(value).toString(16).padStart(2, '0')).join('')}`;
}

function clampColor(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function ColorSlider({
  label,
  value,
  max = 255,
  gradient,
  onChange,
}: {
  label: string;
  value: number;
  max?: number;
  gradient: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-white/40 uppercase font-black tracking-widest text-[10px]">
        <span>{label}</span>
        <span className="text-sm text-white/70 tabular-nums">{Math.round(value)}</span>
      </div>
      <input
        type="range"
        min="0"
        max={max}
        value={Math.round(value)}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full h-10 rounded-2xl appearance-none cursor-pointer"
        style={{ background: gradient }}
      />
    </div>
  );
}

function rgbToHue(r: number, g: number, b: number) {
  const red = clampColor(r) / 255;
  const green = clampColor(g) / 255;
  const blue = clampColor(b) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  if (delta === 0) return 0;
  if (max === red) return Math.round(60 * (((green - blue) / delta) % 6) + 360) % 360;
  if (max === green) return Math.round(60 * ((blue - red) / delta + 2));
  return Math.round(60 * ((red - green) / delta + 4));
}

function hueToRgb(hue: number) {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const chroma = 255;
  const x = chroma * (1 - Math.abs((normalizedHue / 60) % 2 - 1));
  const sector = Math.floor(normalizedHue / 60);

  const [r, g, b] = [
    [chroma, x, 0],
    [x, chroma, 0],
    [0, chroma, x],
    [0, x, chroma],
    [x, 0, chroma],
    [chroma, 0, x],
  ][sector] || [chroma, 0, 0];

  return { r, g, b };
}

function ColorMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 text-center">
      <div className="text-[10px] font-black uppercase tracking-widest text-white/35">{label}</div>
      <div className="text-xl font-black tabular-nums">{clampColor(value)}</div>
    </div>
  );
}

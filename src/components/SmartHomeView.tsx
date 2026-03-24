import React from 'react';
import { motion } from 'framer-motion';
import { Home, Lightbulb, Zap, Loader2 } from 'lucide-react';
import { SmartDevice } from '@/types';

interface SmartHomeViewProps {
  devices: SmartDevice[];
  loading: boolean;
  onToggle: (id: string, currentState: boolean) => void;
  onClose: () => void;
}

export function SmartHomeView({ devices, loading, onToggle, onClose }: SmartHomeViewProps) {
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
        <p className="text-xl font-bold uppercase tracking-widest">No Devices Found</p>
        <p className="text-sm">Check your SMART_DEVICES in .env.local</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full max-w-5xl flex flex-col items-center justify-center min-h-[600px] gap-8 py-8"
    >
      <div className="flex items-center gap-4 text-white/30 font-bold uppercase tracking-[0.3em] text-sm mb-4">
        <Home size={20} /> Smart Home
      </div>

      <div className="grid grid-cols-3 gap-8 w-full px-8">
        {devices.map((device) => (
          <button
            key={device.id}
            onPointerDown={() => !device.loading && onToggle(device.id, device.isOn)}
            className={`
              relative flex flex-col items-center justify-center gap-6 p-10 rounded-[3rem] border transition-all active:scale-95 aspect-square overflow-hidden
              ${device.isOn 
                ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' 
                : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}
            `}
          >
            {/* Glowing background effect when ON */}
            {device.isOn && (
              <div className="absolute inset-0 bg-yellow-500/10 blur-3xl rounded-full scale-150" />
            )}
            
            <div className="relative z-10">
              {device.loading ? (
                <Loader2 size={64} className="animate-spin" />
              ) : device.type === 'tapo' ? (
                <Lightbulb size={64} className={device.isOn ? 'fill-yellow-400/20 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]' : ''} />
              ) : (
                <Zap size={64} />
              )}
            </div>
            
            <div className="relative z-10 flex flex-col items-center gap-1">
              <span className="text-2xl font-bold tracking-tight">{device.name}</span>
              <span className={`text-sm font-black uppercase tracking-widest ${device.isOn ? 'text-yellow-500/50' : 'text-white/20'}`}>
                {device.isOn ? 'ON' : 'OFF'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

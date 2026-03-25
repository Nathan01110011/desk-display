import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Timer, Play, Pause, RotateCcw, Plus, Minus } from 'lucide-react';
import { formatPomoTime } from '@/lib/format';

interface TimerViewProps {
  timeLeft: number;
  isActive: boolean;
  onStart: (seconds: number) => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onClose: () => void;
}

export function TimerView({ 
  timeLeft, 
  isActive, 
  onStart, 
  onPause, 
  onResume, 
  onReset, 
  onClose 
}: TimerViewProps) {
  const [customMinutes, setCustomMinutes] = useState(5);

  const presets = [1, 5, 10, 15, 30, 60];

  const handleAdjustCustom = (amount: number) => {
    setCustomMinutes(prev => Math.max(1, prev + amount));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full max-w-5xl flex flex-col items-center justify-center gap-12 py-8"
    >
      <div className="flex items-center gap-4 text-white/30 font-bold uppercase tracking-[0.3em] text-sm mb-4">
        <Timer size={20} /> Timer
      </div>

      {timeLeft > 0 || isActive ? (
        <div className="flex flex-col items-center gap-12">
          <h1 className="text-[12rem] font-black tracking-tighter leading-none tabular-nums">
            {formatPomoTime(timeLeft)}
          </h1>
          
          <div className="flex items-center gap-8">
            <button 
              onPointerDown={isActive ? onPause : onResume}
              className={`p-10 rounded-full shadow-2xl active:scale-90 transition-all ${
                isActive ? 'bg-white/10 text-white' : 'bg-white text-black'
              }`}
            >
              {isActive ? <Pause size={64} fill="currentColor" /> : <Play size={64} fill="currentColor" className="ml-2" />}
            </button>
            <button 
              onPointerDown={onReset}
              className="p-8 rounded-full bg-white/5 text-white/40 hover:bg-white/10 active:scale-90 transition-all border border-white/5"
            >
              <RotateCcw size={48} />
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full grid grid-cols-2 gap-12">
          {/* Presets Side */}
          <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 flex flex-col gap-8">
            <p className="text-white/30 font-bold uppercase tracking-widest text-sm px-2 text-center">Quick Set</p>
            <div className="grid grid-cols-3 gap-4">
              {presets.map(m => (
                <button
                  key={m}
                  onPointerDown={() => onStart(m * 60)}
                  className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 active:scale-95 transition-all flex flex-col items-center gap-1"
                >
                  <span className="text-3xl font-black">{m}</span>
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Min</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Side */}
          <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 flex flex-col items-center justify-between gap-8">
            <p className="text-white/30 font-bold uppercase tracking-widest text-sm text-center">Custom Duration</p>
            
            <div className="flex items-center gap-8">
              <button onPointerDown={() => handleAdjustCustom(-1)} className="p-4 rounded-2xl bg-white/5 active:scale-90 transition-all"><Minus size={32} /></button>
              <div className="flex flex-col items-center">
                <span className="text-7xl font-black">{customMinutes}</span>
                <span className="text-white/20 font-bold uppercase text-xs">Minutes</span>
              </div>
              <button onPointerDown={() => handleAdjustCustom(1)} className="p-4 rounded-2xl bg-white/5 active:scale-90 transition-all"><Plus size={32} /></button>
            </div>

            <button 
              onPointerDown={() => onStart(customMinutes * 60)}
              className="w-full py-6 rounded-[2rem] bg-white text-black font-black text-2xl uppercase tracking-widest active:scale-[0.98] transition-all shadow-xl"
            >
              Start
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

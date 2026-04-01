import React from 'react';
import { motion } from 'framer-motion';
import { Timer, X, Play, Pause, RotateCcw, CheckCircle2 } from 'lucide-react';
import { PomodoroMode } from '@/types';
import { formatPomoTime } from '@/lib/format';

interface PomodoroViewProps {
  pomoTime: number;
  pomoActive: boolean;
  pomoMode: PomodoroMode;
  onToggle: () => void;
  onReset: () => void;
  onSwitchMode: () => void;
  onClose: () => void;
}

export function PomodoroView({ 
  pomoTime, 
  pomoActive, 
  pomoMode, 
  onToggle, 
  onReset, 
  onSwitchMode, 
  onClose 
}: PomodoroViewProps) {
  const isFinished = pomoTime === 0 && !pomoActive;

  return (
    <motion.div
      key="pomodoro-view"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full flex flex-col items-center space-y-12 relative"
    >
      <div className="flex items-center gap-4 text-white/30 font-bold uppercase tracking-[0.3em] text-sm">
        <Timer size={20} /> Pomodoro
      </div>

      {isFinished ? (
        <motion.div 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="text-red-500 flex flex-col items-center gap-4"
        >
          <CheckCircle2 size={120} />
          <h1 className="text-[10rem] font-black tracking-tighter leading-none italic uppercase">Done!</h1>
        </motion.div>
      ) : (
        <div className="text-[12rem] font-black tracking-tighter leading-none text-white tabular-nums">
          {formatPomoTime(pomoTime)}
        </div>
      )}

      <div className="flex items-center gap-8">
        {isFinished ? (
          <button 
            onPointerDown={onReset}
            className="px-16 py-8 rounded-[3rem] bg-white text-black text-4xl font-black uppercase tracking-widest shadow-2xl active:scale-90 transition-transform flex items-center gap-4"
          >
            <X size={48} strokeWidth={3} /> Clear
          </button>
        ) : (
          <>
            <button
              onPointerDown={onSwitchMode}
              className="px-8 py-4 rounded-2xl bg-white/5 text-xl font-bold border border-white/10"
            >
              {pomoMode === 'work' ? 'Switch to Break' : 'Switch to Work'}
            </button>
            
            <button
              onPointerDown={onToggle}
              className="p-12 rounded-full bg-white text-black shadow-2xl active:scale-90 transition-transform"
            >
              {pomoActive ? <Pause size={64} fill="currentColor" /> : <Play size={64} fill="currentColor" className="ml-2" />}
            </button>

            <button
              onPointerDown={onReset}
              className="p-8 rounded-full bg-white/10 text-white shadow-xl active:scale-90 transition-transform"
            >
              <RotateCcw size={40} />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

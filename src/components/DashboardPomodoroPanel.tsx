import React from 'react';
import { motion } from 'framer-motion';
import { Pause, Play, RotateCcw, Timer } from 'lucide-react';
import { PomodoroMode } from '@/types';
import { formatPomoTime } from '@/lib/format';

interface DashboardPomodoroPanelProps {
  timeLeft: number;
  totalTime: number;
  active: boolean;
  mode: PomodoroMode;
  onOpen: () => void;
  onToggle: () => void;
  onReset: () => void;
  compact?: boolean;
}

export function DashboardPomodoroPanel({
  timeLeft,
  totalTime,
  active,
  mode,
  onOpen,
  onToggle,
  onReset,
  compact = false
}: DashboardPomodoroPanelProps) {
  const progress = totalTime > 0 ? Math.max(0, Math.min(1, timeLeft / totalTime)) : 0;
  const degrees = progress * 360;
  const isBreak = mode === 'break';
  const accent = isBreak ? '#60a5fa' : '#fb7185';
  const softAccent = isBreak ? 'rgba(96, 165, 250, 0.14)' : 'rgba(251, 113, 133, 0.14)';

  return (
    <motion.div
      key="dashboard-pomodoro"
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 18 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`${compact ? 'h-full p-4 rounded-[1.5rem]' : 'h-full p-6 rounded-[2rem]'} min-h-0 border border-white/10 bg-white/[0.045] flex items-center justify-center`}
    >
      <div className={`w-full max-w-xl flex items-center ${compact ? 'gap-4' : 'gap-8'}`}>
        <button
          onPointerDown={onOpen}
          className={`relative shrink-0 rounded-full active:scale-95 transition-transform ${compact ? 'size-32' : 'size-56'}`}
          aria-label="Open Pomodoro"
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={active ? { rotate: 360 } : { rotate: 0 }}
            transition={active ? { repeat: Infinity, duration: 12, ease: 'linear' } : { duration: 0.2 }}
            style={{
              background: `conic-gradient(from -90deg, ${accent} ${degrees}deg, rgba(255,255,255,0.08) ${degrees}deg)`
            }}
          />
          <div className="absolute inset-3 rounded-full bg-black" />
          <div
            className="absolute inset-5 rounded-full border border-white/10"
            style={{ background: softAccent }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Timer size={compact ? 18 : 26} className={isBreak ? 'text-blue-300/70' : 'text-rose-300/70'} />
            <div className={`mt-2 font-black tracking-tighter tabular-nums leading-none ${compact ? 'text-3xl' : 'text-5xl'}`}>
              {formatPomoTime(timeLeft)}
            </div>
            <div className={`${compact ? 'mt-1 text-[8px]' : 'mt-2 text-[10px]'} font-black uppercase tracking-[0.28em] text-white/35`}>
              {isBreak ? 'Break' : 'Focus'}
            </div>
          </div>
        </button>

        <div className={`min-w-0 flex-1 ${compact ? 'space-y-3' : 'space-y-6'}`}>
          <div>
            <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.28em] text-white/30">
              <Timer size={16} />
              Pomodoro
            </div>
            <h3 className={`${compact ? 'mt-2 text-2xl' : 'mt-3 text-4xl'} font-black tracking-tight leading-none`}>
              {active ? 'In progress' : timeLeft === 0 ? 'Complete' : 'Paused'}
            </h3>
            <p className={`${compact ? 'mt-1 text-sm' : 'mt-2 text-lg'} font-bold text-white/35`}>
              {isBreak ? 'Break timer' : 'Focus timer'} · {Math.round((1 - progress) * 100)}%
            </p>
          </div>

          <div className={`flex items-center ${compact ? 'gap-3' : 'gap-4'}`}>
            <button
              onPointerDown={onToggle}
              className={`${compact ? 'p-4' : 'p-6'} rounded-full bg-white text-black shadow-xl active:scale-90 transition-transform`}
              aria-label={active ? 'Pause Pomodoro' : 'Start Pomodoro'}
            >
              {active ? <Pause size={compact ? 24 : 34} fill="currentColor" /> : <Play size={compact ? 24 : 34} fill="currentColor" className="ml-1" />}
            </button>
            <button
              onPointerDown={onReset}
              className={`${compact ? 'p-3.5' : 'p-5'} rounded-full bg-white/10 text-white shadow-lg active:scale-90 transition-transform`}
              aria-label="Reset Pomodoro"
            >
              <RotateCcw size={compact ? 20 : 28} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

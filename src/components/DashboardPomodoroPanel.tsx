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
      className={`${compact ? 'h-full p-4 rounded-[1.5rem]' : 'h-full p-5 rounded-[2rem]'} min-h-0 min-w-0 overflow-hidden border border-white/10 bg-white/[0.045] flex items-center justify-center`}
    >
      <div className={`w-full max-w-full min-w-0 min-h-0 flex items-center ${compact ? 'gap-4' : 'gap-5'}`}>
        <button
          onPointerDown={onOpen}
          className={`relative aspect-square shrink-0 rounded-full active:scale-95 transition-transform ${compact ? 'w-[clamp(5.5rem,18vh,7rem)]' : 'w-[clamp(8rem,18vw,12rem)]'}`}
          aria-label="Open Pomodoro"
        >
          <div
            className="absolute inset-0 rounded-full"
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
            <Timer size={compact ? 16 : 22} className={isBreak ? 'text-blue-300/70' : 'text-rose-300/70'} />
            <div className={`mt-1 font-black tracking-tighter tabular-nums leading-none ${compact ? 'text-2xl' : 'text-[clamp(2rem,4vw,3rem)]'}`}>
              {formatPomoTime(timeLeft)}
            </div>
            <div className={`${compact ? 'mt-1 text-[8px]' : 'mt-2 text-[10px]'} font-black uppercase tracking-[0.28em] text-white/35`}>
              {isBreak ? 'Break' : 'Focus'}
            </div>
          </div>
        </button>

        <div className={`min-w-0 flex-1 overflow-hidden ${compact ? 'space-y-2' : 'space-y-4'}`}>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/30">
              <Timer size={16} />
              Pomodoro
            </div>
            <h3 className={`${compact ? 'mt-2 text-xl' : 'mt-3 text-[clamp(1.65rem,3vw,2.5rem)]'} font-black tracking-tight leading-none truncate`}>
              {active ? 'In progress' : timeLeft === 0 ? 'Complete' : 'Paused'}
            </h3>
            <p className={`${compact ? 'mt-1 text-xs' : 'mt-2 text-sm'} font-bold text-white/35 truncate`}>
              {isBreak ? 'Break timer' : 'Focus timer'} · {Math.round((1 - progress) * 100)}%
            </p>
          </div>

          <div className={`flex items-center ${compact ? 'gap-3' : 'gap-4'}`}>
            <button
              onPointerDown={onToggle}
              className={`${compact ? 'p-3' : 'p-4'} rounded-full bg-white text-black shadow-xl active:scale-90 transition-transform`}
              aria-label={active ? 'Pause Pomodoro' : 'Start Pomodoro'}
            >
              {active ? <Pause size={compact ? 20 : 28} fill="currentColor" /> : <Play size={compact ? 20 : 28} fill="currentColor" className="ml-1" />}
            </button>
            <button
              onPointerDown={onReset}
              className={`${compact ? 'p-2.5' : 'p-3.5'} rounded-full bg-white/10 text-white shadow-lg active:scale-90 transition-transform`}
              aria-label="Reset Pomodoro"
            >
              <RotateCcw size={compact ? 18 : 22} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCircle2, Hourglass, Pause, Play, RotateCcw } from 'lucide-react';
import { formatPomoTime } from '@/lib/format';

interface DashboardTimerPanelProps {
  timeLeft: number;
  totalTime: number;
  active: boolean;
  finished: boolean;
  onOpen: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onDismiss: () => void;
  compact?: boolean;
}

export function DashboardTimerPanel({
  timeLeft,
  totalTime,
  active,
  finished,
  onOpen,
  onPause,
  onResume,
  onReset,
  onDismiss,
  compact = false
}: DashboardTimerPanelProps) {
  const progress = totalTime > 0 ? Math.max(0, Math.min(1, 1 - (timeLeft / totalTime))) : finished ? 1 : 0;
  const degrees = progress * 360;
  const accent = finished ? '#34d399' : '#38bdf8';
  const status = finished ? 'Complete' : active ? 'Running' : 'Paused';

  return (
    <motion.div
      key="dashboard-timer"
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
          aria-label="Open Timer"
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(from -90deg, ${accent} ${degrees}deg, rgba(255,255,255,0.08) ${degrees}deg)`
            }}
          />
          <div className="absolute inset-3 rounded-full bg-black" />
          <div className="absolute inset-5 rounded-full border border-white/10 bg-sky-300/10" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {finished ? <CheckCircle2 size={compact ? 20 : 30} className="text-emerald-300/80" /> : <Hourglass size={compact ? 18 : 28} className="text-sky-300/80" />}
            <div className={`mt-2 font-black tracking-tighter tabular-nums leading-none ${compact ? 'text-3xl' : 'text-5xl'}`}>
              {formatPomoTime(timeLeft)}
            </div>
            <div className={`${compact ? 'mt-1 text-[8px]' : 'mt-2 text-[10px]'} font-black uppercase tracking-[0.28em] text-white/35`}>
              Timer
            </div>
          </div>
        </button>

        <div className={`min-w-0 flex-1 ${compact ? 'space-y-3' : 'space-y-6'}`}>
          <div>
            <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.28em] text-white/30">
              <Bell size={16} />
              Timer
            </div>
            <h3 className={`${compact ? 'mt-2 text-2xl' : 'mt-3 text-4xl'} font-black tracking-tight leading-none`}>{status}</h3>
            <p className={`${compact ? 'mt-1 text-sm' : 'mt-2 text-lg'} font-bold text-white/35`}>{Math.round(progress * 100)}% elapsed</p>
          </div>

          <div className={`flex items-center ${compact ? 'gap-3' : 'gap-4'}`}>
            {finished ? (
              <button
                onPointerDown={onDismiss}
                className={`${compact ? 'px-5 py-3 text-xs' : 'px-8 py-5'} rounded-full bg-white text-black font-black uppercase tracking-widest shadow-xl active:scale-90 transition-transform`}
              >
                Clear
              </button>
            ) : (
              <button
                onPointerDown={active ? onPause : onResume}
                className={`${compact ? 'p-4' : 'p-6'} rounded-full bg-white text-black shadow-xl active:scale-90 transition-transform`}
                aria-label={active ? 'Pause Timer' : 'Resume Timer'}
              >
                {active ? <Pause size={compact ? 24 : 34} fill="currentColor" /> : <Play size={compact ? 24 : 34} fill="currentColor" className="ml-1" />}
              </button>
            )}
            <button
              onPointerDown={onReset}
              className={`${compact ? 'p-3.5' : 'p-5'} rounded-full bg-white/10 text-white shadow-lg active:scale-90 transition-transform`}
              aria-label="Reset Timer"
            >
              <RotateCcw size={compact ? 20 : 28} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

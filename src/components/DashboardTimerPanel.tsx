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
      className={`${compact ? 'h-full p-4 rounded-[1.5rem]' : 'h-full p-5 rounded-[2rem]'} min-h-0 min-w-0 overflow-hidden border border-white/10 bg-white/[0.045] flex items-center justify-center`}
    >
      <div className={`w-full max-w-full min-w-0 min-h-0 flex items-center ${compact ? 'gap-4' : 'gap-5'}`}>
        <button
          onPointerDown={onOpen}
          className={`relative aspect-square shrink-0 rounded-full active:scale-95 transition-transform ${compact ? 'w-[clamp(5.5rem,18vh,7rem)]' : 'w-[clamp(8rem,18vw,12rem)]'}`}
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
            {finished ? <CheckCircle2 size={compact ? 18 : 24} className="text-emerald-300/80" /> : <Hourglass size={compact ? 16 : 22} className="text-sky-300/80" />}
            <div className={`mt-1 font-black tracking-tighter tabular-nums leading-none ${compact ? 'text-2xl' : 'text-[clamp(2rem,4vw,3rem)]'}`}>
              {formatPomoTime(timeLeft)}
            </div>
            <div className={`${compact ? 'mt-1 text-[8px]' : 'mt-2 text-[10px]'} font-black uppercase tracking-[0.28em] text-white/35`}>
              Timer
            </div>
          </div>
        </button>

        <div className={`min-w-0 flex-1 overflow-hidden ${compact ? 'space-y-2' : 'space-y-4'}`}>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/30">
              <Bell size={16} />
              Timer
            </div>
            <h3 className={`${compact ? 'mt-2 text-xl' : 'mt-3 text-[clamp(1.65rem,3vw,2.5rem)]'} font-black tracking-tight leading-none truncate`}>{status}</h3>
            <p className={`${compact ? 'mt-1 text-xs' : 'mt-2 text-sm'} font-bold text-white/35 truncate`}>{Math.round(progress * 100)}% elapsed</p>
          </div>

          <div className={`flex items-center ${compact ? 'gap-3' : 'gap-4'}`}>
            {finished ? (
              <button
                onPointerDown={onDismiss}
                className={`${compact ? 'px-4 py-2.5 text-[10px]' : 'px-6 py-4 text-sm'} rounded-full bg-white text-black font-black uppercase tracking-widest shadow-xl active:scale-90 transition-transform`}
              >
                Clear
              </button>
            ) : (
              <button
                onPointerDown={active ? onPause : onResume}
                className={`${compact ? 'p-3' : 'p-4'} rounded-full bg-white text-black shadow-xl active:scale-90 transition-transform`}
                aria-label={active ? 'Pause Timer' : 'Resume Timer'}
              >
                {active ? <Pause size={compact ? 20 : 28} fill="currentColor" /> : <Play size={compact ? 20 : 28} fill="currentColor" className="ml-1" />}
              </button>
            )}
            <button
              onPointerDown={onReset}
              className={`${compact ? 'p-2.5' : 'p-3.5'} rounded-full bg-white/10 text-white shadow-lg active:scale-90 transition-transform`}
              aria-label="Reset Timer"
            >
              <RotateCcw size={compact ? 18 : 22} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

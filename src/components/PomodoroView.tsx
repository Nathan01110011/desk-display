import React from 'react';
import { motion } from 'framer-motion';
import { Timer, X, Play, Pause, RotateCcw, CheckCircle2, Coffee, Focus, Minus, Plus } from 'lucide-react';
import { PomodoroMode } from '@/types';
import { formatPomoTime } from '@/lib/format';

interface PomodoroViewProps {
  pomoTime: number;
  pomoActive: boolean;
  pomoMode: PomodoroMode;
  workDuration: number;
  breakDuration: number;
  onToggle: () => void;
  onReset: () => void;
  onSwitchMode: () => void;
  onUpdateDurations: (work: number, breakTime: number) => void;
  onClose: () => void;
}

export function PomodoroView({ 
  pomoTime, 
  pomoActive, 
  pomoMode, 
  workDuration,
  breakDuration,
  onToggle, 
  onReset, 
  onSwitchMode,
  onUpdateDurations
}: PomodoroViewProps) {
  const isFinished = pomoTime === 0 && !pomoActive;
  const isBreak = pomoMode === 'break';
  const totalTime = (isBreak ? breakDuration : workDuration) * 60;
  const progress = totalTime > 0 ? Math.max(0, Math.min(1, 1 - (pomoTime / totalTime))) : 0;
  const remaining = Math.max(0, 100 - Math.round(progress * 100));
  const accent = isBreak ? '#60a5fa' : '#fb7185';
  const softAccent = isBreak ? 'rgba(96, 165, 250, 0.14)' : 'rgba(251, 113, 133, 0.14)';
  const ModeIcon = isBreak ? Coffee : Focus;

  return (
    <motion.div
      key="pomodoro-view"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="w-full h-full grid grid-cols-[minmax(0,1fr)_22rem] gap-8"
    >
      <section className="min-h-0 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 flex items-center justify-center">
        <div className="relative size-[min(62vh,34rem)]">
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={pomoActive ? { rotate: 360 } : { rotate: 0 }}
            transition={pomoActive ? { repeat: Infinity, duration: 16, ease: 'linear' } : { duration: 0.2 }}
            style={{
              background: `conic-gradient(from -90deg, ${accent} ${progress * 360}deg, rgba(255,255,255,0.08) ${progress * 360}deg)`
            }}
          />
          <div className="absolute inset-5 rounded-full bg-black" />
          <div
            className="absolute inset-9 rounded-full border border-white/10"
            style={{ background: softAccent }}
          />

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {isFinished ? (
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 1.1 }}
                className="flex flex-col items-center gap-4 text-emerald-300"
              >
                <CheckCircle2 size={104} />
                <h1 className="text-7xl font-black tracking-tight uppercase">Done</h1>
              </motion.div>
            ) : (
              <>
                <ModeIcon size={38} className={isBreak ? 'text-blue-300/80' : 'text-rose-300/80'} />
                <div className="mt-5 text-[7.5rem] font-black tracking-tighter leading-none tabular-nums">
                  {formatPomoTime(pomoTime)}
                </div>
                <div className="mt-5 text-xs font-black uppercase tracking-[0.35em] text-white/35">
                  {isBreak ? 'Break' : 'Focus'} · {remaining}% left
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <aside className="min-h-0 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 flex flex-col">
        <div className="flex items-center gap-4 text-white/30 font-bold uppercase tracking-[0.3em] text-sm">
          <Timer size={20} /> Pomodoro
        </div>

        <div className="mt-8">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-white/25">Current mode</p>
          <div className="mt-4 flex items-center gap-4">
            <div
              className="size-14 rounded-2xl border border-white/10 flex items-center justify-center"
              style={{ background: softAccent }}
            >
              <ModeIcon size={26} className={isBreak ? 'text-blue-300' : 'text-rose-300'} />
            </div>
            <div>
              <h2 className="text-4xl font-black tracking-tight">{isBreak ? 'Break' : 'Focus'}</h2>
              <p className="text-white/35 font-bold">{pomoActive ? 'Running now' : isFinished ? 'Finished' : 'Ready'}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/25">Elapsed</p>
            <p className="mt-2 text-3xl font-black tabular-nums">{Math.round(progress * 100)}%</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/25">Left</p>
            <p className="mt-2 text-3xl font-black tabular-nums">{remaining}%</p>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/25">Durations</p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-black uppercase tracking-widest text-white/35">Focus</span>
              <div className="flex items-center gap-3">
                <button
                  onPointerDown={() => onUpdateDurations(Math.max(1, workDuration - 1), breakDuration)}
                  className="p-2 rounded-xl bg-white/5 active:scale-90 transition-all"
                  aria-label="Decrease focus duration"
                >
                  <Minus size={18} />
                </button>
                <span className="text-2xl font-black min-w-12 text-center tabular-nums">{workDuration}</span>
                <button
                  onPointerDown={() => onUpdateDurations(workDuration + 1, breakDuration)}
                  className="p-2 rounded-xl bg-white/5 active:scale-90 transition-all"
                  aria-label="Increase focus duration"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-black uppercase tracking-widest text-white/35">Break</span>
              <div className="flex items-center gap-3">
                <button
                  onPointerDown={() => onUpdateDurations(workDuration, Math.max(1, breakDuration - 1))}
                  className="p-2 rounded-xl bg-white/5 active:scale-90 transition-all"
                  aria-label="Decrease break duration"
                >
                  <Minus size={18} />
                </button>
                <span className="text-2xl font-black min-w-12 text-center tabular-nums">{breakDuration}</span>
                <button
                  onPointerDown={() => onUpdateDurations(workDuration, breakDuration + 1)}
                  className="p-2 rounded-xl bg-white/5 active:scale-90 transition-all"
                  aria-label="Increase break duration"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>

          {!isFinished && (
            <button
              onPointerDown={onSwitchMode}
              className="w-full py-5 rounded-2xl bg-white/5 text-lg font-black uppercase tracking-widest border border-white/10 active:scale-[0.98] transition-transform"
            >
              {isBreak ? 'Switch to Focus' : 'Switch to Break'}
            </button>
          )}
        </div>

        <div className="mt-auto flex items-center gap-4">
          {isFinished ? (
            <button
              onPointerDown={onReset}
              className="flex-1 py-6 rounded-[2rem] bg-white text-black text-2xl font-black uppercase tracking-widest shadow-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-3"
            >
              <X size={34} strokeWidth={3} /> Clear
            </button>
          ) : (
            <>
              <button
                onPointerDown={onToggle}
                className="p-7 rounded-full bg-white text-black shadow-2xl active:scale-90 transition-transform"
              >
                {pomoActive ? <Pause size={42} fill="currentColor" /> : <Play size={42} fill="currentColor" className="ml-1" />}
              </button>

              <button
                onPointerDown={onReset}
                className="p-6 rounded-full bg-white/10 text-white shadow-xl active:scale-90 transition-transform"
              >
                <RotateCcw size={34} />
              </button>
            </>
          )}
        </div>
      </aside>
    </motion.div>
  );
}

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Timer, Play, Pause, RotateCcw, Plus, Minus, X, CheckCircle2 } from 'lucide-react';
import { formatPomoTime } from '@/lib/format';

interface TimerViewProps {
  timeLeft: number;
  totalTime: number;
  isActive: boolean;
  isFinished: boolean;
  onStart: (seconds: number) => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onDismiss: () => void;
  onClose: () => void;
}

export function TimerView({ 
  timeLeft, 
  totalTime,
  isActive,
  isFinished,
  onStart, 
  onPause, 
  onResume, 
  onReset, 
  onDismiss
}: TimerViewProps) {
  const [customMinutes, setCustomMinutes] = useState(5);

  const presets = [1, 5, 10, 15, 30, 60];
  const hasTimer = timeLeft > 0 || isActive || isFinished;
  const progress = totalTime > 0 ? Math.max(0, Math.min(1, 1 - (timeLeft / totalTime))) : isFinished ? 1 : 0;
  const remaining = Math.max(0, 100 - Math.round(progress * 100));
  const accent = isFinished ? '#34d399' : '#38bdf8';
  const displayTime = formatPomoTime(timeLeft);
  const timeTextSize = displayTime.length > 4 ? 'text-[clamp(2.75rem,7.5vw,5.25rem)]' : 'text-[clamp(3.4rem,10vw,7rem)]';

  const handleAdjustCustom = (amount: number) => {
    setCustomMinutes(prev => Math.max(1, prev + amount));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full h-full grid grid-cols-[minmax(0,1fr)_22rem] gap-8"
    >
      <section className="min-h-0 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 flex flex-col">
        {hasTimer ? (
          <>
            <div className="flex items-center justify-between gap-4 text-white/30 font-bold uppercase tracking-[0.3em] text-sm">
              <span className="flex items-center gap-3"><Timer size={18} /> Timer</span>
              <span>{isFinished ? 'Complete' : isActive ? 'Running' : 'Paused'}</span>
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center py-6">
              <div className="relative aspect-square w-[min(100%,46vh,30rem)] shrink">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(from -90deg, ${accent} ${progress * 360}deg, rgba(255,255,255,0.08) ${progress * 360}deg)`
                  }}
                />
                <div className="absolute inset-[clamp(0.8rem,4%,1.25rem)] rounded-full bg-black" />
                <div className="absolute inset-[clamp(1.45rem,7%,2.25rem)] rounded-full border border-white/10 bg-sky-300/10" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
                  {isFinished ? (
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 1.1 }}
                      className="flex flex-col items-center gap-3 text-emerald-300"
                    >
                      <CheckCircle2 className="size-[clamp(4rem,12vw,6.5rem)]" />
                      <h1 className="text-[clamp(3rem,9vw,6rem)] font-black tracking-tight uppercase leading-none">Done</h1>
                    </motion.div>
                  ) : (
                    <>
                      <Timer className="size-[clamp(1.75rem,4vw,2.4rem)] text-sky-300/80" />
                      <div className={`mt-4 max-w-[78%] whitespace-nowrap ${timeTextSize} font-black tracking-tighter leading-none tabular-nums`}>
                        {displayTime}
                      </div>
                      <div className="mt-4 text-[clamp(0.65rem,1.3vw,0.75rem)] font-black uppercase tracking-[0.28em] text-white/35">
                        {remaining}% left
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/25">Elapsed</p>
                <p className="mt-1 text-2xl font-black tabular-nums">{Math.round(progress * 100)}%</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/25">Left</p>
                <p className="mt-1 text-2xl font-black tabular-nums">{remaining}%</p>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full max-w-2xl">
            <div className="flex items-center gap-4 text-white/30 font-bold uppercase tracking-[0.3em] text-sm mb-8">
              <Timer size={20} /> Quick Set
            </div>
            <div className="grid grid-cols-3 gap-4">
              {presets.map(m => (
                <button
                  key={m}
                  onPointerDown={() => onStart(m * 60)}
                  className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 active:scale-95 transition-all flex flex-col items-center gap-1"
                >
                  <span className="text-4xl font-black">{m}</span>
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Min</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <aside className="min-h-0 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 flex flex-col">
        <div className="flex items-center gap-4 text-white/30 font-bold uppercase tracking-[0.3em] text-sm">
          <Timer size={20} /> Timer
        </div>

        {hasTimer ? (
          <>
            <div className="mt-8">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-white/25">Status</p>
              <h2 className="mt-4 text-5xl font-black tracking-tight">{isFinished ? 'Complete' : isActive ? 'Running' : 'Paused'}</h2>
              <p className="mt-2 text-white/35 font-bold">{Math.round(progress * 100)}% elapsed</p>
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

            <div className="mt-auto flex items-center gap-4">
              {isFinished ? (
                <button
                  onPointerDown={onDismiss}
                  className="flex-1 py-6 rounded-[2rem] bg-white text-black text-2xl font-black uppercase tracking-widest shadow-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-3"
                >
                  <X size={34} strokeWidth={3} /> Clear
                </button>
              ) : (
                <>
                  <button
                    onPointerDown={isActive ? onPause : onResume}
                    className="p-7 rounded-full bg-white text-black shadow-2xl active:scale-90 transition-transform"
                  >
                    {isActive ? <Pause size={42} fill="currentColor" /> : <Play size={42} fill="currentColor" className="ml-1" />}
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
          </>
      ) : (
          <>
            <div className="mt-8">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-white/25">Custom duration</p>
              <p className="mt-3 text-white/35 font-bold">Set any short countdown without opening another control.</p>
            </div>
            
            <div className="mt-10 flex items-center justify-between rounded-[2rem] border border-white/5 bg-white/[0.03] p-5">
              <button onPointerDown={() => handleAdjustCustom(-1)} className="p-4 rounded-2xl bg-white/5 active:scale-90 transition-all"><Minus size={32} /></button>
              <div className="flex flex-col items-center">
                <span className="text-7xl font-black">{customMinutes}</span>
                <span className="text-white/20 font-bold uppercase text-xs">Minutes</span>
              </div>
              <button onPointerDown={() => handleAdjustCustom(1)} className="p-4 rounded-2xl bg-white/5 active:scale-90 transition-all"><Plus size={32} /></button>
            </div>

            <button 
              onPointerDown={() => onStart(customMinutes * 60)}
              className="mt-auto w-full py-6 rounded-[2rem] bg-white text-black font-black text-2xl uppercase tracking-widest active:scale-[0.98] transition-all shadow-xl"
            >
              Start
            </button>
          </>
      )}
      </aside>
    </motion.div>
  );
}

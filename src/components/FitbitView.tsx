import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Flame, Footprints, Heart, TrendingUp, Mountain } from 'lucide-react';
import { FitbitStats } from '@/types';

interface FitbitViewProps {
  stats: FitbitStats | null;
  loading: boolean;
  onClose: () => void;
}

export function FitbitView({ stats, loading, onClose }: FitbitViewProps) {
  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center gap-6 opacity-20">
        <Activity size={80} className="animate-pulse" />
        <p className="text-xl font-bold uppercase tracking-widest">Loading Fitbit...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center gap-6 opacity-20">
        <Activity size={80} />
        <p className="text-xl font-bold uppercase tracking-widest text-red-500">Fitbit Error</p>
        <p className="text-sm">Check your Refresh Token</p>
      </div>
    );
  }

  const stepProgress = Math.min(100, (stats.steps / stats.stepGoal) * 100);
  const floorProgress = Math.min(100, (stats.floors / stats.floorGoal) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full max-w-5xl flex flex-col items-center justify-center min-h-[600px] gap-8"
    >
      <div className="flex items-center gap-4 text-white/30 font-bold uppercase tracking-[0.3em] text-sm mb-2">
        <Activity size={20} /> Fitbit Today
      </div>

      <div className="grid grid-cols-2 gap-12 w-full">
        {/* Main Rings Section */}
        <div className="flex flex-col gap-8">
          {/* Steps Ring */}
          <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 flex items-center gap-8 relative overflow-hidden">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
                <circle cx="64" cy="64" r="54" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                <circle 
                  cx="64" cy="64" r="54" stroke="currentColor" strokeWidth="12" fill="transparent" 
                  strokeDasharray={339.3}
                  strokeDashoffset={339.3 - (339.3 * stepProgress) / 100}
                  strokeLinecap="round"
                  className="text-blue-500 transition-all duration-1000 ease-out" 
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Footprints size={32} className="text-blue-400" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-5xl font-black tabular-nums">{stats.steps.toLocaleString()}</p>
              <p className="text-white/30 font-bold uppercase tracking-widest text-sm">of {stats.stepGoal.toLocaleString()} steps</p>
            </div>
          </div>

          {/* Floors & Heart Rate Row */}
          <div className="grid grid-cols-2 gap-8">
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 flex flex-col gap-4">
              <div className="flex items-center gap-3 text-white/20">
                <Mountain size={24} />
                <span className="font-bold uppercase tracking-widest text-xs">Floors</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black">{stats.floors}</span>
                <span className="text-white/20 font-bold text-sm">/ {stats.floorGoal}</span>
              </div>
            </div>

            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 flex flex-col gap-4">
              <div className="flex items-center gap-3 text-white/20">
                <Heart size={24} />
                <span className="font-bold uppercase tracking-widest text-xs">Resting HR</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white/80">{stats.restingHeartRate}</span>
                <span className="text-white/20 font-bold text-sm">BPM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Other Stats */}
        <div className="flex flex-col gap-8">
          <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 flex flex-col justify-center h-full gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="p-4 rounded-2xl bg-orange-500/10 text-orange-500">
                  <Flame size={32} />
                </div>
                <div>
                  <p className="text-4xl font-black tabular-nums">{stats.calories.toLocaleString()}</p>
                  <p className="text-white/30 font-bold uppercase tracking-widest text-xs">Calories Burned</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="p-4 rounded-2xl bg-green-500/10 text-green-500">
                  <TrendingUp size={32} />
                </div>
                <div>
                  <p className="text-4xl font-black tabular-nums">{stats.activeMinutes}</p>
                  <p className="text-white/30 font-bold uppercase tracking-widest text-xs">Active Minutes</p>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/10">Last Synced</p>
              <p className="text-white/30 text-sm font-bold">{new Date(stats.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, X } from 'lucide-react';
import { SportMatch } from '@/types';

interface SportsViewProps {
  matches: SportMatch[];
  onClose: () => void;
}

export function SportsView({ matches, onClose }: SportsViewProps) {
  return (
    <motion.div
      key="sports-view"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full flex flex-col space-y-8"
    >
      <div className="flex items-center gap-4 text-white/30 font-bold uppercase tracking-[0.3em] text-sm">
        <Trophy size={20} /> Sports Scores
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pr-4 scrollbar-hide">
        {matches.length > 0 ? (
          matches.map((match) => (
            <div 
              key={match.id}
              className="bg-white/5 border border-white/5 rounded-3xl p-8 flex items-center justify-between gap-8"
            >
              {/* Home Team */}
              <div className="flex-1 flex items-center gap-6">
                <div className="text-right flex-1">
                  <p className="text-2xl font-black truncate">{match.homeTeam.name}</p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={match.homeTeam.logo} alt="" className="w-20 h-20 object-contain" />
              </div>

              {/* Score / Status */}
              <div className="flex flex-col items-center min-w-[120px]">
                {match.status === 'PRE' ? (
                  <div className="text-center">
                    <p className="text-3xl font-black">VS</p>
                    <p className="text-sm text-white/40 font-bold uppercase mt-1">
                      {new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="flex items-center gap-4">
                      <span className="text-5xl font-black">{match.homeScore}</span>
                      <span className="text-2xl text-white/20">-</span>
                      <span className="text-5xl font-black">{match.awayScore}</span>
                    </div>
                    <p className={`text-sm font-bold uppercase mt-2 ${match.status === 'IN' ? 'text-red-500 animate-pulse' : 'text-white/40'}`}>
                      {match.clock}
                    </p>
                  </div>
                )}
              </div>

              {/* Away Team */}
              <div className="flex-1 flex items-center gap-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={match.awayTeam.logo} alt="" className="w-20 h-20 object-contain" />
                <div className="text-left flex-1">
                  <p className="text-2xl font-black truncate">{match.awayTeam.name}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <Trophy size={80} />
            <p className="text-xl font-bold uppercase tracking-widest mt-4">No recent matches</p>
          </div>
        )}
      </div>

      <button
        onPointerDown={onClose}
        className="absolute top-0 right-0 p-6 text-white/20 hover:text-white/60 active:scale-90 transition-all"
      >
        <X size={48} />
      </button>
    </motion.div>
  );
}

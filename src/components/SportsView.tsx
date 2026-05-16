import React from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { SportMatch } from '@/types';

interface SportsViewProps {
  matches: SportMatch[];
  onClose: () => void;
}

function formatMatchDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function SportsView({ matches }: SportsViewProps) {
  return (
    <motion.div
      key="sports-view"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full flex flex-col space-y-6"
    >
      <div className="flex items-center gap-4 text-white/30 font-bold uppercase tracking-[0.3em] text-sm">
        <Trophy size={20} /> Sports Scores
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-hide">
        {matches.length > 0 ? (
          matches.map((match) => (
            <div 
              key={match.id}
              className="bg-white/5 border border-white/5 rounded-3xl p-6 flex items-center justify-between gap-4"
            >
              {/* Home Team */}
              <div className="flex-1 flex items-center gap-4 min-w-0">
                <div className="text-right flex-1 min-w-0">
                  <p className="text-xl font-black leading-tight break-words">{match.homeTeam.name}</p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={match.homeTeam.logo} alt="" className="w-14 h-14 object-contain shrink-0" />
              </div>

              {/* Score / Status */}
              <div className="flex flex-col items-center min-w-[120px] shrink-0">
                {match.status === 'PRE' ? (
                  <div className="text-center">
                    <p className="text-xl font-black text-white/20 uppercase tracking-tighter">Upcoming</p>
                    <p className="text-2xl font-black">
                      {new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </p>
                    <p className="text-xs text-white/40 font-bold uppercase mt-0.5">
                      {formatMatchDate(match.startTime)}
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl font-black">{match.homeTeam.score}</span>
                      <span className="text-xl text-white/20">-</span>
                      <span className="text-4xl font-black">{match.awayTeam.score}</span>
                    </div>
                    <p className={`text-xs font-bold uppercase mt-1.5 ${match.status === 'IN' ? 'text-red-500 animate-pulse' : 'text-white/40'}`}>
                      {match.status === 'POST' ? `Final • ${formatMatchDate(match.startTime)}` : match.clock}
                    </p>
                  </div>
                )}
              </div>

              {/* Away Team */}
              <div className="flex-1 flex items-center gap-4 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={match.awayTeam.logo} alt="" className="w-14 h-14 object-contain shrink-0" />
                <div className="text-left flex-1 min-w-0">
                  <p className="text-xl font-black leading-tight break-words">{match.awayTeam.name}</p>
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
    </motion.div>
  );
}

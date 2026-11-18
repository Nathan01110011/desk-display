import React from 'react';
import { Music, Play, Pause, SkipForward } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { SpotifyNowPlaying } from '@/types';
import { formatTime } from '@/lib/format';

interface SpotifyPlayerProps {
  spotify: SpotifyNowPlaying | null;
  onAction: (action: 'play' | 'pause' | 'next') => Promise<void>;
  compact?: boolean;
  portrait?: boolean;
}

export function SpotifyPlayer({ spotify, onAction, compact = false, portrait = false }: SpotifyPlayerProps) {
  if (!spotify || !spotify.title) {
    return (
      <div className={`w-full min-w-0 flex items-center ${portrait ? (compact ? 'gap-2' : 'gap-3 rounded-2xl border border-emerald-200/15 bg-gradient-to-br from-emerald-950/35 to-neutral-950 p-3') : compact ? 'gap-6' : 'gap-8 max-w-4xl rounded-3xl border border-emerald-200/15 bg-gradient-to-br from-emerald-950/35 to-neutral-950 p-6'}`}>
        <div className={`relative shrink-0 bg-white/5 border border-white/5 rounded-3xl flex items-center justify-center ${portrait ? (compact ? 'size-24' : 'size-32') : compact ? 'size-40' : 'size-[clamp(140px,18vw,220px)]'}`}>
          <Music size={portrait ? (compact ? 36 : 48) : compact ? 72 : 100} className="text-white/65" />
        </div>
        <div className={portrait ? 'min-w-0 flex-1 space-y-1' : 'flex-1 space-y-3'}>
          <h3 className={`${portrait ? (compact ? 'text-xl' : 'text-3xl') : compact ? 'text-4xl' : 'text-5xl'} font-black tracking-tighter text-white/60`}>Quiet mode</h3>
          <p className={`${portrait ? 'text-base' : compact ? 'text-lg' : 'text-2xl'} font-medium text-white/65 uppercase tracking-widest`}>No music playing</p>
        </div>
      </div>
    );
  }

  return (
    <div data-spotify-layout={portrait ? 'portrait' : 'landscape'} className={`w-full min-w-0 flex items-center ${portrait ? (compact ? 'gap-2' : 'gap-5 rounded-2xl border border-emerald-200/15 bg-gradient-to-br from-emerald-950/35 to-neutral-950 p-4') : compact ? 'gap-6' : 'gap-8 max-w-4xl rounded-3xl border border-emerald-200/15 bg-gradient-to-br from-emerald-950/35 to-neutral-950 p-6'}`}>
      <div className={`relative shrink-0 shadow-2xl rounded-3xl overflow-hidden border border-white/10 ${portrait ? (compact ? 'size-24' : 'size-44') : compact ? 'size-40' : 'size-[clamp(140px,18vw,220px)]'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={spotify.albumImageUrl} alt="Album Art" className="object-cover w-full h-full" />
      </div>

      <div className={`flex-1 flex flex-col justify-center min-w-0 ${portrait ? (compact ? 'gap-2' : 'gap-3') : 'space-y-4'}`}>
        <div className="space-y-1">
          <h3 className={`${portrait ? (compact ? 'text-lg' : 'text-[2rem]') : compact ? 'text-3xl' : 'text-4xl'} font-black tracking-tight leading-tight line-clamp-2`}>
            {spotify.title || "Inactive"}
          </h3>
          <p className={`${portrait ? (compact ? 'text-base' : 'text-lg') : compact ? 'text-base' : 'text-xl'} font-medium text-white/60 truncate`}>
            {spotify.artist || "No track playing"}
          </p>
        </div>

        {spotify.title && (
          <div className={portrait ? 'w-full space-y-1.5' : 'w-full space-y-4'}>
            <div className={portrait ? 'w-full space-y-1' : 'w-full space-y-2'}>
              <Progress value={spotify.durationMs > 0 ? Math.min(100, Math.max(0, (spotify.progressMs / spotify.durationMs) * 100)) : 0} className={portrait && !compact ? 'h-2.5 bg-white/10' : 'h-2 bg-white/10'} />
              <div className={portrait ? (compact ? 'flex justify-between text-sm font-mono text-white/70 tracking-wide' : 'flex justify-between text-base font-mono text-white/70 tracking-wide') : 'flex justify-between text-lg font-mono text-white/65 tracking-widest'}>
                <span>{formatTime(spotify.progressMs)}</span>
                <span>{formatTime(spotify.durationMs)}</span>
              </div>
            </div>

            <div className={`flex items-center ${portrait ? 'gap-2' : compact ? 'gap-4' : 'gap-6'}`}>
              <button
                aria-label={spotify.isPlaying ? 'Pause music' : 'Play music'} onPointerDown={() => onAction(spotify.isPlaying ? 'pause' : 'play')}
                className={`${portrait ? (compact ? 'p-3' : 'p-3.5') : 'p-5'} rounded-full bg-white text-black shadow-xl active:scale-90 transition-transform`}
              >
                {spotify.isPlaying ? <Pause size={portrait ? (compact ? 22 : 26) : compact ? 30 : 40} fill="currentColor" /> : <Play size={portrait ? (compact ? 22 : 26) : compact ? 30 : 40} fill="currentColor" className="ml-1" />}
              </button>
              <button
                aria-label="Next track" onPointerDown={() => onAction('next')}
                className={`${portrait ? (compact ? 'p-3' : 'p-3.5') : 'p-4'} rounded-full bg-white/10 text-white shadow-lg active:scale-90 transition-transform`}
              >
                <SkipForward size={portrait ? (compact ? 20 : 24) : compact ? 24 : 32} fill="currentColor" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

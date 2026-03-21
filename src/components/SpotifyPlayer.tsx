import React from 'react';
import { Music, Play, Pause, SkipForward } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { SpotifyNowPlaying } from '@/types';
import { formatTime } from '@/lib/format';

interface SpotifyPlayerProps {
  spotify: SpotifyNowPlaying | null;
  onAction: (action: 'play' | 'pause' | 'next') => Promise<void>;
}

export function SpotifyPlayer({ spotify, onAction }: SpotifyPlayerProps) {
  if (!spotify) {
    return (
      <div className="flex flex-col items-center gap-4 opacity-20 py-10">
        <Music size={80} />
        <p className="text-xl uppercase tracking-widest">Spotify Offline</p>
      </div>
    );
  }

  return (
    <div className="w-full flex items-center gap-10 max-w-4xl">
      <div className="relative w-[240px] h-[240px] shrink-0 shadow-2xl rounded-2xl overflow-hidden">
        {spotify.albumImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={spotify.albumImageUrl} alt="Album Art" className="object-cover w-full h-full" />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <Music size={80} className="text-white/10" />
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center space-y-6 min-w-0">
        <div className="space-y-1">
          <h3 className="text-4xl font-black tracking-tight leading-tight line-clamp-2">
            {spotify.title || "Inactive"}
          </h3>
          <p className="text-xl font-medium text-white/60 truncate">
            {spotify.artist || "No track playing"}
          </p>
        </div>

        {spotify.title && (
          <div className="w-full space-y-6">
            <div className="w-full space-y-2">
              <Progress value={(spotify.progressMs / spotify.durationMs) * 100} className="h-2 bg-white/10" />
              <div className="flex justify-between text-lg font-mono text-white/20 tracking-widest">
                <span>{formatTime(spotify.progressMs)}</span>
                <span>{formatTime(spotify.durationMs)}</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <button 
                onPointerDown={() => onAction(spotify.isPlaying ? 'pause' : 'play')}
                className="p-8 rounded-full bg-white text-black shadow-xl active:scale-90 transition-transform"
              >
                {spotify.isPlaying ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="ml-1" />}
              </button>
              <button 
                onPointerDown={() => onAction('next')}
                className="p-6 rounded-full bg-white/10 text-white shadow-lg active:scale-90 transition-transform"
              >
                <SkipForward size={32} fill="currentColor" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

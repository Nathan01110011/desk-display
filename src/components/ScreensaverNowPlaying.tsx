import { Music2 } from 'lucide-react';
import type { SpotifyNowPlaying } from '@/types';

interface ScreensaverNowPlayingProps {
  spotify: SpotifyNowPlaying | null;
  light?: boolean;
  className?: string;
}

// Decorative, view-only music status for the clock screensavers. Nothing here
// changes playback or intercepts the screensaver's tap-to-dismiss behaviour.
export function ScreensaverNowPlaying({ spotify, light = false, className = '' }: ScreensaverNowPlayingProps) {
  if (!spotify?.isPlaying || !spotify.title) return null;

  const progress = spotify.durationMs > 0
    ? Math.max(0, Math.min(100, spotify.progressMs / spotify.durationMs * 100))
    : 0;

  return (
    <div
      data-screensaver-now-playing
      className={`pointer-events-none flex w-full max-w-[440px] min-w-0 items-center gap-3 overflow-hidden rounded-2xl border p-3 shadow-lg ${light
        ? 'border-black/10 bg-white/55 text-[#252723]'
        : 'border-white/15 bg-white/[0.07] text-white'} ${className}`}
    >
      <div className="flex size-[clamp(52px,5vw,76px)] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/10">
        {spotify.albumImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={spotify.albumImageUrl} alt="" className="size-full object-cover" />
        ) : <Music2 size={28} aria-hidden="true" className="opacity-65" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-60">Now playing</span>
        <span className="truncate text-[clamp(14px,1.4vw,20px)] font-bold leading-tight" title={spotify.title}>{spotify.title}</span>
        <span className="truncate text-[clamp(12px,1.1vw,16px)] leading-tight opacity-70" title={spotify.artist}>{spotify.artist}</span>
        {spotify.durationMs > 0 && (
          <div className={`mt-1 h-1 w-full overflow-hidden rounded-full ${light ? 'bg-black/15' : 'bg-white/20'}`}>
            <div className={`h-full rounded-full ${light ? 'bg-[#454d44]' : 'bg-white/75'}`} style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

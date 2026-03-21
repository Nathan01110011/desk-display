export interface CalendarEvent {
  summary: string;
  start: string;
  end: string;
  location?: string;
  isAllDay: boolean;
}

export interface SpotifyNowPlaying {
  isPlaying: boolean;
  title: string;
  artist: string;
  album: string;
  albumImageUrl: string;
  progressMs: number;
  durationMs: number;
}

export type ViewState = 'dashboard' | 'pomodoro';

export type PomodoroMode = 'work' | 'break';

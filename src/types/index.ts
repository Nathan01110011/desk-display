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

export type ViewState = 'dashboard' | 'pomodoro' | 'settings' | 'sports';

export type PomodoroMode = 'work' | 'break';

export interface SportMatch {
  id: string;
  sport: 'soccer' | 'rugby';
  league: string;
  homeTeam: { name: string; logo: string; score: string };
  awayTeam: { name: string; logo: string; score: string };
  clock: string;
  status: 'PRE' | 'IN' | 'POST';
  startTime: string;
}

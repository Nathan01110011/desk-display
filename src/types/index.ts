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

export type ViewState = 'dashboard' | 'pomodoro' | 'settings' | 'sports' | 'weather';

export type PomodoroMode = 'work' | 'break';

export interface SportMatch {
  id: string;
  sport: 'soccer' | 'rugby' | 'football';
  league: string;
  homeTeam: { name: string; logo: string; score: string };
  awayTeam: { name: string; logo: string; score: string };
  clock: string;
  status: 'PRE' | 'IN' | 'POST';
  startTime: string;
}

export interface AppConfig {
  pomodoro: boolean;
  sports: boolean;
  weather: boolean;
}

export interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
  location: string;
  timezone: number; // Offset in seconds
  forecast: {
    time: string;
    temp: number;
    condition: string;
    icon: string;
  }[];
}

export interface AdditionalClock {
  id: string;
  label: string;
  city: string;
  offset: number; // Offset in seconds from UTC
}

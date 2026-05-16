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

export type ViewState = 'dashboard' | 'calendar' | 'pomodoro' | 'settings' | 'sports' | 'weather' | 'fitbit' | 'home' | 'timer' | 'todo' | 'rule';

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

export interface SmartDevice {
  id: string;
  type: 'wiz' | 'tapo';
  name: string;
  isOn: boolean;
  loading?: boolean;
  isOffline?: boolean;
  brightness?: number; // 10-100
  colorTemp?: number; // 2200-6500
  color?: { r: number; g: number; b: number };
}

export interface AppConfig {
  calendar: boolean;
  pomodoro: boolean;
  sports: boolean;
  weather: boolean;
  fitbit: boolean;
  home: boolean;
  timer: boolean;
  todo: boolean;
  rule: boolean;
  appOrder?: ('calendar' | 'pomodoro' | 'sports' | 'weather' | 'fitbit' | 'home' | 'timer' | 'todo' | 'rule')[];
}

export interface FitbitStats {
  steps: number;
  stepGoal: number;
  floors: number;
  floorGoal: number;
  calories: number;
  activeMinutes: number;
  restingHeartRate: number;
  lastSyncTime: string;
}

export interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
  location: string;
  timezone: number; // Offset in seconds
  unit?: 'C' | 'F';
  sunrise?: string;
  sunset?: string;
  forecast: {
    time: string;
    date: string;
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

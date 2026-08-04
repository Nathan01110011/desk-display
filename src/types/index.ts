export interface CalendarEvent {
  id?: string;
  etag?: string;
  calendarType?: 'work' | 'personal';
  summary: string;
  start: string;
  end: string;
  location?: string;
  isAllDay: boolean;
  recurrence?: 'none' | 'weekly' | 'monthly' | 'yearly';
}

export interface CalendarEventInput {
  id?: string;
  etag?: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  isAllDay: boolean;
  recurrence?: 'none' | 'weekly' | 'monthly' | 'yearly';
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

export type ViewState = 'dashboard' | 'calendar' | 'gallery' | 'pomodoro' | 'settings' | 'sports' | 'weather' | 'fitbit' | 'home' | 'timer' | 'todo' | 'rule';

export type PomodoroMode = 'work' | 'break';

export type SportKind = 'soccer' | 'rugby' | 'football';

export interface SportLeagueConfig {
  sport: SportKind;
  id: string;
  name: string;
}

export interface SportTeamConfig {
  id?: string;
  name: string;
  shortName?: string;
  logo?: string;
  leagueId?: string;
  leagueName?: string;
  sport?: SportKind;
  aliases?: string[];
}

export interface SportsConfig {
  leagues: SportLeagueConfig[];
  teams: SportTeamConfig[];
  daysBack: number;
  daysAhead: number;
}

export interface SportTeamSearchResult extends SportTeamConfig {
  leagueName: string;
}

export interface SportMatch {
  id: string;
  sport: SportKind;
  league: string;
  homeTeam: { id?: string; name: string; shortName?: string; logo: string; score: string; winner?: boolean };
  awayTeam: { id?: string; name: string; shortName?: string; logo: string; score: string; winner?: boolean };
  clock: string;
  status: 'PRE' | 'IN' | 'POST';
  startTime: string;
  venue?: string;
  detail?: string;
  possession?: string;
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
  sceneId?: number;
  speed?: number; // 20-200
}

export interface AppConfig {
  calendar: boolean;
  gallery: boolean;
  pomodoro: boolean;
  sports: boolean;
  weather: boolean;
  fitbit: boolean;
  home: boolean;
  timer: boolean;
  todo: boolean;
  rule: boolean;
  appOrder?: ('calendar' | 'gallery' | 'pomodoro' | 'sports' | 'weather' | 'fitbit' | 'home' | 'timer' | 'todo' | 'rule')[];
}

export interface RuleLockSettings {
  lockOnOpen: boolean;
  lockOnInactivity: boolean;
  timeoutMinutes: number;
}

export type ScreensaverType = 'clock' | 'photos';
export type ScreensaverPhotoSource = 'all' | 'favorites';

export interface GalleryPhoto {
  name: string;
  url: string;
  favorite: boolean;
}

export type ScreensaverPhoto = GalleryPhoto;

export interface FitbitStats {
  steps: number;
  stepGoal: number | null;
  stepGoalSource?: 'configured' | 'none';
  stepsLastSampleTime?: string;
  floors: number;
  floorGoal: number;
  calories: number;
  activeMinutes: number;
  restingHeartRate: number;
  sleepMinutes: number;
  exerciseDays: number;
  exerciseHistory: {
    date: string;
    exercised: boolean;
  }[];
  bloodOxygen: number;
  weightHistory: {
    date: string;
    weightKg: number;
  }[];
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
  timeZone?: string; // IANA timezone, used when available so DST is handled
  displayTime?: string;
}

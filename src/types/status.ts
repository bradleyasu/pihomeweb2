/** Types for the PiHome status websocket/API responses */

export interface PiHomeStatus {
  type: 'status';
  status: 'online' | 'offline';
  wallpaper: WallpaperStatus;
  weather: WeatherStatus;
  now_playing: NowPlayingStatus;
  timers: TimerStatus[];
  screens: ScreensStatus;
  tasks: TaskStatus[];
}

export interface WallpaperStatus {
  current: string;
  source: string;
  allow_stretch: boolean;
}

export interface WeatherStatus {
  weather_code: number;
  temperature: number;
  humidity: number;
  uv_index: number;
  wind_speed: number;
  precip_propability: number;
  future: WeatherForecast[];
}

export interface WeatherForecast {
  startTime: string;
  values: {
    weatherCodeDay: number;
    weatherCodeNight: number;
    sunriseTime: string;
    sunsetTime: string;
  };
}

export interface NowPlayingStatus {
  is_playing: boolean;
  title: string;
  artist: string;
  album: string;
  has_artwork: boolean;
}

export interface TimerStatus {
  label: string;
  end_time: number;
  duration: number;
  elapsed_time: number;
}

export interface ScreensStatus {
  current: string;
  screens: ScreenEntry[];
}

/** Each screen entry is an object with one key (the screen id) mapping to its config */
export type ScreenEntry = Record<string, ScreenConfig>;

export interface ScreenConfig {
  label: string;
  requires_pin: boolean;
  hidden: boolean;
  icon: string;
}

export interface TaskStatus {
  id: string;
  name: string;
  description: string;
  status: 'PENDING' | 'PRE_IN_PROGRESS' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  start_time?: string;
  state_id?: string;
  trigger_state?: string;
  repeat_days?: number;
  on_run?: EventPayload;
  on_confirm?: EventPayload;
  on_cancel?: EventPayload;
  is_passive?: boolean;
}

/** Generic event payload — always has a type, plus arbitrary fields */
export interface EventPayload {
  type: string;
  [key: string]: unknown;
}

/** Settings are organized as sections containing key-value string pairs */
export type SettingsData = Record<string, Record<string, string>>;

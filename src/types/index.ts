export type {
  PiHomeStatus,
  WallpaperStatus,
  WeatherStatus,
  WeatherForecast,
  NowPlayingStatus,
  TimerStatus,
  ScreensStatus,
  ScreenEntry,
  ScreenConfig,
  TaskStatus,
  EventPayload,
  SettingsData,
} from './status.ts';

/**
 * Raw event definition as returned by the introspection API.
 *
 * Each definition is a flat object like:
 *   { type: "display", title: { type: "string", required: true, description: "..." }, ... }
 *
 * The "type" key holds the event name; all other keys are field definitions.
 */
export type RawEventDef = Record<string, unknown>;

/** A single field extracted and normalised from a raw introspection definition */
export interface FieldDef {
  name: string;
  /** Lowercased field type: string, integer, number, boolean, list, object, json, dict, event, event_list, color, option */
  type: string;
  required: boolean;
  description: string | null;
  /** For "option" type: array of values, or dict of value→label */
  options?: string[] | Record<string, string>;
}

/** Normalised event definition with parsed fields */
export interface EventDef {
  type: string;
  fields: FieldDef[];
}

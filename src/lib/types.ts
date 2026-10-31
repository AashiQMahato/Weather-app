export interface Place {
  id: string;
  name: string;
  /** Name in Nepali (Devanagari), when known. */
  localName?: string;
  /** Region and country, e.g. "Bagmati Province, Nepal". */
  subtitle: string;
  latitude: number;
  longitude: number;
  /** ISO 3166-1 alpha-2, when known. */
  countryCode?: string;
}

export type Units = 'metric' | 'imperial';
export type ClockFormat = '12' | '24';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface CurrentConditions {
  time: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  dewPoint: number;
  isDay: boolean;
  precipitation: number;
  weatherCode: number;
  cloudCover: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  visibility: number;
  uvIndex: number;
}

export interface HourlyPoint {
  time: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  dewPoint: number;
  precipitationProbability: number;
  precipitation: number;
  weatherCode: number;
  isDay: boolean;
  uvIndex: number;
  visibility: number;
  cloudCover: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
}

export interface DailyPoint {
  date: string;
  weatherCode: number;
  max: number;
  min: number;
  feelsMax: number;
  feelsMin: number;
  sunrise: string;
  sunset: string;
  daylightSeconds: number;
  uvIndexMax: number;
  precipitationSum: number;
  precipitationHours: number;
  precipitationProbability: number;
  windSpeedMax: number;
  windGustsMax: number;
  windDirection: number;
}

export interface AirQualityHour {
  time: string;
  usAqi: number | null;
}

export interface AirQuality {
  usAqi: number | null;
  europeanAqi: number | null;
  pm2_5: number | null;
  pm10: number | null;
  ozone: number | null;
  nitrogenDioxide: number | null;
  carbonMonoxide: number | null;
  sulphurDioxide: number | null;
  /** Next 24 hours of US AQI. */
  hourly: AirQualityHour[];
}

export interface WeatherReport {
  timezone: string;
  utcOffsetSeconds: number;
  elevation: number;
  current: CurrentConditions;
  /** Next 48 hours, starting at the current hour. */
  hourly: HourlyPoint[];
  /** 14 days, starting today. */
  daily: DailyPoint[];
  airQuality: AirQuality | null;
  fetchedAt: string;
}

export interface CityNow {
  place: Place;
  time: string | null;
  utcOffsetSeconds: number;
  temperature: number | null;
  weatherCode: number;
  isDay: boolean;
  max: number | null;
  min: number | null;
}

export interface OfficialAlert {
  id: string;
  event: string;
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
  headline: string;
  description: string;
  instruction: string | null;
  areas: string;
  onset: string | null;
  expires: string | null;
  sender: string;
}

export interface AlertsResponse {
  /** Whether an official alert feed covers this location. */
  supported: boolean;
  source: { name: string; url: string } | null;
  alerts: OfficialAlert[];
  /** Guidance shown when no feed covers the location. */
  note: string | null;
}

export interface GridPoint {
  latitude: number;
  longitude: number;
  temperature: number;
  windSpeed: number;
  windDirection: number;
  cloudCover: number;
  precipitation: number;
  precipitationProbability: number;
}

export interface RadarFrames {
  host: string;
  frames: { time: number; path: string }[];
  nowcastStart: number;
}

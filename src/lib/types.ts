export interface Place {
  id: string;
  name: string;
  /** Region and country, e.g. "England, United Kingdom". */
  subtitle: string;
  latitude: number;
  longitude: number;
}

export type Units = 'metric' | 'imperial';

export interface CurrentConditions {
  time: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  isDay: boolean;
  precipitation: number;
  weatherCode: number;
  cloudCover: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
}

export interface HourlyPoint {
  time: string;
  temperature: number;
  precipitationProbability: number;
  weatherCode: number;
  isDay: boolean;
  uvIndex: number;
  visibility: number;
  dewPoint: number;
}

export interface DailyPoint {
  date: string;
  weatherCode: number;
  max: number;
  min: number;
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
  precipitationSum: number;
  precipitationProbability: number;
  windSpeedMax: number;
}

export interface AirQuality {
  usAqi: number | null;
  pm2_5: number | null;
  pm10: number | null;
  ozone: number | null;
  nitrogenDioxide: number | null;
}

export interface WeatherReport {
  timezone: string;
  current: CurrentConditions;
  /** Next 24 hours, starting at the current hour. */
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  airQuality: AirQuality | null;
}

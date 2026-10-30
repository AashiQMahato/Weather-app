import 'server-only';
import type { AirQuality, CityNow, DailyPoint, HourlyPoint, Place, WeatherReport } from './types';

// Open-Meteo is free for non-commercial use and needs no API key.
// https://open-meteo.com/en/docs
// Base URLs can be overridden in .env (see .env.example).
const FORECAST_URL = process.env.OPEN_METEO_FORECAST_URL || 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_URL = process.env.OPEN_METEO_GEOCODING_URL || 'https://geocoding-api.open-meteo.com/v1/search';
const AIR_QUALITY_URL = process.env.OPEN_METEO_AIR_QUALITY_URL || 'https://air-quality-api.open-meteo.com/v1/air-quality';
const REVERSE_GEOCODING_URL =
  process.env.REVERSE_GEOCODING_URL || 'https://api.bigdatacloud.net/data/reverse-geocode-client';

/** Seconds to cache upstream responses on the server. */
const REVALIDATE = 600;

export class WeatherApiError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
    this.name = 'WeatherApiError';
  }
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { signal, next: { revalidate: REVALIDATE } });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    console.error('Upstream request failed:', url, error);
    throw new WeatherApiError('Could not reach the weather service. Try again shortly.', 503);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { reason?: string } | null;
    throw new WeatherApiError(
      body?.reason ?? `Weather service responded with ${response.status}.`,
      response.status === 400 ? 400 : 502,
    );
  }
  return response.json() as Promise<T>;
}

interface GeocodingResponse {
  results?: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string;
  }[];
}

async function geocode(query: string, countryCode?: string, language = 'en'): Promise<Place[]> {
  const params = new URLSearchParams({ name: query, count: '10', language, format: 'json' });
  if (countryCode) params.set('countryCode', countryCode);
  const data = await getJson<GeocodingResponse>(`${GEOCODING_URL}?${params}`);
  return (data.results ?? []).map((r) => ({
    id: String(r.id),
    name: r.name,
    subtitle: [r.admin1, r.country].filter(Boolean).join(', '),
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

/** Places in `focusCountry` come first, then matches from the rest of the world. */
export async function searchPlaces(query: string, focusCountry = 'NP'): Promise<Place[]> {
  const [local, localNe, global] = await Promise.all([
    geocode(query, focusCountry),
    // Same search in Nepali, only to pick up Devanagari names.
    geocode(query, focusCountry, 'ne').catch(() => [] as Place[]),
    geocode(query),
  ]);
  const nepaliNames = new Map(localNe.map((p) => [p.id, p.name]));
  const withNames = local.map((p) => {
    const localName = nepaliNames.get(p.id);
    return localName && localName !== p.name ? { ...p, localName } : p;
  });
  const seen = new Set(local.map((p) => p.id));
  return [...withNames, ...global.filter((p) => !seen.has(p.id))].slice(0, 10);
}

interface ReverseGeocodingResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
}

/** Best-effort name for a coordinate; falls back to a generic label. */
export async function placeFromCoords(latitude: number, longitude: number): Promise<Place> {
  const fallback: Place = {
    id: `${latitude.toFixed(3)},${longitude.toFixed(3)}`,
    name: 'My location',
    subtitle: `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
    latitude,
    longitude,
  };
  try {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      localityLanguage: 'en',
    });
    const data = await getJson<ReverseGeocodingResponse>(`${REVERSE_GEOCODING_URL}?${params}`);
    const name = data.city || data.locality;
    if (!name) return fallback;
    return {
      ...fallback,
      name,
      subtitle: [data.principalSubdivision, data.countryName].filter(Boolean).join(', '),
    };
  } catch {
    return fallback;
  }
}

interface ForecastResponse {
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: (number | null)[];
    weather_code: number[];
    is_day: number[];
    uv_index: (number | null)[];
    visibility: (number | null)[];
    dew_point_2m: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: (number | null)[];
    precipitation_sum: (number | null)[];
    precipitation_probability_max: (number | null)[];
    wind_speed_10m_max: number[];
  };
}

interface AirQualityResponse {
  current?: {
    us_aqi?: number | null;
    pm2_5?: number | null;
    pm10?: number | null;
    ozone?: number | null;
    nitrogen_dioxide?: number | null;
  };
}

async function getAirQuality(place: Pick<Place, 'latitude' | 'longitude'>, signal?: AbortSignal): Promise<AirQuality | null> {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: 'us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide',
    timezone: 'auto',
  });
  try {
    const data = await getJson<AirQualityResponse>(`${AIR_QUALITY_URL}?${params}`, signal);
    if (!data.current) return null;
    return {
      usAqi: data.current.us_aqi ?? null,
      pm2_5: data.current.pm2_5 ?? null,
      pm10: data.current.pm10 ?? null,
      ozone: data.current.ozone ?? null,
      nitrogenDioxide: data.current.nitrogen_dioxide ?? null,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    // Air quality is a nice-to-have; never fail the whole report over it.
    return null;
  }
}

export async function getWeather(place: Pick<Place, 'latitude' | 'longitude'>, signal?: AbortSignal): Promise<WeatherReport> {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'weather_code',
      'cloud_cover',
      'pressure_msl',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
    ].join(','),
    hourly: [
      'temperature_2m',
      'precipitation_probability',
      'weather_code',
      'is_day',
      'uv_index',
      'visibility',
      'dew_point_2m',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
      'uv_index_max',
      'precipitation_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
    ].join(','),
    timezone: 'auto',
    forecast_days: '10',
  });

  const [forecast, airQuality] = await Promise.all([
    getJson<ForecastResponse>(`${FORECAST_URL}?${params}`, signal),
    getAirQuality(place, signal),
  ]);

  const { current, hourly, daily } = forecast;

  // Times are local to the place ("YYYY-MM-DDTHH:MM"), so string comparison is safe.
  const currentHour = `${current.time.slice(0, 13)}:00`;
  const start = Math.max(0, hourly.time.findIndex((t) => t >= currentHour));
  const hourlyPoints: HourlyPoint[] = hourly.time.slice(start, start + 24).map((time, j) => {
    const i = start + j;
    return {
      time,
      temperature: hourly.temperature_2m[i],
      precipitationProbability: hourly.precipitation_probability[i] ?? 0,
      weatherCode: hourly.weather_code[i],
      isDay: hourly.is_day[i] === 1,
      uvIndex: hourly.uv_index[i] ?? 0,
      visibility: hourly.visibility[i] ?? 0,
      dewPoint: hourly.dew_point_2m[i],
    };
  });

  const dailyPoints: DailyPoint[] = daily.time.map((date, i) => ({
    date,
    weatherCode: daily.weather_code[i],
    max: daily.temperature_2m_max[i],
    min: daily.temperature_2m_min[i],
    sunrise: daily.sunrise[i],
    sunset: daily.sunset[i],
    uvIndexMax: daily.uv_index_max[i] ?? 0,
    precipitationSum: daily.precipitation_sum[i] ?? 0,
    precipitationProbability: daily.precipitation_probability_max[i] ?? 0,
    windSpeedMax: daily.wind_speed_10m_max[i],
  }));

  return {
    timezone: forecast.timezone,
    current: {
      time: current.time,
      temperature: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      isDay: current.is_day === 1,
      precipitation: current.precipitation,
      weatherCode: current.weather_code,
      cloudCover: current.cloud_cover,
      pressure: current.pressure_msl,
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      windGusts: current.wind_gusts_10m,
    },
    hourly: hourlyPoints,
    daily: dailyPoints,
    airQuality,
  };
}

interface MultiCurrentResponse {
  current: { temperature_2m: number; weather_code: number; is_day: number };
}

/** Current temperature and condition for many places in a single request. */
export async function getCurrentForPlaces(places: Place[]): Promise<CityNow[]> {
  const params = new URLSearchParams({
    latitude: places.map((p) => p.latitude).join(','),
    longitude: places.map((p) => p.longitude).join(','),
    current: 'temperature_2m,weather_code,is_day',
    timezone: 'auto',
  });
  const data = await getJson<MultiCurrentResponse | MultiCurrentResponse[]>(`${FORECAST_URL}?${params}`);
  const list = Array.isArray(data) ? data : [data];
  return places.map((place, i) => ({
    place,
    temperature: list[i]?.current.temperature_2m ?? null,
    weatherCode: list[i]?.current.weather_code ?? 3,
    isDay: list[i]?.current.is_day === 1,
  }));
}

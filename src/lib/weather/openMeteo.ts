import 'server-only';
import type { AirQuality, CityNow, DailyPoint, GridPoint, HourlyPoint, Place, WeatherReport } from '../types';

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
const FORECAST_DAYS = 14;

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
    response = await fetch(url, { signal: signal ?? AbortSignal.timeout(12_000), next: { revalidate: REVALIDATE } });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    console.error('Upstream request failed:', url.split('?')[0], error);
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

type Coords = Pick<Place, 'latitude' | 'longitude'>;

/* ------------------------------------------------------------------ places */

interface GeocodingResponse {
  results?: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    country_code?: string;
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
    countryCode: r.country_code,
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

/** Best single match for a free-text place name, Nepal first. */
export async function findPlace(query: string): Promise<Place | null> {
  const results = await searchPlaces(query);
  return results[0] ?? null;
}

interface ReverseGeocodingResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
  countryCode?: string;
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
      countryCode: data.countryCode,
    };
  } catch {
    return fallback;
  }
}

/* ----------------------------------------------------------------- weather */

const CURRENT_VARS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'dew_point_2m',
  'is_day',
  'precipitation',
  'weather_code',
  'cloud_cover',
  'pressure_msl',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'visibility',
  'uv_index',
] as const;

const HOURLY_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'dew_point_2m',
  'precipitation_probability',
  'precipitation',
  'weather_code',
  'is_day',
  'uv_index',
  'visibility',
  'cloud_cover',
  'pressure_msl',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
] as const;

const DAILY_VARS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'apparent_temperature_max',
  'apparent_temperature_min',
  'sunrise',
  'sunset',
  'daylight_duration',
  'uv_index_max',
  'precipitation_sum',
  'precipitation_hours',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
  'wind_direction_10m_dominant',
] as const;

type Series<K extends string> = { time: string[] } & Record<K, (number | null)[]>;

interface ForecastResponse {
  timezone: string;
  utc_offset_seconds: number;
  elevation: number;
  current: { time: string } & Record<(typeof CURRENT_VARS)[number], number | null>;
  hourly: Series<(typeof HOURLY_VARS)[number]>;
  daily: Omit<Series<(typeof DAILY_VARS)[number]>, 'sunrise' | 'sunset'> & { sunrise: string[]; sunset: string[] };
}

interface AirQualityResponse {
  current?: Record<string, number | null | string>;
  hourly?: { time: string[]; us_aqi?: (number | null)[] };
}

const n = (value: number | null | undefined, fallback = 0) => (typeof value === 'number' ? value : fallback);

/** Index of the first hourly slot at or after the current hour (times are local strings). */
function startIndex(times: string[], currentTime: string) {
  const currentHour = `${currentTime.slice(0, 13)}:00`;
  return Math.max(0, times.findIndex((t) => t >= currentHour));
}

async function getAirQuality(coords: Coords, signal?: AbortSignal): Promise<AirQuality | null> {
  const params = new URLSearchParams({
    latitude: String(coords.latitude),
    longitude: String(coords.longitude),
    current: 'us_aqi,european_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,carbon_monoxide,sulphur_dioxide',
    hourly: 'us_aqi',
    forecast_days: '2',
    timezone: 'auto',
  });
  try {
    const data = await getJson<AirQualityResponse>(`${AIR_QUALITY_URL}?${params}`, signal);
    const c = data.current;
    if (!c) return null;
    const num = (key: string) => (typeof c[key] === 'number' ? (c[key] as number) : null);
    const times = data.hourly?.time ?? [];
    const start = typeof c.time === 'string' ? startIndex(times, c.time) : 0;
    return {
      usAqi: num('us_aqi'),
      europeanAqi: num('european_aqi'),
      pm2_5: num('pm2_5'),
      pm10: num('pm10'),
      ozone: num('ozone'),
      nitrogenDioxide: num('nitrogen_dioxide'),
      carbonMonoxide: num('carbon_monoxide'),
      sulphurDioxide: num('sulphur_dioxide'),
      hourly: times.slice(start, start + 24).map((time, j) => ({ time, usAqi: data.hourly?.us_aqi?.[start + j] ?? null })),
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    // Air quality is a nice-to-have; never fail the whole report over it.
    return null;
  }
}

export async function getWeather(coords: Coords, signal?: AbortSignal): Promise<WeatherReport> {
  const params = new URLSearchParams({
    latitude: coords.latitude.toFixed(4),
    longitude: coords.longitude.toFixed(4),
    current: CURRENT_VARS.join(','),
    hourly: HOURLY_VARS.join(','),
    daily: DAILY_VARS.join(','),
    timezone: 'auto',
    forecast_days: String(FORECAST_DAYS),
  });

  const [forecast, airQuality] = await Promise.all([
    getJson<ForecastResponse>(`${FORECAST_URL}?${params}`, signal),
    getAirQuality(coords, signal),
  ]);

  const { current: c, hourly: h, daily: d } = forecast;
  const start = startIndex(h.time, c.time);

  const hourly: HourlyPoint[] = h.time.slice(start, start + 48).map((time, j) => {
    const i = start + j;
    return {
      time,
      temperature: n(h.temperature_2m[i]),
      feelsLike: n(h.apparent_temperature[i]),
      humidity: n(h.relative_humidity_2m[i]),
      dewPoint: n(h.dew_point_2m[i]),
      precipitationProbability: n(h.precipitation_probability[i]),
      precipitation: n(h.precipitation[i]),
      weatherCode: n(h.weather_code[i]),
      isDay: h.is_day[i] === 1,
      uvIndex: n(h.uv_index[i]),
      visibility: n(h.visibility[i], 10_000),
      cloudCover: n(h.cloud_cover[i]),
      pressure: n(h.pressure_msl[i], 1013),
      windSpeed: n(h.wind_speed_10m[i]),
      windDirection: n(h.wind_direction_10m[i]),
      windGusts: n(h.wind_gusts_10m[i]),
    };
  });

  const daily: DailyPoint[] = d.time.map((date, i) => ({
    date,
    weatherCode: n(d.weather_code[i]),
    max: n(d.temperature_2m_max[i]),
    min: n(d.temperature_2m_min[i]),
    feelsMax: n(d.apparent_temperature_max[i]),
    feelsMin: n(d.apparent_temperature_min[i]),
    sunrise: d.sunrise[i],
    sunset: d.sunset[i],
    daylightSeconds: n(d.daylight_duration[i]),
    uvIndexMax: n(d.uv_index_max[i]),
    precipitationSum: n(d.precipitation_sum[i]),
    precipitationHours: n(d.precipitation_hours[i]),
    precipitationProbability: n(d.precipitation_probability_max[i]),
    windSpeedMax: n(d.wind_speed_10m_max[i]),
    windGustsMax: n(d.wind_gusts_10m_max[i]),
    windDirection: n(d.wind_direction_10m_dominant[i]),
  }));

  return {
    timezone: forecast.timezone,
    utcOffsetSeconds: forecast.utc_offset_seconds ?? 0,
    elevation: forecast.elevation ?? 0,
    current: {
      time: c.time,
      temperature: n(c.temperature_2m),
      feelsLike: n(c.apparent_temperature),
      humidity: n(c.relative_humidity_2m),
      dewPoint: n(c.dew_point_2m, hourly[0]?.dewPoint ?? 0),
      isDay: c.is_day === 1,
      precipitation: n(c.precipitation),
      weatherCode: n(c.weather_code),
      cloudCover: n(c.cloud_cover),
      pressure: n(c.pressure_msl, 1013),
      windSpeed: n(c.wind_speed_10m),
      windDirection: n(c.wind_direction_10m),
      windGusts: n(c.wind_gusts_10m),
      visibility: n(c.visibility, hourly[0]?.visibility ?? 10_000),
      uvIndex: n(c.uv_index, hourly[0]?.uvIndex ?? 0),
    },
    hourly,
    daily,
    airQuality,
    fetchedAt: new Date().toISOString(),
  };
}

interface MultiCurrentResponse {
  utc_offset_seconds?: number;
  current: { time: string; temperature_2m: number; weather_code: number; is_day: number };
  daily?: { temperature_2m_max: number[]; temperature_2m_min: number[] };
}

/** Current conditions for many places in a single request. */
export async function getCurrentForPlaces(places: Place[]): Promise<CityNow[]> {
  if (places.length === 0) return [];
  const params = new URLSearchParams({
    latitude: places.map((p) => p.latitude.toFixed(4)).join(','),
    longitude: places.map((p) => p.longitude.toFixed(4)).join(','),
    current: 'temperature_2m,weather_code,is_day',
    daily: 'temperature_2m_max,temperature_2m_min',
    forecast_days: '1',
    timezone: 'auto',
  });
  const data = await getJson<MultiCurrentResponse | MultiCurrentResponse[]>(`${FORECAST_URL}?${params}`);
  const list = Array.isArray(data) ? data : [data];
  return places.map((place, i) => {
    const item = list[i];
    return {
      place,
      time: item?.current.time ?? null,
      utcOffsetSeconds: item?.utc_offset_seconds ?? 0,
      temperature: item?.current.temperature_2m ?? null,
      weatherCode: item?.current.weather_code ?? 3,
      isDay: item?.current.is_day === 1,
      max: item?.daily?.temperature_2m_max[0] ?? null,
      min: item?.daily?.temperature_2m_min[0] ?? null,
    };
  });
}

interface GridResponse {
  latitude: number;
  longitude: number;
  current: { temperature_2m: number; wind_speed_10m: number; wind_direction_10m: number; cloud_cover: number; precipitation: number };
  hourly?: { precipitation_probability?: (number | null)[] };
}

/** Samples current conditions on an evenly spaced grid inside the bounds. */
export async function getGrid(
  bounds: { south: number; west: number; north: number; east: number },
  size: number,
): Promise<GridPoint[]> {
  const lats: number[] = [];
  const lons: number[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      lats.push(bounds.south + ((r + 0.5) / size) * (bounds.north - bounds.south));
      lons.push(bounds.west + ((c + 0.5) / size) * (bounds.east - bounds.west));
    }
  }
  const params = new URLSearchParams({
    latitude: lats.map((v) => v.toFixed(2)).join(','),
    longitude: lons.map((v) => v.toFixed(2)).join(','),
    current: 'temperature_2m,wind_speed_10m,wind_direction_10m,cloud_cover,precipitation',
    hourly: 'precipitation_probability',
    forecast_hours: '1',
    timezone: 'GMT',
  });
  const data = await getJson<GridResponse | GridResponse[]>(`${FORECAST_URL}?${params}`);
  const list = Array.isArray(data) ? data : [data];
  return list.map((item, i) => ({
    latitude: lats[i],
    longitude: lons[i],
    temperature: item.current.temperature_2m,
    windSpeed: item.current.wind_speed_10m,
    windDirection: item.current.wind_direction_10m,
    cloudCover: item.current.cloud_cover,
    precipitation: item.current.precipitation,
    precipitationProbability: item.hourly?.precipitation_probability?.[0] ?? 0,
  }));
}

import type { CityNow, Place, WeatherReport } from './types';

// Browser-side client for this app's own /api routes. The routes talk to
// Open-Meteo on the server, so upstream URLs live in server env vars only.

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error('Could not reach the server. Check your connection.');
  }
  const body = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok || body === null) {
    throw new Error(body?.error ?? `Request failed (${response.status}).`);
  }
  return body;
}

const coords = (latitude: number, longitude: number) =>
  new URLSearchParams({ lat: String(latitude), lon: String(longitude) });

export function getWeather(place: Place, signal?: AbortSignal) {
  return getJson<WeatherReport>(`/api/weather?${coords(place.latitude, place.longitude)}`, signal);
}

export function searchPlaces(query: string, signal?: AbortSignal) {
  return getJson<Place[]>(`/api/places?${new URLSearchParams({ q: query })}`, signal);
}

export function placeFromCoords(latitude: number, longitude: number) {
  return getJson<Place>(`/api/places/reverse?${coords(latitude, longitude)}`);
}

export function getNepalCities(signal?: AbortSignal) {
  return getJson<CityNow[]>('/api/nepal', signal);
}

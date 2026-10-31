import type { ChatEvent, CompareResponse, InsightsResponse } from './groq/schemas';
import type { AlertsResponse, CityNow, ClockFormat, GridPoint, Place, RadarFrames, Units, WeatherReport } from './types';

// Browser-side client for this app's own /api routes. The routes talk to
// upstream providers on the server, so URLs and keys stay in server env vars.

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('Could not reach the server. Check your connection.', 0);
  }
  const body = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok || body === null) {
    throw new ApiError(body?.error ?? `Request failed (${response.status}).`, response.status);
  }
  return body;
}

const post = (body: unknown, signal?: AbortSignal): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
  signal,
});

const coords = (latitude: number, longitude: number) =>
  new URLSearchParams({ lat: latitude.toFixed(4), lon: longitude.toFixed(4) });

const placeInput = (p: Place) => ({ name: p.name, latitude: p.latitude, longitude: p.longitude });

export function getWeather(place: Place, signal?: AbortSignal) {
  return request<WeatherReport>(`/api/weather?${coords(place.latitude, place.longitude)}`, { signal });
}

export function searchPlaces(query: string, signal?: AbortSignal) {
  return request<Place[]>(`/api/places?${new URLSearchParams({ q: query })}`, { signal });
}

export function placeFromCoords(latitude: number, longitude: number) {
  return request<Place>(`/api/places/reverse?${coords(latitude, longitude)}`);
}

export function getNepalCities(signal?: AbortSignal) {
  return request<CityNow[]>('/api/nepal', { signal });
}

export function getCities(places: Place[], signal?: AbortSignal) {
  return request<CityNow[]>('/api/cities', post({ places }, signal));
}

export function getAlerts(place: Place, signal?: AbortSignal) {
  const params = coords(place.latitude, place.longitude);
  if (place.countryCode) params.set('country', place.countryCode);
  return request<AlertsResponse>(`/api/alerts?${params}`, { signal });
}

export function getGrid(bounds: { south: number; west: number; north: number; east: number }, signal?: AbortSignal) {
  const params = new URLSearchParams(Object.entries(bounds).map(([k, v]) => [k, v.toFixed(1)]));
  return request<GridPoint[]>(`/api/map/grid?${params}`, { signal });
}

export function getRadar(signal?: AbortSignal) {
  return request<RadarFrames>('/api/map/radar', { signal });
}

export function getAiStatus(signal?: AbortSignal) {
  return request<{ enabled: boolean; model: string | null; reason: string | null }>('/api/ai/status', { signal });
}

export function getInsights(place: Place, units: Units, clock: ClockFormat, refresh = false, signal?: AbortSignal) {
  return request<InsightsResponse>('/api/ai/insights', post({ place: placeInput(place), units, clock, refresh }, signal));
}

export function comparePlaces(places: Place[], activity: string, units: Units, signal?: AbortSignal) {
  return request<CompareResponse>('/api/ai/compare', post({ places: places.map(placeInput), activity, units }, signal));
}

/** Streams the assistant's reply, calling `onEvent` for each NDJSON event. */
export async function streamChat(
  body: { place: Place; units: Units; clock: ClockFormat; messages: { role: 'user' | 'assistant'; content: string }[] },
  onEvent: (event: ChatEvent) => void,
  signal?: AbortSignal,
) {
  let response: Response;
  try {
    response = await fetch('/api/ai/chat', post({ ...body, place: placeInput(body.place) }, signal));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('Could not reach the server. Check your connection.', 0);
  }
  if (!response.ok || !response.body) {
    const err = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(err?.error ?? `Request failed (${response.status}).`, response.status);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) onEvent(JSON.parse(line) as ChatEvent);
    }
  }
}

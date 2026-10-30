import { NextResponse } from 'next/server';
import { WeatherApiError } from '@/lib/openMeteo';

const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' };

export function ok<T>(data: T) {
  return NextResponse.json(data, { headers: CACHE_HEADERS });
}

export function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function failFrom(error: unknown) {
  if (error instanceof WeatherApiError) return fail(error.message, error.status);
  console.error(error);
  return fail('Unexpected server error.', 500);
}

/** Parses ?lat=&lon= and rejects anything outside valid ranges. */
export function readCoords(params: URLSearchParams) {
  const lat = Number(params.get('lat'));
  const lon = Number(params.get('lon'));
  if (!params.get('lat') || !params.get('lon') || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { latitude: lat, longitude: lon };
}

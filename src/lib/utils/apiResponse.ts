import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import type { z } from 'zod';
import { WeatherApiError } from '../weather/openMeteo';

const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' };
const NO_STORE = { 'Cache-Control': 'no-store' };

export function ok<T>(data: T, cache: 'public' | 'private' = 'public') {
  return NextResponse.json(data, { headers: cache === 'public' ? CACHE_HEADERS : NO_STORE });
}

export function fail(message: string, status: number, extraHeaders: Record<string, string> = {}) {
  return NextResponse.json({ error: message }, { status, headers: { ...NO_STORE, ...extraHeaders } });
}

export function tooMany(retryAfter: number) {
  return fail('Too many requests. Please wait a moment and try again.', 429, { 'Retry-After': String(retryAfter) });
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

/**
 * Reads a JSON body with a hard size cap and validates it against a schema.
 * Returns either the parsed data or a ready-to-return error response.
 */
export async function readJson<S extends z.ZodType>(
  request: NextRequest,
  schema: S,
  maxBytes = 16_000,
): Promise<{ data: z.infer<S>; error?: never } | { data?: never; error: NextResponse }> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > maxBytes) return { error: fail('Request body is too large.', 413) };
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { error: fail('Could not read the request body.', 400) };
  }
  if (raw.length > maxBytes) return { error: fail('Request body is too large.', 413) };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { error: fail('Request body must be valid JSON.', 400) };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: fail(`Invalid request: ${issue.path.join('.') || 'body'} ${issue.message}`.trim(), 400) };
  }
  return { data: parsed.data };
}

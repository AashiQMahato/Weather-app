import type { NextRequest } from 'next/server';
import { getWeather } from '@/lib/openMeteo';
import { fail, failFrom, ok, readCoords } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  const coords = readCoords(request.nextUrl.searchParams);
  if (!coords) return fail('Valid lat and lon query parameters are required.', 400);
  try {
    return ok(await getWeather(coords));
  } catch (error) {
    return failFrom(error);
  }
}

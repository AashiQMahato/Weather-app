import type { NextRequest } from 'next/server';
import { placeFromCoords } from '@/lib/weather/openMeteo';
import { fail, ok, readCoords } from '@/lib/utils/apiResponse';

export async function GET(request: NextRequest) {
  const coords = readCoords(request.nextUrl.searchParams);
  if (!coords) return fail('Valid lat and lon query parameters are required.', 400);
  return ok(await placeFromCoords(coords.latitude, coords.longitude));
}

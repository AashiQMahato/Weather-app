import type { NextRequest } from 'next/server';
import { getAlerts } from '@/lib/weather/alerts';
import { fail, ok, readCoords } from '@/lib/utils/apiResponse';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const coords = readCoords(params);
  if (!coords) return fail('Valid lat and lon query parameters are required.', 400);
  const country = params.get('country')?.match(/^[A-Za-z]{2}$/)?.[0];
  return ok(await getAlerts(coords.latitude, coords.longitude, country));
}

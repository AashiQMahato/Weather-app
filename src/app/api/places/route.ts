import type { NextRequest } from 'next/server';
import { searchPlaces } from '@/lib/weather/openMeteo';
import { failFrom, ok } from '@/lib/utils/apiResponse';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (query.length < 2) return ok([]);
  try {
    return ok(await searchPlaces(query.slice(0, 80)));
  } catch (error) {
    return failFrom(error);
  }
}

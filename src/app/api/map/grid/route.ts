import type { NextRequest } from 'next/server';
import { getGrid } from '@/lib/weather/openMeteo';
import { fail, failFrom, ok, tooMany } from '@/lib/utils/apiResponse';
import { rateLimit } from '@/lib/utils/rateLimit';

const GRID_SIZE = 7;

/** Current conditions sampled on a grid over the visible map area. */
export async function GET(request: NextRequest) {
  const limit = rateLimit(request, 'grid', 40, 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);
  const p = request.nextUrl.searchParams;
  // Rounded so neighbouring requests share the CDN cache.
  const [south, west, north, east] = ['south', 'west', 'north', 'east'].map((k) => Math.round(Number(p.get(k)) * 10) / 10);
  const valid =
    [south, west, north, east].every(Number.isFinite) &&
    south >= -90 && north <= 90 && west >= -180 && east <= 180 &&
    north > south && east > west && north - south <= 60 && east - west <= 90;
  if (!valid) return fail('Valid south, west, north and east bounds are required (max 60° × 90°).', 400);
  try {
    return ok(await getGrid({ south, west, north, east }, GRID_SIZE));
  } catch (error) {
    return failFrom(error);
  }
}

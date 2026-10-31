import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentForPlaces } from '@/lib/weather/openMeteo';
import { failFrom, ok, readJson, tooMany } from '@/lib/utils/apiResponse';
import { rateLimit } from '@/lib/utils/rateLimit';

const Body = z.object({
  places: z
    .array(
      z.object({
        id: z.string().max(64),
        name: z.string().max(80),
        localName: z.string().max(80).optional(),
        subtitle: z.string().max(160),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        countryCode: z.string().max(2).optional(),
      }),
    )
    .min(1)
    .max(20),
});

/** Current conditions for a list of saved places, in one upstream request. */
export async function POST(request: NextRequest) {
  const limit = rateLimit(request, 'cities', 30, 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);
  const body = await readJson(request, Body);
  if (body.error) return body.error;
  try {
    return ok(await getCurrentForPlaces(body.data.places), 'private');
  } catch (error) {
    return failFrom(error);
  }
}

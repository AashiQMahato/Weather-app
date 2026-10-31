import type { NextRequest } from 'next/server';
import { getInsights } from '@/lib/groq/insights';
import { failFrom, ok, readJson, tooMany } from '@/lib/utils/apiResponse';
import { rateLimit } from '@/lib/utils/rateLimit';
import { InsightsRequest } from '@/lib/utils/validation';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, 'ai-insights', 12, 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);
  const body = await readJson(request, InsightsRequest, 2_000);
  if (body.error) return body.error;
  const { place, units, clock, refresh } = body.data;
  try {
    return ok(await getInsights({ ...place, units, clock, refresh }), 'private');
  } catch (error) {
    return failFrom(error);
  }
}

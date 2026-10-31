import type { NextRequest } from 'next/server';
import { comparePlaces } from '@/lib/groq/compare';
import { failFrom, ok, readJson, tooMany } from '@/lib/utils/apiResponse';
import { rateLimit } from '@/lib/utils/rateLimit';
import { CompareRequest } from '@/lib/utils/validation';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, 'ai-compare', 8, 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);
  const body = await readJson(request, CompareRequest, 4_000);
  if (body.error) return body.error;
  try {
    return ok(await comparePlaces(body.data), 'private');
  } catch (error) {
    return failFrom(error);
  }
}

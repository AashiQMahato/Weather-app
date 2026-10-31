import type { NextRequest } from 'next/server';
import { streamChat } from '@/lib/groq/chat';
import { isAiConfigured } from '@/lib/groq/client';
import { fail, readJson, tooMany } from '@/lib/utils/apiResponse';
import { rateLimit } from '@/lib/utils/rateLimit';
import { ChatRequest } from '@/lib/utils/validation';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, 'ai-chat', 15, 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);
  if (!isAiConfigured()) return fail('The AI assistant is not configured on this deployment.', 503);
  const body = await readJson(request, ChatRequest, 48_000);
  if (body.error) return body.error;
  return new Response(streamChat(body.data), {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}

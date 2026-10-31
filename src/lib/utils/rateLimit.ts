import 'server-only';
import type { NextRequest } from 'next/server';

// Fixed-window limiter kept in memory. On Vercel each serverless instance has
// its own memory, so this is a per-instance safeguard against bursts; use a
// shared store (e.g. Upstash Redis) if you need a strict global limit.

const windows = new Map<string, { count: number; resetAt: number }>();

export function clientIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export function rateLimit(request: NextRequest, bucket: string, limit: number, windowMs: number) {
  const key = `${bucket}:${clientIp(request)}`;
  const now = Date.now();
  const entry = windows.get(key);
  if (!entry || entry.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    if (windows.size > 5000) {
      for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k);
    }
    return { ok: true, retryAfter: 0 };
  }
  entry.count += 1;
  return { ok: entry.count <= limit, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
}

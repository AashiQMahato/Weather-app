import { z } from 'zod';

// Request schemas shared by API routes. Clients send only places and
// preferences; weather data is always fetched fresh on the server.

export const PlaceInput = z.object({
  name: z.string().trim().min(1).max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const UnitsInput = z.enum(['metric', 'imperial']).default('metric');
export const ClockInput = z.enum(['12', '24']).default('12');

export const InsightsRequest = z.object({
  place: PlaceInput,
  units: UnitsInput,
  clock: ClockInput,
  refresh: z.boolean().optional(),
});

export const ChatRequest = z.object({
  place: PlaceInput,
  units: UnitsInput,
  clock: ClockInput,
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20)
    .refine((m) => m[m.length - 1].role === 'user', 'must end with a user message')
    .refine((m) => m[m.length - 1].content.length <= 500, 'question must be 500 characters or fewer'),
});

export const CompareRequest = z.object({
  places: z.array(PlaceInput).min(2).max(4),
  activity: z.string().trim().min(2).max(60),
  units: UnitsInput,
});

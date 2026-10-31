import { z } from 'zod';
import type { Risk } from '../weather/risks';

export const RECOMMENDATION_CATEGORIES = [
  'clothing',
  'outdoor',
  'travel',
  'exercise',
  'cycling',
  'walking',
  'photography',
  'gardening',
  'umbrella',
  'hydration',
] as const;

export const INSIGHT_TOPICS = ['temperature', 'rain', 'wind', 'uv', 'air', 'sun', 'cloud', 'tomorrow'] as const;

const text = (max: number) => z.string().trim().min(1).max(max);

export const AnalysisSchema = z.object({
  headline: text(120),
  summary: text(700),
  keyInsights: z
    .array(z.object({ topic: z.enum(INSIGHT_TOPICS), text: text(240) }))
    .min(1)
    .max(6),
  details: z.object({
    temperature: text(600),
    precipitation: text(600),
    activities: text(600),
    inconveniences: text(600),
    tomorrow: text(600),
  }),
  recommendations: z
    .array(
      z.object({
        category: z.enum(RECOMMENDATION_CATEGORIES),
        title: text(80),
        body: text(320),
        items: z.array(text(60)).max(4).default([]),
        rating: z.enum(['great', 'good', 'fair', 'poor']),
      }),
    )
    .min(1)
    .max(10),
});

/** What the model returns: the analysis plus plain-language notes for computed risks. */
export const AiInsightsSchema = AnalysisSchema.extend({
  riskNotes: z.array(z.object({ id: z.string().max(40), explanation: text(400) })).max(12).default([]),
});

export type Analysis = z.infer<typeof AnalysisSchema>;
export type Recommendation = Analysis['recommendations'][number];

export interface ExplainedRisk extends Risk {
  explanation: string | null;
}

export interface InsightsResponse {
  source: 'ai' | 'rules';
  model: string | null;
  generatedAt: string;
  analysis: Analysis;
  risks: ExplainedRisk[];
  /** Why the rule-based fallback was used, when it was. */
  notice: string | null;
}

export const CompareAiSchema = z.object({
  bestIndex: z.number().int().min(0).max(3),
  verdict: text(500),
  places: z
    .array(z.object({ index: z.number().int().min(0).max(3), score: z.number().min(0).max(10), summary: text(300) }))
    .min(2)
    .max(4),
});

export type CompareAi = z.infer<typeof CompareAiSchema>;

export interface CompareRow {
  name: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windGusts: number;
  precipitationProbability: number;
  precipitationSum: number;
  uvIndexMax: number;
  usAqi: number | null;
  weatherCode: number;
  isDay: boolean;
  max: number;
  min: number;
}

export interface CompareResponse {
  rows: CompareRow[];
  ai: CompareAi | null;
  model: string | null;
  notice: string | null;
}

/** NDJSON events streamed by /api/ai/chat. */
export type ChatEvent =
  | { type: 'context'; places: string[]; fetchedAt: string; model: string }
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

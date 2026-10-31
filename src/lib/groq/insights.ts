import 'server-only';
import { detectRisks } from '../weather/risks';
import { ruleBasedAnalysis } from '../weather/rules';
import { getWeather } from '../weather/openMeteo';
import type { ClockFormat, Units } from '../types';
import { createCache } from '../utils/cache';
import { completeJson, describeError, isAiConfigured, userMessage } from './client';
import { allowedTemperatures, buildFacts, groundText, riskFacts } from './facts';
import { INSIGHTS_SYSTEM, insightsUser } from './prompts';
import { AiInsightsSchema, type InsightsResponse } from './schemas';

const cache = createCache<InsightsResponse>(20 * 60 * 1000);

interface Options {
  name: string;
  latitude: number;
  longitude: number;
  units: Units;
  clock: ClockFormat;
  refresh?: boolean;
}

export async function getInsights(options: Options): Promise<InsightsResponse> {
  const { name, latitude, longitude, units, clock, refresh } = options;
  const hourBucket = new Date().toISOString().slice(0, 13);
  const key = [latitude.toFixed(2), longitude.toFixed(2), units, clock, hourBucket].join('|');
  if (!refresh) {
    const hit = cache.get(key);
    if (hit) return hit;
  }

  const report = await getWeather({ latitude, longitude });
  const risks = detectRisks(report, units, clock);
  const fallback = (notice: string): InsightsResponse => ({
    source: 'rules',
    model: null,
    generatedAt: new Date().toISOString(),
    analysis: ruleBasedAnalysis(report, name, units),
    risks: risks.map((r) => ({ ...r, explanation: null })),
    notice,
  });

  if (!isAiConfigured()) return fallback('AI is not configured on this deployment, so this summary was generated from rules.');

  const facts = buildFacts(report, name, units, clock);
  try {
    const { data, model } = await completeJson(INSIGHTS_SYSTEM, insightsUser(facts, riskFacts(risks)));
    const parsed = AiInsightsSchema.safeParse(data);
    if (!parsed.success) {
      console.error('AI insights failed validation:', parsed.error.issues.slice(0, 3));
      return fallback('The AI response could not be verified, so this summary was generated from rules.');
    }
    const allowed = allowedTemperatures(facts);
    const ground = (text: string) => groundText(text, allowed) || text.replace(/-?\d+(\.\d+)?\s*°/g, '').trim();
    const { riskNotes, ...analysis } = parsed.data;
    const notes = new Map(riskNotes.map((n) => [n.id, ground(n.explanation)]));
    const result: InsightsResponse = {
      source: 'ai',
      model,
      generatedAt: new Date().toISOString(),
      analysis: {
        ...analysis,
        headline: ground(analysis.headline),
        summary: ground(analysis.summary),
        keyInsights: analysis.keyInsights.map((k) => ({ ...k, text: ground(k.text) })).filter((k) => k.text),
        details: Object.fromEntries(Object.entries(analysis.details).map(([k, v]) => [k, ground(v)])) as typeof analysis.details,
        recommendations: analysis.recommendations.map((r) => ({ ...r, body: ground(r.body) })),
      },
      risks: risks.map((r) => ({ ...r, explanation: notes.get(r.id) ?? null })),
      notice: null,
    };
    cache.set(key, result);
    return result;
  } catch (error) {
    console.error('AI insights failed:', describeError(error));
    return fallback(`${userMessage(error)} Showing a summary generated from rules.`);
  }
}

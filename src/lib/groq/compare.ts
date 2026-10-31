import 'server-only';
import { getWeather } from '../weather/openMeteo';
import type { Units } from '../types';
import { completeJson, describeError, isAiConfigured, userMessage } from './client';
import { buildFacts } from './facts';
import { COMPARE_SYSTEM, compareUser } from './prompts';
import { CompareAiSchema, type CompareResponse, type CompareRow } from './schemas';

interface CompareOptions {
  places: { name: string; latitude: number; longitude: number }[];
  activity: string;
  units: Units;
}

export async function comparePlaces({ places, activity, units }: CompareOptions): Promise<CompareResponse> {
  const reports = await Promise.all(places.map((p) => getWeather(p)));

  // Raw metric values; the client converts for display.
  const rows: CompareRow[] = reports.map((r, i) => ({
    name: places[i].name,
    temperature: r.current.temperature,
    feelsLike: r.current.feelsLike,
    humidity: r.current.humidity,
    windSpeed: r.current.windSpeed,
    windGusts: r.current.windGusts,
    precipitationProbability: r.daily[0].precipitationProbability,
    precipitationSum: r.daily[0].precipitationSum,
    uvIndexMax: r.daily[0].uvIndexMax,
    usAqi: r.airQuality?.usAqi ?? null,
    weatherCode: r.current.weatherCode,
    isDay: r.current.isDay,
    max: r.daily[0].max,
    min: r.daily[0].min,
  }));

  if (!isAiConfigured()) {
    return { rows, ai: null, model: null, notice: 'AI is not configured on this deployment. The comparison table uses live data only.' };
  }

  try {
    const facts = reports.map((r, i) => {
      const { current, today, tomorrow, airQuality, next24h } = buildFacts(r, places[i].name, units);
      return { index: i, location: places[i].name, current, today, tomorrow, airQuality, next12h: next24h.slice(0, 6) };
    });
    const { data, model } = await completeJson(COMPARE_SYSTEM, compareUser(activity, facts), 900);
    const parsed = CompareAiSchema.safeParse(data);
    if (!parsed.success || parsed.data.bestIndex >= places.length) {
      return { rows, ai: null, model, notice: 'The AI verdict could not be verified. The table below uses live data only.' };
    }
    return { rows, ai: parsed.data, model, notice: null };
  } catch (error) {
    console.error('AI compare failed:', describeError(error));
    return { rows, ai: null, model: null, notice: `${userMessage(error)} The table below uses live data only.` };
  }
}

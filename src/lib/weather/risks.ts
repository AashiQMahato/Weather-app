import { isStorm } from './conditions';
import { hourLabel, precipitation, speed, temperature } from './format';
import type { ClockFormat, Units, WeatherReport } from '../types';

export type Severity = 'low' | 'moderate' | 'high' | 'extreme';
export type Tone = 'good' | 'info' | 'warning' | 'critical';

export const SEVERITY_TONE: Record<Severity, Tone> = {
  low: 'info',
  moderate: 'warning',
  high: 'critical',
  extreme: 'critical',
};

export function uvLevel(uv: number) {
  if (uv < 3) return { label: 'Low', tone: 'good' as Tone, advice: 'No protection needed for most people.' };
  if (uv < 6) return { label: 'Moderate', tone: 'info' as Tone, advice: 'Wear sunglasses; use sunscreen if outside for long.' };
  if (uv < 8) return { label: 'High', tone: 'warning' as Tone, advice: 'Sunscreen, hat and shade around midday.' };
  if (uv < 11) return { label: 'Very high', tone: 'critical' as Tone, advice: 'Avoid the midday sun; skin burns quickly.' };
  return { label: 'Extreme', tone: 'critical' as Tone, advice: 'Stay out of direct sun around midday.' };
}

/** US EPA AQI categories and health messaging. */
export function aqiLevel(aqi: number) {
  if (aqi <= 50)
    return {
      label: 'Good',
      tone: 'good' as Tone,
      general: 'Air quality is satisfactory. Enjoy outdoor activities.',
      sensitive: 'No precautions needed.',
    };
  if (aqi <= 100)
    return {
      label: 'Moderate',
      tone: 'info' as Tone,
      general: 'Acceptable for most people.',
      sensitive: 'Unusually sensitive people should consider shorter, lighter outdoor exertion.',
    };
  if (aqi <= 150)
    return {
      label: 'Unhealthy for sensitive groups',
      tone: 'warning' as Tone,
      general: 'Most people are unlikely to be affected.',
      sensitive: 'Children, older adults and people with heart or lung disease should reduce prolonged or heavy exertion.',
    };
  if (aqi <= 200)
    return {
      label: 'Unhealthy',
      tone: 'critical' as Tone,
      general: 'Reduce prolonged or heavy outdoor exertion; take more breaks.',
      sensitive: 'Avoid prolonged or heavy exertion; consider moving activities indoors.',
    };
  if (aqi <= 300)
    return {
      label: 'Very unhealthy',
      tone: 'critical' as Tone,
      general: 'Avoid prolonged or heavy exertion outdoors.',
      sensitive: 'Avoid all physical activity outdoors.',
    };
  return {
    label: 'Hazardous',
    tone: 'critical' as Tone,
    general: 'Avoid all physical activity outdoors.',
    sensitive: 'Remain indoors and keep activity levels low.',
  };
}

export interface Risk {
  id: string;
  kind: 'precipitation' | 'storm' | 'uv' | 'wind' | 'humidity' | 'air' | 'heat' | 'cold' | 'visibility';
  severity: Severity;
  title: string;
  /** The measured value that triggered it, formatted for display. */
  measurement: string;
  /** When it applies, e.g. "Today, peaks 1 PM". */
  window: string;
  /** Which threshold was crossed. */
  basis: string;
}

/**
 * Risks derived only from provider data, using fixed thresholds.
 * These are model-based insights, not official warnings.
 */
export function detectRisks(report: WeatherReport, units: Units, clockFormat: ClockFormat = '12'): Risk[] {
  const { current, hourly, daily, airQuality } = report;
  const next24 = hourly.slice(0, 24);
  const today = daily[0];
  const risks: Risk[] = [];
  const at = (time: string) => hourLabel(time, clockFormat);
  const peak = <T,>(items: T[], value: (item: T) => number) =>
    items.reduce((best, item) => (value(item) > value(best) ? item : best), items[0]);

  const stormHour = next24.find((h) => isStorm(h.weatherCode));
  if (stormHour || isStorm(current.weatherCode)) {
    risks.push({
      id: 'storm',
      kind: 'storm',
      severity: 'high',
      title: 'Thunderstorms possible',
      measurement: 'Thunderstorm in model forecast',
      window: stormHour ? `From around ${at(stormHour.time)}` : 'Now',
      basis: 'WMO weather codes 82 or 95–99 in the next 24 hours',
    });
  }

  const wettest = peak(next24, (h) => h.precipitation);
  const daySum = today.precipitationSum;
  if (daySum >= 20 || (wettest && wettest.precipitation >= 7.6)) {
    const severity: Severity = daySum >= 50 || wettest.precipitation >= 15 ? 'high' : 'moderate';
    risks.push({
      id: 'precipitation',
      kind: 'precipitation',
      severity,
      title: severity === 'high' ? 'Very heavy rain' : 'Heavy rain',
      measurement: `${precipitation(daySum, units)} today, up to ${precipitation(wettest.precipitation, units)}/h`,
      window: `Heaviest around ${at(wettest.time)}`,
      basis: 'Daily total ≥ 20 mm or hourly rate ≥ 7.6 mm/h',
    });
  }

  const sunniest = peak(next24, (h) => h.uvIndex);
  if (sunniest && sunniest.uvIndex >= 6) {
    const uv = sunniest.uvIndex;
    risks.push({
      id: 'uv',
      kind: 'uv',
      severity: uv >= 11 ? 'extreme' : uv >= 8 ? 'high' : 'moderate',
      title: `${uvLevel(uv).label} UV`,
      measurement: `UV index ${Math.round(uv)}`,
      window: `Peaks around ${at(sunniest.time)}`,
      basis: 'WHO UV index: 6–7 high, 8–10 very high, 11+ extreme',
    });
  }

  const gustiest = peak(next24, (h) => h.windGusts);
  if (gustiest && gustiest.windGusts >= 50) {
    const g = gustiest.windGusts;
    risks.push({
      id: 'wind',
      kind: 'wind',
      severity: g >= 90 ? 'extreme' : g >= 75 ? 'high' : 'moderate',
      title: 'Strong wind gusts',
      measurement: `Gusts up to ${speed(g, units)}`,
      window: `Strongest around ${at(gustiest.time)}`,
      basis: 'Gusts ≥ 50 km/h moderate, ≥ 75 high, ≥ 90 extreme',
    });
  }

  const muggiest = peak(next24, (h) => h.dewPoint);
  if (muggiest && muggiest.dewPoint >= 20) {
    risks.push({
      id: 'humidity',
      kind: 'humidity',
      severity: muggiest.dewPoint >= 24 ? 'high' : 'moderate',
      title: 'Muggy, uncomfortable air',
      measurement: `Dew point ${temperature(muggiest.dewPoint, units)}`,
      window: `Most humid around ${at(muggiest.time)}`,
      basis: 'Dew point ≥ 20 °C feels oppressive; ≥ 24 °C is very uncomfortable',
    });
  }

  if (airQuality?.usAqi != null && airQuality.usAqi > 100) {
    const aqi = airQuality.usAqi;
    risks.push({
      id: 'air',
      kind: 'air',
      severity: aqi > 200 ? 'extreme' : aqi > 150 ? 'high' : 'moderate',
      title: 'Poor air quality',
      measurement: `US AQI ${Math.round(aqi)} (${aqiLevel(aqi).label.toLowerCase()})`,
      window: 'Now',
      basis: 'US EPA AQI above 100',
    });
  }

  const hottest = peak(next24, (h) => h.feelsLike);
  if (hottest && hottest.feelsLike >= 32) {
    const f = hottest.feelsLike;
    risks.push({
      id: 'heat',
      kind: 'heat',
      severity: f >= 46 ? 'extreme' : f >= 39 ? 'high' : 'moderate',
      title: 'Heat stress',
      measurement: `Feels like ${temperature(f, units)}`,
      window: `Hottest around ${at(hottest.time)}`,
      basis: 'Apparent temperature ≥ 32 °C caution, ≥ 39 °C danger',
    });
  }

  const coldest = next24.reduce((best, h) => (h.feelsLike < best.feelsLike ? h : best), next24[0]);
  if (coldest && coldest.feelsLike <= 0) {
    const f = coldest.feelsLike;
    risks.push({
      id: 'cold',
      kind: 'cold',
      severity: f <= -25 ? 'extreme' : f <= -10 ? 'high' : 'moderate',
      title: f <= -10 ? 'Severe cold' : 'Freezing conditions',
      measurement: `Feels like ${temperature(f, units)}`,
      window: `Coldest around ${at(coldest.time)}`,
      basis: 'Apparent temperature ≤ 0 °C; ≤ −10 °C risks frostbite',
    });
  }

  const murkiest = next24.reduce((best, h) => (h.visibility < best.visibility ? h : best), next24[0]);
  if (murkiest && murkiest.visibility < 1000) {
    risks.push({
      id: 'visibility',
      kind: 'visibility',
      severity: murkiest.visibility < 200 ? 'high' : 'moderate',
      title: 'Poor visibility',
      measurement: `${Math.round(murkiest.visibility)} m`,
      window: `Worst around ${at(murkiest.time)}`,
      basis: 'Visibility under 1 km (fog or heavy precipitation)',
    });
  }

  const order: Severity[] = ['extreme', 'high', 'moderate', 'low'];
  return risks.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
}

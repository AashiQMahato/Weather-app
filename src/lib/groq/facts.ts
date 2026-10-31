import 'server-only';
import { describeCondition } from '../weather/conditions';
import { clock, compass, hourLabel, longDate } from '../weather/format';
import type { Risk } from '../weather/risks';
import type { ClockFormat, Units, WeatherReport } from '../types';

// Compact, unit-converted weather facts for prompts. The model is told these
// are the only numbers it may state.

const round = (v: number, d = 0) => Number(v.toFixed(d));

export function buildFacts(report: WeatherReport, placeName: string, units: Units, clockFormat: ClockFormat = '12') {
  const imperial = units === 'imperial';
  const temp = (c: number) => round(imperial ? c * 1.8 + 32 : c);
  const wind = (k: number) => round(imperial ? k * 0.621371 : k);
  const rain = (mm: number) => (imperial ? round(mm / 25.4, 2) : round(mm, 1));
  const { current: c, hourly, daily, airQuality } = report;

  const day = (d: WeatherReport['daily'][number]) => ({
    date: d.date,
    weekday: longDate(d.date).split(',')[0],
    condition: describeCondition(d.weatherCode).label,
    high: temp(d.max),
    low: temp(d.min),
    feelsHigh: temp(d.feelsMax),
    feelsLow: temp(d.feelsMin),
    rainChancePct: d.precipitationProbability,
    rainTotal: rain(d.precipitationSum),
    rainHours: d.precipitationHours,
    windMax: wind(d.windSpeedMax),
    gustMax: wind(d.windGustsMax),
    windFrom: compass(d.windDirection),
    uvMax: round(d.uvIndexMax, 1),
    sunrise: clock(d.sunrise, clockFormat),
    sunset: clock(d.sunset, clockFormat),
  });

  return {
    location: placeName,
    localTime: c.time.replace('T', ' '),
    timezone: report.timezone,
    source: 'Open-Meteo forecast model (live)',
    units: { temperature: imperial ? '°F' : '°C', wind: imperial ? 'mph' : 'km/h', rain: imperial ? 'in' : 'mm', visibility: 'm' },
    current: {
      condition: describeCondition(c.weatherCode, c.isDay).label,
      isDaytime: c.isDay,
      temperature: temp(c.temperature),
      feelsLike: temp(c.feelsLike),
      humidityPct: c.humidity,
      dewPoint: temp(c.dewPoint),
      windSpeed: wind(c.windSpeed),
      windGusts: wind(c.windGusts),
      windFrom: compass(c.windDirection),
      cloudCoverPct: c.cloudCover,
      pressureHpa: round(c.pressure),
      visibility: round(c.visibility),
      uvIndex: round(c.uvIndex, 1),
      precipitationLastHour: rain(c.precipitation),
    },
    next24h: hourly
      .slice(0, 24)
      .filter((_, i) => i % 2 === 0)
      .map((h) => ({
        time: hourLabel(h.time, clockFormat),
        condition: describeCondition(h.weatherCode, h.isDay).label,
        temperature: temp(h.temperature),
        feelsLike: temp(h.feelsLike),
        rainChancePct: h.precipitationProbability,
        rain: rain(h.precipitation),
        wind: wind(h.windSpeed),
        gusts: wind(h.windGusts),
        uv: round(h.uvIndex, 1),
      })),
    today: day(daily[0]),
    tomorrow: daily[1] ? day(daily[1]) : null,
    next7days: daily.slice(0, 7).map((d) => ({
      date: d.date,
      condition: describeCondition(d.weatherCode).label,
      high: temp(d.max),
      low: temp(d.min),
      rainChancePct: d.precipitationProbability,
    })),
    airQuality: airQuality
      ? {
          standard: 'US EPA AQI',
          usAqi: airQuality.usAqi,
          pm2_5: airQuality.pm2_5 == null ? null : round(airQuality.pm2_5, 1),
          pm10: airQuality.pm10 == null ? null : round(airQuality.pm10, 1),
          ozone: airQuality.ozone == null ? null : round(airQuality.ozone),
          no2: airQuality.nitrogenDioxide == null ? null : round(airQuality.nitrogenDioxide, 1),
        }
      : null,
  };
}

export type WeatherFacts = ReturnType<typeof buildFacts>;

/** Every temperature value present in the facts, for grounding checks. */
export function allowedTemperatures(facts: WeatherFacts) {
  const values = new Set<number>();
  const add = (v: unknown) => typeof v === 'number' && values.add(Math.round(v));
  const { current, today, tomorrow, next24h, next7days } = facts;
  [current.temperature, current.feelsLike, current.dewPoint].forEach(add);
  for (const d of [today, tomorrow]) if (d) [d.high, d.low, d.feelsHigh, d.feelsLow].forEach(add);
  next24h.forEach((h) => [h.temperature, h.feelsLike].forEach(add));
  next7days.forEach((d) => [d.high, d.low].forEach(add));
  return values;
}

/**
 * Drops sentences that state a temperature not present in the facts
 * (±1° for rounding). A guard against invented numbers.
 */
export function groundText(text: string, allowed: Set<number>, extraAllowed: number[] = []) {
  const ok = (v: number) => [...allowed, ...extraAllowed].some((a) => Math.abs(a - v) <= 1);
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const kept = sentences.filter((s) => {
    const temps = [...s.matchAll(/(-?\d+(?:\.\d+)?)\s*°/g)].map((m) => Number(m[1]));
    return temps.every(ok);
  });
  return kept.join('').trim();
}

export function riskFacts(risks: Risk[]) {
  return risks.map(({ id, title, severity, measurement, window, basis }) => ({ id, title, severity, measurement, window, basis }));
}

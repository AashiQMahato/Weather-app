import { isWet } from './conditions';
import { speed } from './format';
import type { Units, WeatherReport } from './types';

export type InsightTone = 'info' | 'good' | 'warning' | 'critical';

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  body: string;
}

export function uvLevel(uv: number) {
  if (uv < 3) return { label: 'Low', tone: 'good' as const };
  if (uv < 6) return { label: 'Moderate', tone: 'info' as const };
  if (uv < 8) return { label: 'High', tone: 'warning' as const };
  if (uv < 11) return { label: 'Very high', tone: 'critical' as const };
  return { label: 'Extreme', tone: 'critical' as const };
}

export function aqiLevel(aqi: number) {
  if (aqi <= 50) return { label: 'Good', tone: 'good' as const };
  if (aqi <= 100) return { label: 'Moderate', tone: 'info' as const };
  if (aqi <= 150) return { label: 'Unhealthy for sensitive groups', tone: 'warning' as const };
  if (aqi <= 200) return { label: 'Unhealthy', tone: 'critical' as const };
  if (aqi <= 300) return { label: 'Very unhealthy', tone: 'critical' as const };
  return { label: 'Hazardous', tone: 'critical' as const };
}

/** Plain-language tips derived from the forecast. Ordered by importance. */
export function buildInsights(report: WeatherReport, units: Units): Insight[] {
  const { current, hourly, daily, airQuality } = report;
  const insights: Insight[] = [];

  if ([95, 96, 99, 82].includes(current.weatherCode)) {
    insights.push({
      id: 'storm',
      tone: 'critical',
      title: 'Severe weather now',
      body: 'Thunderstorms or violent showers in the area. Stay indoors and avoid open ground.',
    });
  }

  const nextWet = hourly.slice(0, 12).find((h) => h.precipitationProbability >= 50);
  if (nextWet && !isWet(current.weatherCode)) {
    const hoursAway = hourly.indexOf(nextWet);
    insights.push({
      id: 'rain-soon',
      tone: 'warning',
      title: hoursAway === 0 ? 'Rain likely this hour' : `Rain likely in ~${hoursAway}h`,
      body: `${nextWet.precipitationProbability}% chance of precipitation. Take an umbrella if you head out.`,
    });
  } else if (isWet(current.weatherCode)) {
    const dryHour = hourly.find((h) => h.precipitationProbability < 30);
    insights.push({
      id: 'rain-now',
      tone: 'info',
      title: 'Wet right now',
      body: dryHour
        ? `Drier spell expected around ${hourly.indexOf(dryHour) === 0 ? 'now' : `${hourly.indexOf(dryHour)}h from now`}.`
        : 'Precipitation looks persistent for the rest of the day.',
    });
  }

  const peakUv = Math.max(...hourly.slice(0, 12).map((h) => h.uvIndex), 0);
  if (peakUv >= 6) {
    insights.push({
      id: 'uv',
      tone: peakUv >= 8 ? 'critical' : 'warning',
      title: `${uvLevel(peakUv).label} UV ahead`,
      body: `UV index peaks near ${Math.round(peakUv)}. Use sunscreen and seek shade around midday.`,
    });
  }

  if (current.windGusts >= 50) {
    insights.push({
      id: 'wind',
      tone: current.windGusts >= 75 ? 'critical' : 'warning',
      title: 'Strong gusts',
      body: `Gusts up to ${speed(current.windGusts, units)}. Secure loose objects and take care on bikes.`,
    });
  }

  const feelsDiff = current.feelsLike - current.temperature;
  if (Math.abs(feelsDiff) >= 3) {
    insights.push({
      id: 'feels',
      tone: 'info',
      title: feelsDiff < 0 ? 'Feels colder than it is' : 'Feels warmer than it is',
      body: feelsDiff < 0
        ? 'Wind and humidity make it feel noticeably colder. Add a layer.'
        : 'Humidity makes it feel hotter. Stay hydrated.',
    });
  }

  if (airQuality?.usAqi != null && airQuality.usAqi > 100) {
    insights.push({
      id: 'aqi',
      tone: airQuality.usAqi > 150 ? 'critical' : 'warning',
      title: 'Poor air quality',
      body: `US AQI is ${Math.round(airQuality.usAqi)}. Limit prolonged outdoor exertion.`,
    });
  }

  if (daily.length > 1) {
    const swing = daily[1].max - daily[0].max;
    const shown = Math.abs(Math.round(units === 'imperial' ? swing * 1.8 : swing));
    if (Math.abs(swing) >= 5) {
      insights.push({
        id: 'tomorrow',
        tone: 'info',
        title: swing > 0 ? 'Warmer tomorrow' : 'Cooler tomorrow',
        body: `Tomorrow's high is ${shown}° ${swing > 0 ? 'above' : 'below'} today's.`,
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      id: 'calm',
      tone: 'good',
      title: 'Settled conditions',
      body: 'No weather concerns in the next 12 hours. A good time to be outside.',
    });
  }

  return insights;
}

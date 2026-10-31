import type { Analysis, Recommendation } from '../groq/schemas';
import type { Units, WeatherReport } from '../types';
import { describeCondition, isWet } from './conditions';
import { precipitation, speed, tempDelta, temperature } from './format';
import { aqiLevel, uvLevel } from './risks';

/**
 * Deterministic analysis used when the AI is unavailable. Every sentence is
 * built from provider values, so it can never contradict the forecast.
 */
export function ruleBasedAnalysis(report: WeatherReport, placeName: string, units: Units): Analysis {
  const { current, hourly, daily, airQuality } = report;
  const today = daily[0];
  const tomorrow = daily[1] ?? daily[0];
  const next12 = hourly.slice(0, 12);
  const t = (c: number) => temperature(c, units);
  const condition = describeCondition(current.weatherCode, current.isDay).label.toLowerCase();
  const rainHours = next12.filter((h) => h.precipitationProbability >= 50);
  const maxRain = Math.max(0, ...next12.map((h) => h.precipitationProbability));
  const peakUv = Math.max(0, ...next12.map((h) => h.uvIndex));
  const feelsGap = current.feelsLike - current.temperature;
  const swing = tomorrow.max - today.max;
  const comfortable = current.feelsLike >= 15 && current.feelsLike <= 27;

  const precipText = rainHours.length
    ? `Rain is likely in ${rainHours.length} of the next 12 hours (up to ${maxRain}% chance), with ${precipitation(today.precipitationSum, units)} expected today.`
    : `Little rain expected in the next 12 hours (highest chance ${maxRain}%).`;

  const insights: Analysis['keyInsights'] = [
    { topic: 'temperature', text: `High of ${t(today.max)}, low of ${t(today.min)}; currently ${t(current.temperature)}.` },
    { topic: 'rain', text: precipText },
  ];
  if (peakUv >= 3) insights.push({ topic: 'uv', text: `UV peaks at ${Math.round(peakUv)} (${uvLevel(peakUv).label.toLowerCase()}).` });
  if (current.windGusts >= 30) insights.push({ topic: 'wind', text: `Gusts up to ${speed(current.windGusts, units)}.` });
  if (airQuality?.usAqi != null)
    insights.push({ topic: 'air', text: `Air quality is ${aqiLevel(airQuality.usAqi).label.toLowerCase()} (US AQI ${Math.round(airQuality.usAqi)}).` });
  insights.push({
    topic: 'tomorrow',
    text: `Tomorrow: ${describeCondition(tomorrow.weatherCode).label.toLowerCase()}, ${t(tomorrow.min)} to ${t(tomorrow.max)}.`,
  });

  const recommendations: Recommendation[] = [];
  const umbrella = maxRain >= 40 || isWet(current.weatherCode);
  recommendations.push({
    category: 'umbrella',
    title: umbrella ? 'Take an umbrella' : 'No umbrella needed',
    body: umbrella ? `Up to ${maxRain}% chance of rain in the next 12 hours.` : `Rain chance stays at or below ${maxRain}% for the next 12 hours.`,
    items: umbrella ? ['Compact umbrella', 'Water-resistant shoes'] : [],
    rating: umbrella ? 'fair' : 'great',
  });
  const layers =
    current.feelsLike < 5 ? ['Warm coat', 'Hat and gloves'] : current.feelsLike < 15 ? ['Light jacket', 'Long sleeves'] : current.feelsLike < 25 ? ['T-shirt', 'Light layer for the evening'] : ['Breathable clothing', 'Sun hat'];
  recommendations.push({
    category: 'clothing',
    title: `Dress for ${t(current.feelsLike)}`,
    body: `It feels like ${t(current.feelsLike)} now, heading for ${t(today.max)} at the warmest.`,
    items: layers,
    rating: comfortable ? 'great' : 'good',
  });
  if (today.max >= 27 || peakUv >= 6) {
    recommendations.push({
      category: 'hydration',
      title: 'Drink extra water',
      body: `Temperatures reach ${t(today.max)}${peakUv >= 6 ? ` with UV up to ${Math.round(peakUv)}` : ''}.`,
      items: ['Water bottle'],
      rating: 'good',
    });
  }
  const goodOutdoor = !umbrella && comfortable && current.windGusts < 40;
  recommendations.push({
    category: 'walking',
    title: goodOutdoor ? 'Good conditions for a walk' : 'Choose your walking window',
    body: goodOutdoor
      ? `${t(current.feelsLike)} with ${condition} and light wind.`
      : `Conditions now: ${condition}, feels like ${t(current.feelsLike)}, gusts ${speed(current.windGusts, units)}.`,
    items: goodOutdoor ? ['Comfortable shoes'] : [],
    rating: goodOutdoor ? 'great' : 'fair',
  });
  recommendations.push({
    category: 'cycling',
    title: current.windGusts >= 40 ? 'Windy for cycling' : umbrella ? 'Wet roads possible' : 'Fine for cycling',
    body: `Wind ${speed(current.windSpeed, units)}, gusts ${speed(current.windGusts, units)}; rain chance up to ${maxRain}%.`,
    items: [],
    rating: current.windGusts >= 40 || umbrella ? 'poor' : 'good',
  });

  return {
    headline: `${placeName}: ${condition}, ${t(today.min)} to ${t(today.max)}`,
    summary: `It is ${t(current.temperature)} and ${condition} in ${placeName}. ${precipText}`,
    keyInsights: insights.slice(0, 6),
    details: {
      temperature: `Today ranges from ${t(today.min)} to ${t(today.max)}. It currently feels like ${t(current.feelsLike)}${Math.abs(feelsGap) >= 2 ? `, ${tempDelta(feelsGap, units)} ${feelsGap > 0 ? 'warmer' : 'colder'} than the air temperature` : ''}.`,
      precipitation: precipText,
      activities: goodOutdoor ? 'Conditions suit most outdoor activities right now.' : 'Check the hourly forecast for the best outdoor window.',
      inconveniences: [umbrella && 'possible rain', current.windGusts >= 40 && 'gusty wind', peakUv >= 8 && 'strong sun'].filter(Boolean).join(', ') || 'No notable inconveniences expected.',
      tomorrow: `Tomorrow is ${describeCondition(tomorrow.weatherCode).label.toLowerCase()} with ${t(tomorrow.min)} to ${t(tomorrow.max)}${Math.abs(swing) >= 3 ? ` (${tempDelta(swing, units)} ${swing > 0 ? 'warmer' : 'cooler'} than today)` : ''} and a ${tomorrow.precipitationProbability}% chance of rain.`,
    },
    recommendations,
  };
}

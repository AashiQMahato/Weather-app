/** Visual mood of the page, driven by current conditions. */
export type Scene = 'clear-day' | 'clear-night' | 'cloudy' | 'cloudy-night' | 'rain' | 'storm' | 'snow' | 'fog';

/** Drives the weather-responsive glass tint (html[data-weather]). */
export type GlassMood = 'sunny' | 'night' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';

/** Which illustration to draw. Day and night variants are resolved separately. */
export type GlyphKind =
  | 'clear'
  | 'partly'
  | 'cloudy'
  | 'overcast'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'heavy-rain'
  | 'sleet'
  | 'snow'
  | 'storm';

interface Condition {
  label: string;
  glyph: GlyphKind;
  scene: Scene;
}

// WMO weather interpretation codes, as returned by Open-Meteo.
const CONDITIONS: Record<number, Condition> = {
  0: { label: 'Clear sky', glyph: 'clear', scene: 'clear-day' },
  1: { label: 'Mostly clear', glyph: 'clear', scene: 'clear-day' },
  2: { label: 'Partly cloudy', glyph: 'partly', scene: 'clear-day' },
  3: { label: 'Overcast', glyph: 'overcast', scene: 'cloudy' },
  45: { label: 'Fog', glyph: 'fog', scene: 'fog' },
  48: { label: 'Freezing fog', glyph: 'fog', scene: 'fog' },
  51: { label: 'Light drizzle', glyph: 'drizzle', scene: 'rain' },
  53: { label: 'Drizzle', glyph: 'drizzle', scene: 'rain' },
  55: { label: 'Heavy drizzle', glyph: 'drizzle', scene: 'rain' },
  56: { label: 'Freezing drizzle', glyph: 'sleet', scene: 'rain' },
  57: { label: 'Freezing drizzle', glyph: 'sleet', scene: 'rain' },
  61: { label: 'Light rain', glyph: 'rain', scene: 'rain' },
  63: { label: 'Rain', glyph: 'rain', scene: 'rain' },
  65: { label: 'Heavy rain', glyph: 'heavy-rain', scene: 'rain' },
  66: { label: 'Freezing rain', glyph: 'sleet', scene: 'rain' },
  67: { label: 'Freezing rain', glyph: 'sleet', scene: 'rain' },
  71: { label: 'Light snow', glyph: 'snow', scene: 'snow' },
  73: { label: 'Snow', glyph: 'snow', scene: 'snow' },
  75: { label: 'Heavy snow', glyph: 'snow', scene: 'snow' },
  77: { label: 'Snow grains', glyph: 'snow', scene: 'snow' },
  80: { label: 'Light showers', glyph: 'rain', scene: 'rain' },
  81: { label: 'Showers', glyph: 'rain', scene: 'rain' },
  82: { label: 'Violent showers', glyph: 'heavy-rain', scene: 'storm' },
  85: { label: 'Snow showers', glyph: 'snow', scene: 'snow' },
  86: { label: 'Heavy snow showers', glyph: 'snow', scene: 'snow' },
  95: { label: 'Thunderstorm', glyph: 'storm', scene: 'storm' },
  96: { label: 'Thunderstorm with hail', glyph: 'storm', scene: 'storm' },
  99: { label: 'Severe thunderstorm', glyph: 'storm', scene: 'storm' },
};

const UNKNOWN: Condition = { label: 'Unknown', glyph: 'cloudy', scene: 'cloudy' };

export function describeCondition(code: number, isDay = true) {
  const condition = CONDITIONS[code] ?? UNKNOWN;
  let scene: Scene = condition.scene;
  if (!isDay && scene === 'clear-day') scene = 'clear-night';
  if (!isDay && scene === 'cloudy') scene = 'cloudy-night';
  return { label: condition.label, glyph: condition.glyph, scene, isDay };
}

export function glassMood(scene: Scene): GlassMood {
  switch (scene) {
    case 'clear-day':
      return 'sunny';
    case 'clear-night':
    case 'cloudy-night':
      return 'night';
    default:
      return scene;
  }
}

export function isWet(code: number) {
  return code >= 51;
}

export function isStorm(code: number) {
  return code === 82 || code >= 95;
}

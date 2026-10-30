import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react';

/** Visual mood of the page, driven by current conditions. */
export type Scene = 'clear-day' | 'clear-night' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';

interface Condition {
  label: string;
  icon: LucideIcon;
  nightIcon?: LucideIcon;
  scene: Scene;
}

// WMO weather interpretation codes, as returned by Open-Meteo.
const CONDITIONS: Record<number, Condition> = {
  0: { label: 'Clear sky', icon: Sun, nightIcon: Moon, scene: 'clear-day' },
  1: { label: 'Mostly clear', icon: Sun, nightIcon: Moon, scene: 'clear-day' },
  2: { label: 'Partly cloudy', icon: CloudSun, nightIcon: CloudMoon, scene: 'clear-day' },
  3: { label: 'Overcast', icon: Cloud, scene: 'cloudy' },
  45: { label: 'Fog', icon: CloudFog, scene: 'fog' },
  48: { label: 'Freezing fog', icon: CloudFog, scene: 'fog' },
  51: { label: 'Light drizzle', icon: CloudDrizzle, scene: 'rain' },
  53: { label: 'Drizzle', icon: CloudDrizzle, scene: 'rain' },
  55: { label: 'Heavy drizzle', icon: CloudDrizzle, scene: 'rain' },
  56: { label: 'Freezing drizzle', icon: CloudDrizzle, scene: 'rain' },
  57: { label: 'Freezing drizzle', icon: CloudDrizzle, scene: 'rain' },
  61: { label: 'Light rain', icon: CloudRain, scene: 'rain' },
  63: { label: 'Rain', icon: CloudRain, scene: 'rain' },
  65: { label: 'Heavy rain', icon: CloudRain, scene: 'rain' },
  66: { label: 'Freezing rain', icon: CloudRain, scene: 'rain' },
  67: { label: 'Freezing rain', icon: CloudRain, scene: 'rain' },
  71: { label: 'Light snow', icon: CloudSnow, scene: 'snow' },
  73: { label: 'Snow', icon: CloudSnow, scene: 'snow' },
  75: { label: 'Heavy snow', icon: CloudSnow, scene: 'snow' },
  77: { label: 'Snow grains', icon: CloudSnow, scene: 'snow' },
  80: { label: 'Light showers', icon: CloudRain, scene: 'rain' },
  81: { label: 'Showers', icon: CloudRain, scene: 'rain' },
  82: { label: 'Violent showers', icon: CloudRain, scene: 'storm' },
  85: { label: 'Snow showers', icon: CloudSnow, scene: 'snow' },
  86: { label: 'Heavy snow showers', icon: CloudSnow, scene: 'snow' },
  95: { label: 'Thunderstorm', icon: CloudLightning, scene: 'storm' },
  96: { label: 'Thunderstorm with hail', icon: CloudLightning, scene: 'storm' },
  99: { label: 'Severe thunderstorm', icon: CloudLightning, scene: 'storm' },
};

const UNKNOWN: Condition = { label: 'Unknown', icon: Cloud, scene: 'cloudy' };

export function describeCondition(code: number, isDay = true) {
  const condition = CONDITIONS[code] ?? UNKNOWN;
  const icon = !isDay && condition.nightIcon ? condition.nightIcon : condition.icon;
  const scene: Scene = condition.scene === 'clear-day' && !isDay ? 'clear-night' : condition.scene;
  return { label: condition.label, icon, scene };
}

export function isWet(code: number) {
  return code >= 51;
}

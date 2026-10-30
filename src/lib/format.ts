import type { Units } from './types';

// The API always returns metric values; conversion happens at display time
// so switching units never needs a refetch.

export function temperature(celsius: number, units: Units) {
  const value = units === 'imperial' ? celsius * 1.8 + 32 : celsius;
  return `${Math.round(value)}°`;
}

export function speed(kmh: number, units: Units) {
  return units === 'imperial' ? `${Math.round(kmh * 0.621371)} mph` : `${Math.round(kmh)} km/h`;
}

export function distance(meters: number, units: Units) {
  if (units === 'imperial') return `${(meters / 1609.34).toFixed(1)} mi`;
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

export function precipitation(mm: number, units: Units) {
  return units === 'imperial' ? `${(mm / 25.4).toFixed(2)} in` : `${mm.toFixed(1)} mm`;
}

export function pressure(hpa: number, units: Units) {
  return units === 'imperial' ? `${(hpa * 0.02953).toFixed(2)} inHg` : `${Math.round(hpa)} hPa`;
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export function compass(degrees: number) {
  return COMPASS[Math.round(((degrees % 360) + 360) % 360 / 22.5) % 16];
}

// Open-Meteo local times look like "2026-10-30T14:00" and carry no offset.
// Parse the parts directly so the browser's own timezone never leaks in.

export function clock(localIso: string) {
  const hour = Number(localIso.slice(11, 13));
  const minute = localIso.slice(14, 16);
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${minute} ${suffix}`;
}

export function hourLabel(localIso: string) {
  const hour = Number(localIso.slice(11, 13));
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${hour < 12 ? 'AM' : 'PM'}`;
}

function utcDate(localDate: string) {
  return new Date(`${localDate.slice(0, 10)}T12:00:00Z`);
}

export function weekday(localDate: string, today: string) {
  if (localDate.slice(0, 10) === today.slice(0, 10)) return 'Today';
  return utcDate(localDate).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}

export function longDate(localIso: string) {
  return utcDate(localIso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Minutes between two local times on the same day. */
export function minutesBetween(fromIso: string, toIso: string) {
  const toMinutes = (iso: string) => Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
  return toMinutes(toIso) - toMinutes(fromIso);
}

export function duration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

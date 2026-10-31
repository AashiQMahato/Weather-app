import type { ClockFormat, Units } from '../types';

// The API always returns metric values; conversion happens at display time
// so switching units never needs a refetch.

export function tempValue(celsius: number, units: Units) {
  return units === 'imperial' ? celsius * 1.8 + 32 : celsius;
}

export function temperature(celsius: number, units: Units) {
  return `${Math.round(tempValue(celsius, units))}°`;
}

/** A temperature difference (no offset), e.g. "4°". */
export function tempDelta(celsius: number, units: Units) {
  return `${Math.round(Math.abs(units === 'imperial' ? celsius * 1.8 : celsius))}°`;
}

export function speedValue(kmh: number, units: Units) {
  return units === 'imperial' ? kmh * 0.621371 : kmh;
}

export function speedUnit(units: Units) {
  return units === 'imperial' ? 'mph' : 'km/h';
}

export function speed(kmh: number, units: Units) {
  return `${Math.round(speedValue(kmh, units))} ${speedUnit(units)}`;
}

export function distance(meters: number, units: Units) {
  if (units === 'imperial') return `${(meters / 1609.34).toFixed(1)} mi`;
  return meters >= 1000 ? `${(meters / 1000).toFixed(meters >= 10_000 ? 0 : 1)} km` : `${Math.round(meters)} m`;
}

export function precipitation(mm: number, units: Units) {
  return units === 'imperial' ? `${(mm / 25.4).toFixed(2)} in` : `${mm.toFixed(1)} mm`;
}

export function pressure(hpa: number, units: Units) {
  return units === 'imperial' ? `${(hpa * 0.02953).toFixed(2)} inHg` : `${Math.round(hpa)} hPa`;
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export function compass(degrees: number) {
  return COMPASS[Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16];
}

// Open-Meteo local times look like "2026-10-30T14:00" and carry no offset.
// Parse the parts directly so the browser's own timezone never leaks in.

export function clock(localIso: string, format: ClockFormat = '12') {
  const hour = Number(localIso.slice(11, 13));
  const minute = localIso.slice(14, 16);
  if (format === '24') return `${String(hour).padStart(2, '0')}:${minute}`;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${minute} ${hour < 12 ? 'AM' : 'PM'}`;
}

export function hourLabel(localIso: string, format: ClockFormat = '12') {
  const hour = Number(localIso.slice(11, 13));
  if (format === '24') return `${String(hour).padStart(2, '0')}:00`;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${hour < 12 ? 'AM' : 'PM'}`;
}

function utcDate(localDate: string) {
  return new Date(`${localDate.slice(0, 10)}T12:00:00Z`);
}

export function weekday(localDate: string, today: string, style: 'short' | 'long' = 'short') {
  const day = localDate.slice(0, 10);
  if (day === today.slice(0, 10)) return 'Today';
  const tomorrow = new Date(utcDate(today).getTime() + 86_400_000).toISOString().slice(0, 10);
  if (style === 'long' && day === tomorrow) return 'Tomorrow';
  return utcDate(localDate).toLocaleDateString('en-US', { weekday: style, timeZone: 'UTC' });
}

export function shortDate(localDate: string) {
  return utcDate(localDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function longDate(localIso: string) {
  return utcDate(localIso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Minutes since local midnight for a local ISO time. */
export function minutesOfDay(localIso: string) {
  return Number(localIso.slice(11, 13)) * 60 + Number(localIso.slice(14, 16));
}

export function duration(minutes: number) {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** The place's current local time as "YYYY-MM-DDTHH:MM", from its UTC offset. */
export function localNow(utcOffsetSeconds: number, nowMs = Date.now()) {
  return new Date(nowMs + utcOffsetSeconds * 1000).toISOString().slice(0, 16);
}

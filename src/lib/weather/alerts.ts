import 'server-only';
import type { AlertsResponse, OfficialAlert } from '../types';

// Official alerts come only from an authoritative source. The US National
// Weather Service publishes a free CAP/GeoJSON feed; other national services
// (including Nepal's DHM) have no public machine-readable feed we can use, so
// for those regions we say so instead of showing anything model-generated.

const NWS_URL = process.env.NWS_ALERTS_URL || 'https://api.weather.gov/alerts/active';
const USER_AGENT = process.env.NWS_USER_AGENT || '(Skycast weather app, https://github.com/AashiQMahato/Weather-app)';

const NATIONAL_SERVICES: Record<string, { name: string; url: string }> = {
  NP: { name: 'Department of Hydrology and Meteorology, Nepal', url: 'https://www.dhm.gov.np/' },
  IN: { name: 'India Meteorological Department', url: 'https://mausam.imd.gov.in/' },
  GB: { name: 'Met Office', url: 'https://www.metoffice.gov.uk/weather/warnings-and-advice' },
};

function inNwsArea(lat: number, lon: number) {
  // Continental US, Alaska, Hawaii, Puerto Rico and US territories (rough box).
  return lat >= 13 && lat <= 72 && ((lon >= -180 && lon <= -64) || lon >= 144);
}

interface NwsFeature {
  properties: {
    id: string;
    event: string;
    severity: OfficialAlert['severity'];
    headline: string | null;
    description: string | null;
    instruction: string | null;
    areaDesc: string;
    onset: string | null;
    effective: string | null;
    expires: string | null;
    ends: string | null;
    senderName: string;
  };
}

export async function getAlerts(lat: number, lon: number, countryCode?: string): Promise<AlertsResponse> {
  const national = countryCode ? NATIONAL_SERVICES[countryCode.toUpperCase()] : undefined;
  const unsupported: AlertsResponse = {
    supported: false,
    source: national ?? null,
    alerts: [],
    note: national
      ? `Official warnings for this area are published by the ${national.name}. Skycast has no live feed from them yet.`
      : 'No official alert feed is connected for this region. Check your national weather service for warnings.',
  };
  if (!inNwsArea(lat, lon)) return unsupported;

  try {
    const response = await fetch(`${NWS_URL}?point=${lat.toFixed(4)},${lon.toFixed(4)}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/geo+json' },
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 300 },
    });
    // NWS answers 400/404 for points outside its forecast area.
    if (response.status === 400 || response.status === 404) return unsupported;
    if (!response.ok) throw new Error(`NWS responded with ${response.status}`);
    const data = (await response.json()) as { features?: NwsFeature[] };
    const alerts = (data.features ?? []).map(({ properties: p }) => ({
      id: p.id,
      event: p.event,
      severity: p.severity ?? 'Unknown',
      headline: p.headline ?? p.event,
      description: (p.description ?? '').slice(0, 4000),
      instruction: p.instruction?.slice(0, 2000) ?? null,
      areas: p.areaDesc,
      onset: p.onset ?? p.effective,
      expires: p.ends ?? p.expires,
      sender: p.senderName,
    }));
    return {
      supported: true,
      source: { name: 'US National Weather Service', url: 'https://www.weather.gov/' },
      alerts,
      note: null,
    };
  } catch (error) {
    console.error('NWS alerts failed:', error);
    return { ...unsupported, supported: true, source: { name: 'US National Weather Service', url: 'https://www.weather.gov/' }, note: 'The official alert feed could not be reached. Check weather.gov directly.' };
  }
}

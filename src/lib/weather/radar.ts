import 'server-only';
import type { RadarFrames } from '../types';

// RainViewer publishes free radar mosaics (observed past frames plus a short
// nowcast). Attribution is required; free tiles are limited to zoom 7.
// https://www.rainviewer.com/api.html

const RAINVIEWER_URL = process.env.RAINVIEWER_URL || 'https://api.rainviewer.com/public/weather-maps.json';

interface RainViewerMaps {
  host: string;
  radar: { past: { time: number; path: string }[]; nowcast?: { time: number; path: string }[] };
}

export async function getRadarFrames(): Promise<RadarFrames> {
  const response = await fetch(RAINVIEWER_URL, { signal: AbortSignal.timeout(10_000), next: { revalidate: 300 } });
  if (!response.ok) throw new Error(`RainViewer responded with ${response.status}`);
  const data = (await response.json()) as RainViewerMaps;
  const past = data.radar?.past ?? [];
  const nowcast = data.radar?.nowcast ?? [];
  return {
    host: data.host,
    frames: [...past, ...nowcast],
    nowcastStart: past.length,
  };
}

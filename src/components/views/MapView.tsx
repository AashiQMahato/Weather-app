'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { CloudRain, Cloudy, Radar, Thermometer, Wind } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageStates';
import type { MapLayer } from '@/components/maps/WeatherMap';
import { usePreferences } from '@/providers/PreferencesProvider';

// Leaflet touches `window`, so the map only loads in the browser.
const WeatherMap = dynamic(() => import('@/components/maps/WeatherMap'), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" />,
});

const LAYERS: { value: MapLayer; label: string; icon: typeof Radar }[] = [
  { value: 'radar', label: 'Radar', icon: Radar },
  { value: 'precipitation', label: 'Precipitation', icon: CloudRain },
  { value: 'temperature', label: 'Temperature', icon: Thermometer },
  { value: 'wind', label: 'Wind', icon: Wind },
  { value: 'clouds', label: 'Clouds', icon: Cloudy },
];

export function MapView() {
  const { place, resolvedTheme, units, ready } = usePreferences();
  const [layer, setLayer] = useState<MapLayer>('radar');

  return (
    <>
      <PageHeader title="Weather Maps" description="Live radar from RainViewer and current conditions sampled from Open-Meteo across the visible area." />
      <div role="radiogroup" aria-label="Map layer" className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {LAYERS.map((l) => {
          const active = l.value === layer;
          return (
            <button
              key={l.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setLayer(l.value)}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${active ? 'border-ink bg-ink text-canvas' : 'border-line bg-surface text-ink-2 backdrop-blur-xl hover:text-ink'}`}
            >
              <l.icon className="size-4" aria-hidden />
              {l.label}
            </button>
          );
        })}
      </div>
      <div className="panel h-[68dvh] min-h-[420px] p-1.5 lg:h-[calc(100dvh-260px)]">
        {ready && <WeatherMap place={place} layer={layer} theme={resolvedTheme} units={units} />}
      </div>
    </>
  );
}

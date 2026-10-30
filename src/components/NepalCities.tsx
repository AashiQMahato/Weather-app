'use client';

import { useEffect, useState } from 'react';
import { Mountain } from 'lucide-react';
import { getNepalCities } from '@/lib/api';
import { describeCondition } from '@/lib/conditions';
import { temperature } from '@/lib/format';
import type { CityNow, Place, Units } from '@/lib/types';
import { Panel } from './Panel';

interface NepalCitiesProps {
  units: Units;
  selectedId: string;
  onSelect: (place: Place) => void;
}

export function NepalCities({ units, selectedId, onSelect }: NepalCitiesProps) {
  const [cities, setCities] = useState<CityNow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getNepalCities(controller.signal)
      .then(setCities)
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, []);

  if (failed) return null;

  return (
    <Panel title="Across Nepal" icon={Mountain}>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {(cities ?? Array.from({ length: 12 }, () => null)).map((city, i) => {
          if (!city) return <li key={i} className="skeleton h-[4.5rem]" />;
          const { icon: Icon, label } = describeCondition(city.weatherCode, city.isDay);
          const selected = city.place.id === selectedId;
          return (
            <li key={city.place.id}>
              <button
                type="button"
                onClick={() => onSelect(city.place)}
                aria-current={selected ? 'true' : undefined}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors ${selected ? 'bg-white/20 ring-1 ring-white/40' : 'bg-white/5 hover:bg-white/10'}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{city.place.name}</span>
                  <span lang="ne" className="block truncate text-xs text-ink-3">
                    {city.place.localName}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <Icon className="size-5" strokeWidth={1.5} aria-label={label} />
                  <span className="tabular text-base font-semibold">
                    {city.temperature == null ? '—' : temperature(city.temperature, units)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

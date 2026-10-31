'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Mountain } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { getNepalCities } from '@/lib/api';
import { describeCondition } from '@/lib/weather/conditions';
import { temperature } from '@/lib/weather/format';
import type { CityNow } from '@/lib/types';
import { usePreferences } from '@/providers/PreferencesProvider';
import { WeatherGlyph } from './WeatherGlyph';

export function NepalCities() {
  const { units, place, selectPlace } = usePreferences();
  const [cities, setCities] = useState<CityNow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getNepalCities(controller.signal)
      .then(setCities)
      .catch(() => !controller.signal.aborted && setFailed(true));
    return () => controller.abort();
  }, []);

  if (failed) return null;

  return (
    <Panel title="Across Nepal" icon={Mountain}>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {(cities ?? Array.from({ length: 12 }, () => null)).map((city, i) => {
          if (!city) return <li key={i} className="skeleton h-[4.25rem]" />;
          const c = describeCondition(city.weatherCode, city.isDay);
          const selected = city.place.id === place.id;
          return (
            <motion.li key={city.place.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}>
              <button
                type="button"
                onClick={() => {
                  selectPlace(city.place);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                aria-current={selected ? 'true' : undefined}
                className={`flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left transition-colors ${selected ? 'bg-ink/[0.12] ring-1 ring-ink/20' : 'bg-ink/[0.04] hover:bg-ink/[0.08]'}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{city.place.name}</span>
                  <span lang="ne" className="block truncate text-xs text-ink-3">
                    {city.place.localName}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <WeatherGlyph kind={c.glyph} isDay={city.isDay} size={26} label={c.label} />
                  <span className="tabular text-base font-semibold">{city.temperature == null ? '—' : temperature(city.temperature, units)}</span>
                </span>
              </button>
            </motion.li>
          );
        })}
      </ul>
    </Panel>
  );
}

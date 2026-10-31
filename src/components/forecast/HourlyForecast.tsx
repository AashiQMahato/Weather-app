'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Clock, Droplets, Navigation } from 'lucide-react';
import { LazyTrendChart } from '@/components/charts/LazyTrendChart';
import { Panel } from '@/components/ui/Panel';
import { Segmented } from '@/components/ui/Segmented';
import { WeatherGlyph } from '@/components/weather/WeatherGlyph';
import { describeCondition } from '@/lib/weather/conditions';
import { hourLabel, speed, speedUnit, speedValue, tempValue, temperature } from '@/lib/weather/format';
import type { HourlyPoint } from '@/lib/types';
import { usePreferences } from '@/providers/PreferencesProvider';

type View = 'temperature' | 'rain' | 'wind';

export function HourlyForecast({ hours, title = 'Next 24 hours' }: { hours: HourlyPoint[]; title?: string }) {
  const { units, clock } = usePreferences();
  const [view, setView] = useState<View>('temperature');
  const label = (h: HourlyPoint, i: number) => (i === 0 ? 'Now' : hourLabel(h.time, clock));

  const chart = {
    temperature: {
      data: hours.map((h, i) => ({ label: label(h, i), value: tempValue(h.temperature, units), note: `Feels like ${temperature(h.feelsLike, units)}` })),
      kind: 'area' as const,
      unit: '°',
      color: 'var(--accent)',
      domain: undefined,
    },
    rain: {
      data: hours.map((h, i) => ({ label: label(h, i), value: h.precipitationProbability, note: `${h.precipitation.toFixed(1)} mm` })),
      kind: 'bar' as const,
      unit: '%',
      color: 'var(--info)',
      domain: [0, 100] as [number, number],
    },
    wind: {
      data: hours.map((h, i) => ({ label: label(h, i), value: speedValue(h.windSpeed, units), note: `Gusts ${speed(h.windGusts, units)}` })),
      kind: 'area' as const,
      unit: ` ${speedUnit(units)}`,
      color: 'var(--good)',
      domain: undefined,
    },
  }[view];

  return (
    <Panel
      title={title}
      icon={Clock}
      action={
        <Segmented<View>
          label="Chart metric"
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: 'temperature', label: 'Temp' },
            { value: 'rain', label: 'Rain' },
            { value: 'wind', label: 'Wind' },
          ]}
        />
      }
    >
      <LazyTrendChart
        key={`${view}-${units}`}
        data={chart.data}
        kind={chart.kind}
        unit={chart.unit}
        color={chart.color}
        domain={chart.domain}
        height={170}
        tickEvery={hours.length > 24 ? 6 : 3}
        ariaLabel={`${view} over the ${title.toLowerCase()}`}
      />

      <ol className="no-scrollbar -mx-5 mt-5 flex snap-x gap-1 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6">
        {hours.map((h, i) => {
          const c = describeCondition(h.weatherCode, h.isDay);
          return (
            <motion.li
              key={h.time}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 12) * 0.025 }}
              className={`flex min-w-[4.25rem] snap-start flex-col items-center gap-1.5 rounded-2xl px-2 py-3 ${i === 0 ? 'bg-ink/[0.08] ring-1 ring-ink/[0.06]' : ''}`}
            >
              <span className="text-xs font-medium text-ink-2">{label(h, i)}</span>
              <WeatherGlyph kind={c.glyph} isDay={h.isDay} size={30} label={c.label} />
              <span className="tabular text-[15px] font-semibold">{temperature(h.temperature, units)}</span>
              <span className={`tabular inline-flex items-center gap-0.5 text-[11px] ${h.precipitationProbability >= 20 ? 'text-info' : 'text-ink-3/60'}`}>
                <Droplets className="size-3" aria-hidden />
                {h.precipitationProbability}%
              </span>
              <span className="tabular inline-flex items-center gap-0.5 text-[11px] text-ink-3">
                <Navigation className="size-2.5" style={{ transform: `rotate(${h.windDirection + 180}deg)` }} aria-hidden />
                {Math.round(speedValue(h.windSpeed, units))}
              </span>
            </motion.li>
          );
        })}
      </ol>
    </Panel>
  );
}

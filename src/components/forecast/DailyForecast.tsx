'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarDays, ChevronDown, Droplets, Navigation, Sunrise, Sunset, Umbrella, Wind } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { Segmented } from '@/components/ui/Segmented';
import { WeatherGlyph } from '@/components/weather/WeatherGlyph';
import { describeCondition } from '@/lib/weather/conditions';
import { clock, compass, duration, precipitation, shortDate, speed, temperature, weekday } from '@/lib/weather/format';
import { uvLevel } from '@/lib/weather/risks';
import type { DailyPoint } from '@/lib/types';
import { usePreferences } from '@/providers/PreferencesProvider';

interface DailyForecastProps {
  days: DailyPoint[];
  today: string;
  currentTemperature: number;
  /** Shows a 7/14-day toggle when more than 7 days are available. */
  allowExtended?: boolean;
  /** Compact columns for a sidebar placement on large screens. */
  narrow?: boolean;
}

export function DailyForecast({ days, today, currentTemperature, allowExtended = false, narrow = false }: DailyForecastProps) {
  const { units, clock: clockFormat } = usePreferences();
  const [range, setRange] = useState<'7' | '14'>('7');
  const [openDate, setOpenDate] = useState<string | null>(null);
  const shown = days.slice(0, allowExtended && range === '14' ? 14 : 7);

  // Every bar shares one scale so days can be compared at a glance.
  const low = Math.min(...shown.map((d) => d.min));
  const high = Math.max(...shown.map((d) => d.max));
  const span = Math.max(high - low, 1);
  const pct = (v: number) => ((v - low) / span) * 100;

  return (
    <Panel
      title={`${shown.length}-day forecast`}
      icon={CalendarDays}
      action={
        allowExtended && days.length > 7 ? (
          <Segmented
            label="Forecast range"
            size="sm"
            value={range}
            onChange={setRange}
            options={[
              { value: '7', label: '7 days' },
              { value: '14', label: '14 days' },
            ]}
          />
        ) : undefined
      }
    >
      <ul className="-mx-2 divide-y divide-line">
        {shown.map((day, i) => {
          const c = describeCondition(day.weatherCode);
          const open = openDate === day.date;
          const panelId = `day-${day.date}`;
          return (
            <li key={day.date}>
              <button
                type="button"
                onClick={() => setOpenDate(open ? null : day.date)}
                aria-expanded={open}
                aria-controls={panelId}
                className={`grid w-full grid-cols-[4rem_2.25rem_2.5rem_1fr_2.5rem_1rem] items-center gap-2 rounded-xl px-2 py-3 text-left transition-colors hover:bg-ink/[0.04] sm:grid-cols-[5.5rem_2.5rem_3.25rem_2.75rem_1fr_2.75rem_1rem] sm:gap-3 ${narrow ? 'lg:grid-cols-[3.75rem_2rem_2.25rem_1fr_2.25rem_0.75rem] lg:gap-2' : ''}`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{weekday(day.date, today)}</span>
                  <span className="block text-[11px] text-ink-3">{shortDate(day.date)}</span>
                </span>
                <WeatherGlyph kind={c.glyph} size={32} label={c.label} />
                <span className={`tabular hidden items-center gap-0.5 text-xs sm:inline-flex ${narrow ? 'lg:hidden' : ''} ${day.precipitationProbability >= 20 ? 'text-info' : 'text-ink-3/60'}`}>
                  <Droplets className="size-3" aria-hidden />
                  {day.precipitationProbability}%
                </span>
                <span className="tabular text-right text-sm text-ink-3">
                  <span className="sr-only">Low </span>
                  {temperature(day.min, units)}
                </span>
                <span className="relative h-1.5 rounded-full bg-ink/10" aria-hidden>
                  <motion.span
                    className="absolute inset-y-0 rounded-full bg-gradient-to-r from-sky-400 via-amber-300 to-orange-400"
                    initial={{ left: '50%', right: '50%' }}
                    animate={{ left: `${pct(day.min)}%`, right: `${100 - pct(day.max)}%` }}
                    transition={{ duration: 0.7, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                  />
                  {i === 0 && (
                    <span
                      className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-canvas bg-ink"
                      style={{ left: `${Math.min(100, Math.max(0, pct(currentTemperature)))}%` }}
                    />
                  )}
                </span>
                <span className="tabular text-sm font-semibold">
                  <span className="sr-only">High </span>
                  {temperature(day.max, units)}
                </span>
                <ChevronDown className={`size-4 text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    id={panelId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-2 pb-4">
                      <p className="mb-3 text-sm text-ink-2">
                        {c.label}. Feels like {temperature(day.feelsMin, units)} to {temperature(day.feelsMax, units)}.
                      </p>
                      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          { icon: Umbrella, label: 'Rain', value: `${precipitation(day.precipitationSum, units)} · ${day.precipitationProbability}%`, sub: day.precipitationHours ? `${Math.round(day.precipitationHours)} wet hours` : 'Dry' },
                          { icon: Wind, label: 'Wind', value: speed(day.windSpeedMax, units), sub: `Gusts ${speed(day.windGustsMax, units)}` },
                          { icon: Navigation, label: 'Direction', value: `From ${compass(day.windDirection)}`, sub: `${Math.round(day.windDirection)}°` },
                          { icon: Sunrise, label: 'UV max', value: String(Math.round(day.uvIndexMax)), sub: uvLevel(day.uvIndexMax).label },
                          { icon: Sunrise, label: 'Sunrise', value: clock(day.sunrise, clockFormat), sub: '' },
                          { icon: Sunset, label: 'Sunset', value: clock(day.sunset, clockFormat), sub: '' },
                          { icon: Sunrise, label: 'Daylight', value: duration(day.daylightSeconds / 60), sub: '' },
                        ].map((item) => (
                          <div key={item.label} className="rounded-xl bg-ink/[0.05] px-3 py-2">
                            <dt className="flex items-center gap-1 text-[11px] font-medium text-ink-3">
                              <item.icon className="size-3" aria-hidden />
                              {item.label}
                            </dt>
                            <dd className="tabular text-sm font-semibold">{item.value}</dd>
                            {item.sub && <dd className="text-[11px] text-ink-3">{item.sub}</dd>}
                          </div>
                        ))}
                      </dl>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

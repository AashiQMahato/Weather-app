import { CalendarDays, Droplets } from 'lucide-react';
import { describeCondition } from '@/lib/conditions';
import { temperature, weekday } from '@/lib/format';
import type { DailyPoint, Units } from '@/lib/types';
import { Panel } from './Panel';

interface DailyForecastProps {
  days: DailyPoint[];
  today: string;
  currentTemperature: number;
  units: Units;
}

export function DailyForecast({ days, today, currentTemperature, units }: DailyForecastProps) {
  // Every bar shares one scale so days can be compared at a glance.
  const low = Math.min(...days.map((d) => d.min));
  const high = Math.max(...days.map((d) => d.max));
  const span = Math.max(high - low, 1);
  const pct = (value: number) => ((value - low) / span) * 100;

  return (
    <Panel title={`${days.length}-day forecast`} icon={CalendarDays}>
      <ul className="divide-y divide-white/10">
        {days.map((day, i) => {
          const { icon: Icon, label } = describeCondition(day.weatherCode, true);
          const isToday = i === 0;
          return (
            <li key={day.date} className="grid grid-cols-[3.25rem_2rem_2.75rem_1fr_2.75rem] items-center gap-3 py-3 sm:grid-cols-[4rem_2rem_3rem_2.75rem_1fr_2.75rem] lg:grid-cols-[2.75rem_1.75rem_2.5rem_1fr_2.5rem]">
              <span className="text-sm font-medium">{weekday(day.date, today)}</span>
              <Icon className="size-6" strokeWidth={1.5} aria-label={label} />
              <span
                className={`tabular hidden items-center gap-0.5 text-xs sm:inline-flex lg:hidden ${day.precipitationProbability >= 20 ? 'text-info' : 'text-transparent'}`}
                aria-hidden={day.precipitationProbability < 20}
              >
                <Droplets className="size-3" aria-hidden />
                {day.precipitationProbability}%
              </span>
              <span className="tabular text-right text-sm text-ink-3">
                <span className="sr-only">Low </span>
                {temperature(day.min, units)}
              </span>
              <span className="relative h-1.5 rounded-full bg-white/10" aria-hidden>
                <span
                  className="absolute inset-y-0 rounded-full bg-gradient-to-r from-sky-300 via-amber-200 to-orange-300"
                  style={{ left: `${pct(day.min)}%`, right: `${100 - pct(day.max)}%` }}
                />
                {isToday && (
                  <span
                    className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-900/50 bg-white"
                    style={{ left: `${Math.min(100, Math.max(0, pct(currentTemperature)))}%` }}
                  />
                )}
              </span>
              <span className="tabular text-sm font-semibold">
                <span className="sr-only">High </span>
                {temperature(day.max, units)}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

'use client';

import { Clock, Droplets } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import { describeCondition } from '@/lib/conditions';
import { hourLabel, temperature } from '@/lib/format';
import type { HourlyPoint, Units } from '@/lib/types';
import { Panel } from './Panel';

interface HourlyForecastProps {
  hours: HourlyPoint[];
  units: Units;
}

interface ChartDatum {
  label: string;
  value: number;
  rain: number;
}

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload as ChartDatum;
  return (
    <div className="rounded-lg border border-white/15 bg-slate-900/90 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="text-ink-3">{datum.label}</p>
      <p className="tabular text-sm font-semibold text-ink">{Math.round(datum.value)}°</p>
      <p className="tabular text-ink-2">{datum.rain}% rain</p>
    </div>
  );
}

export function HourlyForecast({ hours, units }: HourlyForecastProps) {
  const data: ChartDatum[] = hours.map((h, i) => ({
    label: i === 0 ? 'Now' : hourLabel(h.time),
    value: units === 'imperial' ? h.temperature * 1.8 + 32 : h.temperature,
    rain: h.precipitationProbability,
  }));

  return (
    <Panel title="Next 24 hours" icon={Clock}>
      <div className="h-36 w-full" role="img" aria-label="Temperature over the next 24 hours">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              interval={2}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'rgb(255 255 255 / 0.62)', fontSize: 11 }}
              dy={6}
              padding={{ left: 14, right: 14 }}
            />
            <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: 'rgb(255 255 255 / 0.4)', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#ffffff"
              strokeWidth={2}
              fill="url(#tempFill)"
              activeDot={{ r: 5, fill: '#ffffff', stroke: 'rgb(15 23 42 / 0.6)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <ol className="no-scrollbar -mx-5 mt-4 flex snap-x gap-1 overflow-x-auto px-5 pb-1">
        {hours.map((hour, i) => {
          const { icon: Icon, label } = describeCondition(hour.weatherCode, hour.isDay);
          return (
            <li
              key={hour.time}
              className={`flex min-w-[3.75rem] snap-start flex-col items-center gap-2 rounded-2xl px-2 py-3 ${i === 0 ? 'bg-white/10' : ''}`}
            >
              <span className="text-xs font-medium text-ink-2">{i === 0 ? 'Now' : hourLabel(hour.time)}</span>
              <Icon className="size-6" strokeWidth={1.5} aria-label={label} />
              <span className="tabular text-sm font-semibold">{temperature(hour.temperature, units)}</span>
              <span
                className={`tabular inline-flex items-center gap-0.5 text-[11px] ${hour.precipitationProbability >= 20 ? 'text-info' : 'text-transparent'}`}
                aria-hidden={hour.precipitationProbability < 20}
              >
                <Droplets className="size-3" aria-hidden />
                {hour.precipitationProbability}%
              </span>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

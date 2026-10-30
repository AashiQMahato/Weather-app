import { Cloud, Droplet, Eye, Gauge, Navigation, Sun, Sunrise, Umbrella, type LucideIcon } from 'lucide-react';
import { uvLevel } from '@/lib/insights';
import {
  clock,
  compass,
  distance,
  duration,
  minutesBetween,
  precipitation,
  pressure,
  speed,
  temperature,
} from '@/lib/format';
import type { WeatherReport, Units } from '@/lib/types';

interface TileProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  children?: React.ReactNode;
}

function Tile({ icon: Icon, label, value, detail, children }: TileProps) {
  return (
    <div className="panel flex min-h-36 flex-col p-4">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </h3>
      <p className="tabular mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      {children}
      {detail && <p className="mt-auto pt-3 text-xs leading-relaxed text-ink-2">{detail}</p>}
    </div>
  );
}

interface DetailsGridProps {
  report: WeatherReport;
  units: Units;
}

export function DetailsGrid({ report, units }: DetailsGridProps) {
  const { current, hourly, daily } = report;
  const today = daily[0];
  const now = hourly[0];
  const uv = uvLevel(now?.uvIndex ?? 0);
  const daylight = minutesBetween(today.sunrise, today.sunset);

  return (
    <section aria-label="Current details" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        icon={Navigation}
        label="Wind"
        value={speed(current.windSpeed, units)}
        detail={`Gusts ${speed(current.windGusts, units)}`}
      >
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-2">
          <Navigation
            className="size-3.5"
            style={{ transform: `rotate(${current.windDirection + 180}deg)` }}
            aria-hidden
          />
          From {compass(current.windDirection)}
        </p>
      </Tile>

      <Tile
        icon={Droplet}
        label="Humidity"
        value={`${Math.round(current.humidity)}%`}
        detail={now ? `Dew point ${temperature(now.dewPoint, units)}` : undefined}
      />

      <Tile icon={Sun} label="UV index" value={Math.round(now?.uvIndex ?? 0)} detail={`Peak today ${Math.round(today.uvIndexMax)}`}>
        <p className="mt-1 text-sm text-ink-2">{uv.label}</p>
        <div className="relative mt-3 h-1.5 rounded-full bg-gradient-to-r from-emerald-300 via-amber-300 to-rose-400" aria-hidden>
          <span
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-900/60 bg-white"
            style={{ left: `${Math.min(100, ((now?.uvIndex ?? 0) / 11) * 100)}%` }}
          />
        </div>
      </Tile>

      <Tile
        icon={Sunrise}
        label="Sunrise"
        value={clock(today.sunrise)}
        detail={`Sunset ${clock(today.sunset)} · ${duration(daylight)} of daylight`}
      />

      <Tile
        icon={Umbrella}
        label="Precipitation"
        value={precipitation(today.precipitationSum, units)}
        detail={`Expected today · ${today.precipitationProbability}% chance`}
      />

      <Tile
        icon={Eye}
        label="Visibility"
        value={now ? distance(now.visibility, units) : '—'}
        detail={now && now.visibility < 1000 ? 'Poor visibility, drive carefully' : 'Clear view'}
      />

      <Tile
        icon={Gauge}
        label="Pressure"
        value={pressure(current.pressure, units)}
        detail={current.pressure < 1000 ? 'Low pressure, unsettled' : current.pressure > 1020 ? 'High pressure, settled' : 'Normal range'}
      />

      <Tile
        icon={Cloud}
        label="Cloud cover"
        value={`${Math.round(current.cloudCover)}%`}
        detail={current.cloudCover < 25 ? 'Mostly clear skies' : current.cloudCover < 70 ? 'Some clouds' : 'Mostly cloudy'}
      />
    </section>
  );
}

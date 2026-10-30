import { Wind } from 'lucide-react';
import { aqiLevel } from '@/lib/insights';
import type { AirQuality } from '@/lib/types';
import { Panel } from './Panel';

const TONE_TEXT = {
  good: 'text-good',
  info: 'text-info',
  warning: 'text-warning',
  critical: 'text-critical',
} as const;

function Pollutant({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2">
      <dt className="text-[11px] font-medium text-ink-3">{label}</dt>
      <dd className="tabular text-sm font-semibold">
        {value == null ? '—' : Math.round(value)}
        <span className="ml-0.5 text-[10px] font-normal text-ink-3">µg/m³</span>
      </dd>
    </div>
  );
}

export function AirQualityPanel({ air }: { air: AirQuality | null }) {
  if (!air || air.usAqi == null) {
    return (
      <Panel title="Air quality" icon={Wind}>
        <p className="text-sm text-ink-2">Air quality data isn’t available for this location.</p>
      </Panel>
    );
  }

  const level = aqiLevel(air.usAqi);
  // US AQI scale tops out at 500, but nearly all readings sit under 300.
  const position = Math.min(100, (air.usAqi / 300) * 100);

  return (
    <Panel title="Air quality" icon={Wind}>
      <div className="flex items-baseline gap-3">
        <span className="tabular text-4xl font-semibold tracking-tight">{Math.round(air.usAqi)}</span>
        <span className={`text-sm font-medium ${TONE_TEXT[level.tone]}`}>{level.label}</span>
      </div>
      <p className="mt-0.5 text-xs text-ink-3">US AQI</p>
      <div
        className="relative mt-4 h-1.5 rounded-full bg-gradient-to-r from-emerald-300 via-amber-300 via-60% to-fuchsia-400"
        aria-hidden
      >
        <span
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-900/60 bg-white"
          style={{ left: `${position}%` }}
        />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-2">
        <Pollutant label="PM2.5" value={air.pm2_5} />
        <Pollutant label="PM10" value={air.pm10} />
        <Pollutant label="Ozone" value={air.ozone} />
        <Pollutant label="NO₂" value={air.nitrogenDioxide} />
      </dl>
    </Panel>
  );
}

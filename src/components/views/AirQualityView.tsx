'use client';

import { motion } from 'motion/react';
import { Activity, HeartPulse, Info, Users, Wind } from 'lucide-react';
import { LazyTrendChart } from '@/components/charts/LazyTrendChart';
import { EmptyState } from '@/components/ui/EmptyState';
import { Panel } from '@/components/ui/Panel';
import { DashboardSkeleton, PageHeader, WeatherError } from '@/components/ui/PageStates';
import { Stagger, StaggerItem } from '@/components/ui/Stagger';
import { hourLabel } from '@/lib/weather/format';
import { aqiLevel } from '@/lib/weather/risks';
import { usePreferences } from '@/providers/PreferencesProvider';
import { useWeatherReport } from '@/providers/WeatherProvider';

// US EPA AQI bands with the official category colors.
const BANDS = [
  { max: 50, label: 'Good', color: '#22c55e' },
  { max: 100, label: 'Moderate', color: '#eab308' },
  { max: 150, label: 'Sensitive groups', color: '#f97316' },
  { max: 200, label: 'Unhealthy', color: '#ef4444' },
  { max: 300, label: 'Very unhealthy', color: '#a855f7' },
  { max: 500, label: 'Hazardous', color: '#9f1239' },
];
const bandColor = (aqi: number) => (BANDS.find((b) => aqi <= b.max) ?? BANDS[5]).color;

// WHO 2021 air quality guideline levels (µg/m³): 24-hour means, 8-hour peak for ozone.
const POLLUTANTS = [
  { key: 'pm2_5', name: 'PM2.5', full: 'Fine particles', who: 15, about: 'Tiny particles from smoke, traffic and dust that reach deep into the lungs.' },
  { key: 'pm10', name: 'PM10', full: 'Coarse particles', who: 45, about: 'Dust, pollen and road particles that irritate the airways.' },
  { key: 'nitrogenDioxide', name: 'NO₂', full: 'Nitrogen dioxide', who: 25, about: 'Mainly from vehicle exhaust; inflames the airways.' },
  { key: 'ozone', name: 'O₃', full: 'Ozone', who: 100, about: 'Forms in sunlight from other pollutants; peaks on sunny afternoons.' },
  { key: 'sulphurDioxide', name: 'SO₂', full: 'Sulphur dioxide', who: 40, about: 'From burning coal and oil; can trigger asthma.' },
  { key: 'carbonMonoxide', name: 'CO', full: 'Carbon monoxide', who: 4000, about: 'From incomplete combustion; reduces oxygen delivery in the body.' },
] as const;

function AqiGauge({ aqi }: { aqi: number }) {
  const scale = 300;
  const angle = (Math.min(aqi, scale) / scale) * 180 - 90;
  let start = 0;
  return (
    <svg viewBox="0 0 220 124" className="w-full max-w-[260px]" aria-hidden>
      {BANDS.slice(0, 5).map((b) => {
        const from = start;
        const to = Math.min(b.max, scale);
        start = to;
        const a0 = Math.PI * (1 - from / scale);
        const a1 = Math.PI * (1 - to / scale);
        const p = (a: number, r: number) => `${110 + Math.cos(a) * r} ${112 - Math.sin(a) * r}`;
        return <path key={b.label} d={`M ${p(a0 - 0.012, 92)} A 92 92 0 0 1 ${p(a1 + 0.012, 92)}`} fill="none" stroke={b.color} strokeWidth="14" strokeLinecap="butt" opacity={0.9} />;
      })}
      <motion.g initial={{ rotate: -90 }} animate={{ rotate: angle }} transition={{ type: 'spring', stiffness: 50, damping: 12 }} style={{ transformOrigin: '110px 112px', transformBox: 'view-box' }}>
        <line x1="110" y1="112" x2="110" y2="34" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
      </motion.g>
      <circle cx="110" cy="112" r="6" fill="var(--ink)" />
    </svg>
  );
}

export function AirQualityView() {
  const { place, clock } = usePreferences();
  const { report, error, refresh } = useWeatherReport();

  if (error && !report) return <WeatherError message={error} onRetry={refresh} />;
  if (!report) return <DashboardSkeleton />;

  const air = report.airQuality;
  const header = <PageHeader title="Air Quality" description={`Pollution levels in ${place.name}, using the US EPA Air Quality Index. Model data from Copernicus CAMS via Open-Meteo.`} />;

  if (!air || air.usAqi == null) {
    return (
      <>
        {header}
        <div className="panel">
          <EmptyState icon={Wind} title="No air quality data here" body="The air quality model has no data for this location right now. Try a nearby city." />
        </div>
      </>
    );
  }

  const level = aqiLevel(air.usAqi);
  const ratios = POLLUTANTS.map((p) => ({ ...p, value: air[p.key], ratio: air[p.key] == null ? 0 : (air[p.key] as number) / p.who }));
  const dominant = ratios.reduce((a, b) => (b.ratio > a.ratio ? b : a));

  return (
    <>
      {header}
      <Stagger className="grid gap-5 lg:grid-cols-3 lg:gap-6">
        <StaggerItem>
          <Panel title="US AQI now" icon={Activity} className="h-full">
            <div className="flex flex-col items-center text-center">
              <AqiGauge aqi={air.usAqi} />
              <p className="tabular mt-2 text-6xl font-semibold tracking-tight">{Math.round(air.usAqi)}</p>
              <p className="mt-1 inline-flex items-center gap-2 text-base font-semibold">
                <span className="size-2.5 rounded-full" style={{ background: bandColor(air.usAqi) }} aria-hidden />
                {level.label}
              </p>
              <p className="mt-3 text-sm text-ink-2">
                Main pollutant vs WHO guideline: <span className="font-semibold text-ink">{dominant.name}</span> ({dominant.ratio.toFixed(1)}×)
              </p>
              {air.europeanAqi != null && <p className="mt-1 text-xs text-ink-3">European AQI: {Math.round(air.europeanAqi)}</p>}
            </div>
          </Panel>
        </StaggerItem>

        <StaggerItem className="lg:col-span-2">
          <Panel title="Health guidance" icon={HeartPulse} className="h-full">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl glass-1 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="size-4 text-ink-2" aria-hidden />
                  General public
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{level.general}</p>
              </div>
              <div className="rounded-2xl glass-1 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <HeartPulse className="size-4 text-ink-2" aria-hidden />
                  Sensitive groups
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{level.sensitive}</p>
                <p className="mt-2 text-xs text-ink-3">Children, older adults, and people with asthma, heart or lung disease.</p>
              </div>
            </div>
            <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="AQI scale">
              {BANDS.map((b) => (
                <li key={b.label} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${level.label.toLowerCase().includes(b.label.toLowerCase().split(' ')[0]) ? 'border-ink/30 font-semibold text-ink' : 'border-line text-ink-3'}`}>
                  <span className="size-2 rounded-full" style={{ background: b.color }} aria-hidden />
                  {b.label} · ≤{b.max}
                </li>
              ))}
            </ul>
          </Panel>
        </StaggerItem>

        <StaggerItem className="lg:col-span-3">
          <Panel title="Next 24 hours" icon={Activity}>
            <LazyTrendChart
              kind="bar"
              data={air.hourly.map((h, i) => {
                const v = h.usAqi ?? 0;
                return { label: i === 0 ? 'Now' : hourLabel(h.time, clock), value: v, note: aqiLevel(v).label, color: bandColor(v) };
              })}
              height={190}
              tickEvery={3}
              ariaLabel="US AQI for the next 24 hours, colored by category"
            />
          </Panel>
        </StaggerItem>

        <StaggerItem className="lg:col-span-3">
          <h2 className="mb-3 mt-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-3">Pollutants · compared with WHO 2021 guidelines</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ratios.map((p) => {
              const tone = p.ratio <= 1 ? 'bg-good' : p.ratio <= 2 ? 'bg-warning' : 'bg-critical';
              return (
                <li key={p.key} className="panel p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold">{p.name}</p>
                      <p className="text-xs text-ink-3">{p.full}</p>
                    </div>
                    <p className="tabular text-2xl font-semibold">
                      {p.value == null ? '—' : Math.round(p.value as number)}
                      <span className="ml-1 text-xs font-normal text-ink-3">µg/m³</span>
                    </p>
                  </div>
                  <div className="relative mt-4 h-1.5 rounded-full bg-ink/10" aria-hidden>
                    <motion.div className={`absolute inset-y-0 left-0 rounded-full ${tone}`} initial={{ width: 0 }} animate={{ width: `${Math.min(100, (p.ratio / 3) * 100)}%` }} transition={{ duration: 0.9 }} />
                    <span className="absolute inset-y-[-3px] w-0.5 rounded bg-ink/60" style={{ left: `${100 / 3}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-ink-2">
                    {p.value == null ? 'Not available' : `${p.ratio.toFixed(1)}× the WHO guideline (${p.who} µg/m³)`}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-ink-3">{p.about}</p>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 flex items-start gap-2 text-xs text-ink-3">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Current hourly concentrations are compared with WHO 24-hour guidelines (8-hour for ozone) for reference only. The marker shows the guideline level.
          </p>
        </StaggerItem>
      </Stagger>
    </>
  );
}

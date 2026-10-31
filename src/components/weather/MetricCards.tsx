'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Cloud, Droplet, Droplets, Eye, Gauge, Navigation, Sun, Thermometer, Wind, type LucideIcon } from 'lucide-react';
import { LazyTrendChart, type TrendDatum } from '@/components/charts/LazyTrendChart';
import { Modal } from '@/components/ui/Modal';
import { aqiLevel, uvLevel, type Tone } from '@/lib/weather/risks';
import { compass, distance, hourLabel, pressure, speed, speedUnit, speedValue, tempValue, temperature } from '@/lib/weather/format';
import type { ClockFormat, HourlyPoint, Units, WeatherReport } from '@/lib/types';
import { usePreferences } from '@/providers/PreferencesProvider';

const TONE_TEXT: Record<Tone, string> = { good: 'text-good', info: 'text-info', warning: 'text-warning', critical: 'text-critical' };

function Bar({ value, gradient }: { value: number; gradient?: string }) {
  return (
    <div className="relative h-1.5 overflow-hidden rounded-full bg-ink/10" aria-hidden>
      <motion.div
        className={`absolute inset-y-0 left-0 rounded-full ${gradient ?? 'bg-accent'}`}
        initial={{ width: 0 }}
        whileInView={{ width: `${Math.min(100, Math.max(2, value))}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

function ScaleMarker({ position, gradient }: { position: number; gradient: string }) {
  return (
    <div className={`relative h-1.5 rounded-full ${gradient}`} aria-hidden>
      <motion.span
        className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-canvas bg-ink shadow"
        initial={{ left: '0%' }}
        whileInView={{ left: `${Math.min(100, Math.max(0, position))}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

function CompassDial({ degrees }: { degrees: number }) {
  return (
    <svg viewBox="0 0 64 64" className="size-16 shrink-0" aria-hidden>
      <circle cx="32" cy="32" r="29" fill="none" stroke="var(--line)" strokeWidth="2" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1="32" y1="5" x2="32" y2={i % 3 === 0 ? 10 : 8} stroke="var(--ink-3)" strokeWidth={i % 3 === 0 ? 1.6 : 1} transform={`rotate(${i * 30} 32 32)`} />
      ))}
      {(['N', 'E', 'S', 'W'] as const).map((d, i) => (
        <text key={d} x="32" y="17" textAnchor="middle" fontSize="7" fontWeight="600" fill="var(--ink-3)" transform={`rotate(${i * 90} 32 32)`}>
          {d}
        </text>
      ))}
      <motion.g initial={{ rotate: 0 }} whileInView={{ rotate: degrees + 180 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 60, damping: 12 }} style={{ transformOrigin: '32px 32px', transformBox: 'view-box' }}>
        <path d="M32 14 L36 34 L32 31 L28 34 Z" fill="var(--accent)" />
        <path d="M32 50 L28 30 L32 33 L36 30 Z" fill="var(--ink-3)" opacity="0.5" />
      </motion.g>
      <circle cx="32" cy="32" r="2.5" fill="var(--ink)" />
    </svg>
  );
}

function PressureGauge({ hpa }: { hpa: number }) {
  const t = Math.min(1, Math.max(0, (hpa - 970) / 80));
  const angle = -120 + t * 240;
  return (
    <svg viewBox="0 0 64 44" className="h-11 w-16 shrink-0" aria-hidden>
      <path d="M8 40 A26 26 0 1 1 56 40" fill="none" stroke="var(--line)" strokeWidth="4" strokeLinecap="round" />
      <motion.g initial={{ rotate: -120 }} whileInView={{ rotate: angle }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 60, damping: 12 }} style={{ transformOrigin: '32px 30px', transformBox: 'view-box' }}>
        <line x1="32" y1="30" x2="32" y2="9" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
      </motion.g>
      <circle cx="32" cy="30" r="3" fill="var(--ink)" />
    </svg>
  );
}

function MiniBars({ values }: { values: number[] }) {
  return (
    <div className="flex h-9 items-end gap-[2px]" aria-hidden>
      {values.map((v, i) => (
        <motion.span
          key={i}
          className="flex-1 rounded-t-[3px] bg-info"
          initial={{ height: 2 }}
          whileInView={{ height: `${Math.max(6, v)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: i * 0.03 }}
          style={{ opacity: 0.45 + (v / 100) * 0.55 }}
        />
      ))}
    </div>
  );
}

interface MetricDef {
  id: string;
  title: string;
  icon: LucideIcon;
  value: string;
  status?: { label: string; tone: Tone };
  indicator: React.ReactNode;
  explanation: string;
  detail: { about: string; series: TrendDatum[]; kind: 'area' | 'bar'; unit: string; decimals?: number; domain?: [number, number] };
}

function buildMetrics(report: WeatherReport, units: Units, clockFormat: ClockFormat): MetricDef[] {
  const { current: c, hourly, airQuality } = report;
  const next24 = hourly.slice(0, 24);
  const series = (value: (h: HourlyPoint) => number, note?: (h: HourlyPoint) => string): TrendDatum[] =>
    next24.map((h, i) => ({ label: i === 0 ? 'Now' : hourLabel(h.time, clockFormat), value: value(h), note: note?.(h) }));
  const uv = uvLevel(c.uvIndex);
  const pressureIn3h = hourly[3]?.pressure ?? c.pressure;
  const pressureTrend = pressureIn3h - c.pressure > 1 ? 'Rising' : pressureIn3h - c.pressure < -1 ? 'Falling' : 'Steady';
  const dewComfort =
    c.dewPoint < 10 ? { label: 'Dry', tone: 'good' as Tone } : c.dewPoint < 16 ? { label: 'Comfortable', tone: 'good' as Tone } : c.dewPoint < 20 ? { label: 'Slightly humid', tone: 'info' as Tone } : c.dewPoint < 24 ? { label: 'Muggy', tone: 'warning' as Tone } : { label: 'Oppressive', tone: 'critical' as Tone };
  const next12Rain = next24.slice(0, 12).map((h) => h.precipitationProbability);
  const maxRain = Math.max(0, ...next12Rain);
  const tempUnit = units === 'imperial' ? '°F' : '°C';

  const metrics: MetricDef[] = [
    {
      id: 'humidity',
      title: 'Humidity',
      icon: Droplet,
      value: `${Math.round(c.humidity)}%`,
      indicator: <Bar value={c.humidity} gradient="bg-gradient-to-r from-sky-300 to-blue-500" />,
      explanation: c.humidity >= 80 ? 'Very humid air; sweat evaporates slowly.' : c.humidity <= 30 ? 'Dry air; skin and eyes may feel dry.' : 'Comfortable moisture level.',
      detail: { about: 'Relative humidity is how close the air is to saturation at the current temperature. Pair it with dew point to judge comfort.', series: series((h) => h.humidity), kind: 'area', unit: '%', domain: [0, 100] },
    },
    {
      id: 'wind',
      title: 'Wind',
      icon: Wind,
      value: speed(c.windSpeed, units),
      indicator: (
        <div className="flex items-center gap-3">
          <CompassDial degrees={c.windDirection} />
          <div className="text-xs leading-relaxed text-ink-2">
            <p className="flex items-center gap-1">
              <Navigation className="size-3" style={{ transform: `rotate(${c.windDirection + 180}deg)` }} aria-hidden />
              From {compass(c.windDirection)}
            </p>
            <p>Gusts {speed(c.windGusts, units)}</p>
          </div>
        </div>
      ),
      explanation: c.windGusts >= 50 ? 'Strong gusts; secure loose objects.' : c.windSpeed >= 20 ? 'Breezy; noticeable on bikes.' : 'Light wind.',
      detail: {
        about: 'Sustained wind at 10 m above ground. Gusts are short bursts that can be much stronger, and they matter most for cycling and loose objects.',
        series: series((h) => speedValue(h.windSpeed, units), (h) => `Gusts ${speed(h.windGusts, units)} · from ${compass(h.windDirection)}`),
        kind: 'area',
        unit: ` ${speedUnit(units)}`,
      },
    },
    {
      id: 'uv',
      title: 'UV index',
      icon: Sun,
      value: String(Math.round(c.uvIndex)),
      status: { label: uv.label, tone: uv.tone },
      indicator: <ScaleMarker position={(c.uvIndex / 11) * 100} gradient="bg-gradient-to-r from-emerald-400 via-amber-300 via-60% to-fuchsia-500" />,
      explanation: uv.advice,
      detail: { about: 'The UV index measures sunburn-causing ultraviolet radiation. 3+ needs protection, 8+ burns unprotected skin within minutes.', series: series((h) => h.uvIndex), kind: 'bar', unit: '', decimals: 1, domain: [0, 11] },
    },
    {
      id: 'precip',
      title: 'Rain chance',
      icon: Droplets,
      value: `${maxRain}%`,
      indicator: <MiniBars values={next12Rain} />,
      explanation: maxRain >= 60 ? 'Rain is likely in the next 12 hours.' : maxRain >= 30 ? 'Some chance of showers in the next 12 hours.' : 'Mostly dry for the next 12 hours.',
      detail: { about: 'Chance that at least 0.1 mm of precipitation falls in each hour, from the forecast model. Bars show the next 24 hours.', series: series((h) => h.precipitationProbability, (h) => `${h.precipitation.toFixed(1)} mm expected`), kind: 'bar', unit: '%', domain: [0, 100] },
    },
    {
      id: 'dew',
      title: 'Dew point',
      icon: Thermometer,
      value: temperature(c.dewPoint, units),
      status: dewComfort,
      indicator: <ScaleMarker position={((c.dewPoint + 5) / 32) * 100} gradient="bg-gradient-to-r from-sky-300 via-emerald-300 via-45% to-rose-400" />,
      explanation: `Air feels ${dewComfort.label.toLowerCase()}. Above ${temperature(20, units)} feels sticky.`,
      detail: { about: 'Dew point is the temperature at which air becomes saturated. It is a better comfort guide than humidity: higher dew points feel muggier.', series: series((h) => tempValue(h.dewPoint, units)), kind: 'area', unit: tempUnit },
    },
    {
      id: 'visibility',
      title: 'Visibility',
      icon: Eye,
      value: distance(c.visibility, units),
      indicator: <Bar value={(c.visibility / 20_000) * 100} gradient="bg-gradient-to-r from-slate-300 to-sky-300" />,
      explanation: c.visibility < 1000 ? 'Poor visibility; drive carefully.' : c.visibility < 5000 ? 'Hazy or misty.' : 'Clear view.',
      detail: { about: 'How far you can see clearly. Fog, haze, smoke and heavy precipitation all reduce it.', series: series((h) => (units === 'imperial' ? h.visibility / 1609.34 : h.visibility / 1000)), kind: 'area', unit: units === 'imperial' ? ' mi' : ' km', decimals: 1, domain: [0, units === 'imperial' ? 15 : 25] },
    },
    {
      id: 'pressure',
      title: 'Pressure',
      icon: Gauge,
      value: pressure(c.pressure, units),
      indicator: (
        <div className="flex items-center gap-3">
          <PressureGauge hpa={c.pressure} />
          <p className="text-xs text-ink-2">{pressureTrend} over the next 3 hours</p>
        </div>
      ),
      explanation: c.pressure < 1000 ? 'Low pressure: unsettled weather is likely.' : c.pressure > 1022 ? 'High pressure: settled, stable weather.' : 'Near-normal pressure.',
      detail: {
        about: 'Sea-level atmospheric pressure. Falling pressure often brings clouds and rain; rising pressure usually means clearing, settled weather.',
        series: series((h) => (units === 'imperial' ? h.pressure * 0.02953 : h.pressure)),
        kind: 'area',
        unit: units === 'imperial' ? ' inHg' : ' hPa',
        decimals: units === 'imperial' ? 2 : 0,
      },
    },
    {
      id: 'cloud',
      title: 'Cloud cover',
      icon: Cloud,
      value: `${Math.round(c.cloudCover)}%`,
      indicator: <Bar value={c.cloudCover} gradient="bg-gradient-to-r from-slate-300 to-slate-500" />,
      explanation: c.cloudCover < 25 ? 'Mostly clear skies.' : c.cloudCover < 70 ? 'A mix of sun and cloud.' : 'Mostly cloudy.',
      detail: { about: 'Share of the sky covered by cloud at all heights.', series: series((h) => h.cloudCover), kind: 'area', unit: '%', domain: [0, 100] },
    },
  ];

  if (airQuality?.usAqi != null) {
    const level = aqiLevel(airQuality.usAqi);
    metrics.push({
      id: 'aqi',
      title: 'Air quality',
      icon: Wind,
      value: String(Math.round(airQuality.usAqi)),
      status: { label: level.label, tone: level.tone },
      indicator: <ScaleMarker position={(airQuality.usAqi / 300) * 100} gradient="bg-gradient-to-r from-emerald-400 via-amber-300 via-50% to-fuchsia-500" />,
      explanation: level.general,
      detail: {
        about: 'US EPA Air Quality Index from the CAMS model: 0–50 good, 51–100 moderate, 101–150 unhealthy for sensitive groups, 151+ unhealthy.',
        series: airQuality.hourly.map((h, i) => ({ label: i === 0 ? 'Now' : hourLabel(h.time, clockFormat), value: h.usAqi ?? 0 })),
        kind: 'bar',
        unit: '',
      },
    });
  }
  return metrics;
}

export function MetricCards({ report }: { report: WeatherReport }) {
  const { units, clock } = usePreferences();
  const [openId, setOpenId] = useState<string | null>(null);
  const metrics = buildMetrics(report, units, clock);
  const open = metrics.find((m) => m.id === openId);
  const stats = open ? open.detail.series.map((d) => d.value) : [];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {metrics.map((m, i) => (
          <motion.button
            key={m.id}
            type="button"
            onClick={() => setOpenId(m.id)}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: (i % 3) * 0.05 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985 }}
            className="panel group flex min-h-44 flex-col p-4 text-left transition-shadow hover:shadow-xl sm:p-5"
            aria-label={`${m.title}: ${m.value}. Open details`}
          >
            <span className="flex w-full items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-3">
                <m.icon className="size-3.5" aria-hidden />
                {m.title}
              </span>
              <ChevronRight className="size-4 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </span>
            <span className="mt-3 flex items-baseline gap-2">
              <span className="tabular text-[28px] font-semibold leading-none tracking-tight">{m.value}</span>
              {m.status && <span className={`text-xs font-semibold ${TONE_TEXT[m.status.tone]}`}>{m.status.label}</span>}
            </span>
            <span className="mt-4 block">{m.indicator}</span>
            <span className="mt-auto block pt-3 text-xs leading-relaxed text-ink-2">{m.explanation}</span>
          </motion.button>
        ))}
      </div>

      <Modal open={Boolean(open)} onClose={() => setOpenId(null)} title={open?.title ?? ''} description="Next 24 hours" variant="sheet">
        {open && (
          <div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['Now', stats[0]],
                ['Low', Math.min(...stats)],
                ['High', Math.max(...stats)],
              ].map(([label, v]) => (
                <div key={label as string} className="rounded-2xl bg-ink/[0.05] px-3 py-2.5">
                  <p className="text-[11px] font-medium text-ink-3">{label}</p>
                  <p className="tabular text-lg font-semibold">
                    {(v as number).toFixed(open.detail.decimals ?? 0)}
                    <span className="text-sm font-normal text-ink-3">{open.detail.unit}</span>
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <LazyTrendChart
                data={open.detail.series}
                kind={open.detail.kind}
                unit={open.detail.unit}
                decimals={open.detail.decimals}
                domain={open.detail.domain}
                color={open.detail.kind === 'bar' ? 'var(--info)' : 'var(--accent)'}
                height={200}
                tickEvery={4}
                ariaLabel={`${open.title} over the next 24 hours`}
              />
            </div>
            <p className="mt-5 text-sm leading-relaxed text-ink-2">{open.detail.about}</p>
          </div>
        )}
      </Modal>
    </>
  );
}

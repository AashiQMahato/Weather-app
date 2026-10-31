'use client';

import { useEffect, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { Sunrise } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { clock, duration, localNow, minutesOfDay } from '@/lib/weather/format';
import type { WeatherReport } from '@/lib/types';
import { usePreferences } from '@/providers/PreferencesProvider';

const W = 320;
const H = 150;
const BASE = 122;
const RX = 136;
const RY = 96;
const CX = W / 2;

const point = (t: number) => ({ x: CX - RX * Math.cos(Math.PI * t), y: BASE - RY * Math.sin(Math.PI * t) });

/** Sun trajectory between today's sunrise and sunset, positioned at the place's local time. */
export function SunPath({ report }: { report: WeatherReport }) {
  const { clock: clockFormat } = usePreferences();
  const reduce = useReducedMotion();
  const [now, setNow] = useState(report.current.time);
  const today = report.daily[0];
  const tomorrow = report.daily[1];

  useEffect(() => {
    const tick = () => setNow(localNow(report.utcOffsetSeconds));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [report.utcOffsetSeconds]);

  const rise = minutesOfDay(today.sunrise);
  const set = minutesOfDay(today.sunset);
  const nowMin = now.slice(0, 10) === today.date ? minutesOfDay(now) : rise - 1;
  const t = Math.min(1, Math.max(0, (nowMin - rise) / Math.max(1, set - rise)));
  const isDaytime = nowMin >= rise && nowMin <= set;
  const remaining = set - nowMin;

  const progress = useMotionValue(0);
  useEffect(() => {
    const controls = animate(progress, t, { duration: reduce ? 0 : 1.6, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [t, progress, reduce]);
  const sunX = useTransform(progress, (p) => point(p).x);
  const sunY = useTransform(progress, (p) => point(p).y);
  const traveled = useTransform(progress, (p) => p);

  const arc = `M ${CX - RX} ${BASE} A ${RX} ${RY} 0 0 1 ${CX + RX} ${BASE}`;

  let status: string;
  if (isDaytime) status = `${duration(remaining)} of daylight left`;
  else if (nowMin < rise) status = `Sunrise in ${duration(rise - nowMin)}`;
  else status = tomorrow ? `Sunrise tomorrow at ${clock(tomorrow.sunrise, clockFormat)}` : 'The sun has set';

  return (
    <Panel title="Sun" icon={Sunrise}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Sunrise ${clock(today.sunrise, clockFormat)}, sunset ${clock(today.sunset, clockFormat)}. ${status}.`}>
        <defs>
          <linearGradient id="sun-arc" x1="0" x2="1">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="50%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
          <radialGradient id="sun-glow">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <line x1="8" y1={BASE} x2={W - 8} y2={BASE} stroke="var(--line)" strokeWidth="1.5" />
        <path d={arc} fill="none" stroke="var(--ink-3)" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="3 5" />
        <motion.path d={arc} fill="none" stroke="url(#sun-arc)" strokeWidth="3" strokeLinecap="round" style={{ pathLength: traveled }} />
        {isDaytime ? (
          <motion.g style={{ x: sunX, y: sunY }}>
            <circle r="18" fill="url(#sun-glow)" />
            <circle r="8" fill="#fcd34d" stroke="#fff7d6" strokeWidth="2" />
          </motion.g>
        ) : (
          <circle cx={nowMin < rise ? CX - RX : CX + RX} cy={BASE} r="6" fill="var(--ink-3)" opacity="0.6" />
        )}
        <text x={CX - RX} y={BASE + 20} textAnchor="middle" fontSize="11" fill="var(--ink-3)">
          {clock(today.sunrise, clockFormat)}
        </text>
        <text x={CX + RX} y={BASE + 20} textAnchor="middle" fontSize="11" fill="var(--ink-3)">
          {clock(today.sunset, clockFormat)}
        </text>
      </svg>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-[11px] font-medium text-ink-3">Daylight</dt>
          <dd className="tabular text-sm font-semibold">{duration(today.daylightSeconds / 60)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium text-ink-3">{isDaytime ? 'Remaining' : 'Status'}</dt>
          <dd className="tabular text-sm font-semibold">{isDaytime ? duration(remaining) : nowMin < rise ? 'Before dawn' : 'After dark'}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium text-ink-3">Solar noon</dt>
          <dd className="tabular text-sm font-semibold">
            {clock(`${today.date}T${String(Math.floor((rise + set) / 2 / 60)).padStart(2, '0')}:${String(Math.round((rise + set) / 2) % 60).padStart(2, '0')}`, clockFormat)}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-center text-xs text-ink-3">{status}</p>
    </Panel>
  );
}

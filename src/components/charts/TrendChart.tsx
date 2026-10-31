'use client';

import { useId } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';

export interface TrendDatum {
  label: string;
  value: number;
  /** Secondary line shown in the tooltip, e.g. "40% rain". */
  note?: string;
  /** Per-bar color override (bar charts only). */
  color?: string;
}

export interface TrendChartProps {
  data: TrendDatum[];
  kind?: 'area' | 'bar';
  color?: string;
  unit?: string;
  height?: number;
  /** Fixed y-domain; defaults to the data range with padding. */
  domain?: [number | string, number | string];
  decimals?: number;
  tickEvery?: number;
  showGrid?: boolean;
  ariaLabel: string;
}

function ChartTooltip({ active, payload, unit = '', decimals = 0 }: TooltipProps<number, string> & { unit?: string; decimals?: number }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as TrendDatum;
  return (
    <div className="panel-strong rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-ink-3">{d.label}</p>
      <p className="tabular text-sm font-semibold text-ink">
        {d.value.toFixed(decimals)}
        {unit}
      </p>
      {d.note && <p className="tabular text-ink-2">{d.note}</p>}
    </div>
  );
}

/** Single-series chart: area for continuous values, bars for amounts. No dual axes. */
export default function TrendChart({
  data,
  kind = 'area',
  color = 'var(--accent)',
  unit = '',
  height = 160,
  domain,
  decimals = 0,
  tickEvery = 3,
  showGrid = true,
  ariaLabel,
}: TrendChartProps) {
  const gradientId = `fill-${useId().replace(/:/g, '')}`;
  const values = data.map((d) => d.value);
  const pad = Math.max(1, (Math.max(...values) - Math.min(...values)) * 0.15);
  const areaDomain: [number | string, number | string] = domain ?? [Math.floor(Math.min(...values) - pad), Math.ceil(Math.max(...values) + pad)];
  const axis = {
    tickLine: false,
    axisLine: false,
    tick: { fill: 'var(--ink-3)', fontSize: 11 },
  } as const;
  const tooltip = (
    <Tooltip
      content={<ChartTooltip unit={unit} decimals={decimals} />}
      cursor={kind === 'area' ? { stroke: 'var(--ink-3)', strokeWidth: 1, strokeDasharray: '3 3' } : { fill: 'var(--line)' }}
    />
  );

  return (
    <div role="img" aria-label={ariaLabel} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {kind === 'area' ? (
          <AreaChart data={data} margin={{ top: 10, right: 6, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.32} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            {showGrid && <CartesianGrid vertical={false} stroke="var(--line)" />}
            <XAxis dataKey="label" interval={tickEvery - 1} {...axis} dy={6} padding={{ left: 8, right: 8 }} />
            <YAxis {...axis} width={44} domain={areaDomain} tickCount={4} allowDecimals={false} tickFormatter={(v: number) => `${Math.round(v)}${unit.trim().length <= 1 ? unit : ''}`} />
            {tooltip}
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 5, fill: color, stroke: 'var(--canvas)', strokeWidth: 2 }}
              animationDuration={900}
              animationEasing="ease-out"
            />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 10, right: 6, bottom: 0, left: -18 }} barCategoryGap={2}>
            {showGrid && <CartesianGrid vertical={false} stroke="var(--line)" />}
            <XAxis dataKey="label" interval={tickEvery - 1} {...axis} dy={6} />
            <YAxis {...axis} width={44} domain={domain ?? [0, 'auto']} tickCount={4} allowDecimals={false} />
            {tooltip}
            <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={800} maxBarSize={22}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color ?? color} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

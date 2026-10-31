'use client';

import dynamic from 'next/dynamic';
import type { TrendChartProps } from './TrendChart';

// Recharts is the largest client dependency; load it only where a chart renders.
const TrendChart = dynamic(() => import('./TrendChart'), {
  ssr: false,
  loading: () => <div className="skeleton h-full min-h-32 w-full" />,
});

export function LazyTrendChart(props: TrendChartProps) {
  return (
    <div style={{ height: props.height ?? 160 }}>
      <TrendChart {...props} />
    </div>
  );
}

export type { TrendDatum } from './TrendChart';

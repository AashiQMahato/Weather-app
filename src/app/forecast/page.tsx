import type { Metadata } from 'next';
import { ForecastView } from '@/components/views/ForecastView';

export const metadata: Metadata = { title: 'Forecast', description: '48-hour and 14-day weather forecast.' };

export default function ForecastPage() {
  return <ForecastView />;
}

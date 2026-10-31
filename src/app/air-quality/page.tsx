import type { Metadata } from 'next';
import { AirQualityView } from '@/components/views/AirQualityView';

export const metadata: Metadata = { title: 'Air Quality', description: 'US AQI, PM2.5, PM10, NO₂ and ozone with health guidance.' };

export default function AirQualityPage() {
  return <AirQualityView />;
}

import type { Metadata } from 'next';
import { MapView } from '@/components/views/MapView';

export const metadata: Metadata = { title: 'Weather Maps', description: 'Live radar, temperature, wind, cloud and precipitation maps.' };

export default function MapsPage() {
  return <MapView />;
}

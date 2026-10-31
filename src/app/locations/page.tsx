import type { Metadata } from 'next';
import { LocationsView } from '@/components/views/LocationsView';

export const metadata: Metadata = { title: 'Saved Locations', description: 'Your saved places with live weather, local time and AI comparison.' };

export default function LocationsPage() {
  return <LocationsView />;
}

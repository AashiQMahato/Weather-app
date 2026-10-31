import type { Metadata } from 'next';
import { SettingsView } from '@/components/views/SettingsView';

export const metadata: Metadata = { title: 'Settings', description: 'Units, time format, theme and data sources.' };

export default function SettingsPage() {
  return <SettingsView />;
}

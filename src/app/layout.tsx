import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });
// Geist has no Devanagari glyphs; this covers Nepali place names.
const devanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500'],
  variable: '--font-devanagari',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Skycast · Nepal weather forecast',
  description: 'Weather for Nepal: live conditions, hourly and 10-day forecasts, air quality and plain-language tips for Kathmandu, Pokhara and every city in Nepal.',
  applicationName: 'Skycast',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b1a33',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${devanagari.variable}`}>
      <body>{children}</body>
    </html>
  );
}

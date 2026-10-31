import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Noto_Sans_Devanagari } from 'next/font/google';
import { AppShell } from '@/components/layout/AppShell';
import { Providers } from '@/providers/Providers';
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://weather-app-six-ochre-71.vercel.app'),
  title: { default: 'Skycast · Weather intelligence for Nepal', template: '%s · Skycast' },
  description:
    'Live weather, 14-day forecasts, radar maps, air quality and an AI weather assistant. Focused on Kathmandu, Pokhara and every city in Nepal.',
  applicationName: 'Skycast',
  openGraph: {
    title: 'Skycast · Weather intelligence',
    description: 'Live weather, radar, air quality and an AI assistant that explains it all.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a1426',
};

// Applies the saved or system theme before first paint, so there is no flash.
const themeScript = `(function(){try{var t=JSON.parse(localStorage.getItem('skycast:v2:theme')||'"system"');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${devanagari.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

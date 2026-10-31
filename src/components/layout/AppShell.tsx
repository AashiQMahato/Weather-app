'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { Monitor, Moon, MoreHorizontal, Sun } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Segmented } from '@/components/ui/Segmented';
import { SceneBackdrop } from '@/components/weather/SceneBackdrop';
import { describeCondition } from '@/lib/weather/conditions';
import type { ThemePreference } from '@/lib/types';
import { usePreferences } from '@/providers/PreferencesProvider';
import { useWeatherReport } from '@/providers/WeatherProvider';
import { MOBILE_MORE, MOBILE_PRIMARY, NAV_ITEMS, isActive } from './nav';
import { SearchBar } from './SearchBar';

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5 rounded-xl" aria-label="Skycast overview">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="" width={32} height={32} className="size-8 rounded-[10px] shadow-sm transition-transform group-hover:scale-105" />
      {!compact && (
        <span className="leading-none">
          <span className="block text-[17px] font-semibold tracking-tight">Skycast</span>
          <span className="mt-0.5 block text-[11px] font-medium text-ink-3">Weather intelligence</span>
        </span>
      )}
    </Link>
  );
}

export function ThemeSwitcher({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const { theme, setTheme } = usePreferences();
  const icon = (Icon: typeof Sun, label: string) => (
    <span className="flex items-center gap-1.5">
      <Icon className="size-3.5" aria-hidden />
      <span className={size === 'sm' ? 'sr-only' : ''}>{label}</span>
    </span>
  );
  return (
    <Segmented<ThemePreference>
      label="Theme"
      size="sm"
      value={theme}
      onChange={setTheme}
      options={[
        { value: 'light', label: icon(Sun, 'Light') },
        { value: 'dark', label: icon(Moon, 'Dark') },
        { value: 'system', label: icon(Monitor, 'Auto') },
      ]}
    />
  );
}

function UnitsSwitcher() {
  const { units, setUnits } = usePreferences();
  return (
    <Segmented
      label="Temperature unit"
      size="sm"
      value={units}
      onChange={setUnits}
      options={[
        { value: 'metric', label: '°C' },
        { value: 'imperial', label: '°F' },
      ]}
    />
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface px-4 py-6 backdrop-blur-2xl lg:flex">
      <div className="px-2">
        <Logo />
      </div>
      <nav aria-label="Main" className="mt-9 flex-1">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${active ? 'text-ink' : 'text-ink-2 hover:text-ink'}`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-xl bg-ink/[0.09] ring-1 ring-ink/[0.06]"
                      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                    />
                  )}
                  <item.icon className="relative size-[18px] transition-transform group-hover:scale-110" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                  <span className="relative">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="space-y-3 border-t border-line px-1 pt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-ink-3">Units</span>
          <UnitsSwitcher />
        </div>
        <ThemeSwitcher size="sm" />
      </div>
    </aside>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MOBILE_MORE.some((item) => isActive(pathname, item.href));
  const tab = (active: boolean) =>
    `relative flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${active ? 'text-ink' : 'text-ink-3'}`;

  return (
    <>
      <nav
        aria-label="Main"
        className="panel-strong fixed inset-x-3 bottom-3 z-30 flex rounded-[1.4rem] px-1 shadow-2xl lg:hidden"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        {MOBILE_PRIMARY.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={tab(active)}>
              {active && (
                <motion.span layoutId="tab-active" className="absolute inset-x-2 inset-y-1.5 rounded-2xl bg-ink/[0.08]" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />
              )}
              <item.icon className="relative size-5" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
              <span className="relative">{item.short}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setMoreOpen(true)} className={tab(moreActive)} aria-haspopup="dialog">
          {moreActive && <motion.span layoutId="tab-active" className="absolute inset-x-2 inset-y-1.5 rounded-2xl bg-ink/[0.08]" />}
          <MoreHorizontal className="relative size-5" aria-hidden />
          <span className="relative">More</span>
        </button>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More" variant="sheet">
        <ul className="space-y-1">
          {MOBILE_MORE.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMoreOpen(false)}
                aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                className="flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium hover:bg-ink/[0.06] aria-[current=page]:bg-ink/[0.08]"
              >
                <item.icon className="size-5 text-ink-2" aria-hidden />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <UnitsSwitcher />
          <ThemeSwitcher />
        </div>
      </Modal>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { report } = useWeatherReport();
  const scene = report ? describeCondition(report.current.weatherCode, report.current.isDay).scene : 'clear-day';

  return (
    <>
      <SceneBackdrop scene={scene} />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-canvas">
        Skip to content
      </a>
      <Sidebar pathname={pathname} />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-transparent">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 lg:px-8 lg:py-4">
            <div className="lg:hidden">
              <Logo compact />
            </div>
            <div className="min-w-0 flex-1 lg:max-w-md">
              <SearchBar />
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-4 pb-32 pt-1 sm:px-6 lg:px-8 lg:pb-16">
          {children}
        </main>
      </div>
      <MobileNav pathname={pathname} />
    </>
  );
}

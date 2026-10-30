'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { CloudOff, RefreshCw, X } from 'lucide-react';
import { AirQualityPanel } from '@/components/AirQualityPanel';
import { CurrentHero } from '@/components/CurrentHero';
import { DailyForecast } from '@/components/DailyForecast';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { DetailsGrid } from '@/components/DetailsGrid';
import { HourlyForecast } from '@/components/HourlyForecast';
import { InsightsPanel } from '@/components/InsightsPanel';
import { NepalCities } from '@/components/NepalCities';
import { SearchBar } from '@/components/SearchBar';
import { usePersistentState } from '@/hooks/usePersistentState';
import { useWeather } from '@/hooks/useWeather';
import { describeCondition } from '@/lib/conditions';
import { buildInsights } from '@/lib/insights';
import { DEFAULT_PLACE, DEFAULT_SAVED } from '@/lib/nepal';
import type { Place, Units } from '@/lib/types';

export default function Home() {
  // v2 keys: the earlier build defaulted to London, New York and Tokyo.
  const [place, setPlace, placeReady] = usePersistentState<Place>('skycast:v2:place', DEFAULT_PLACE);
  const [saved, setSaved] = usePersistentState<Place[]>('skycast:v2:saved', DEFAULT_SAVED);
  const [units, setUnits] = usePersistentState<Units>('skycast:units', 'metric');
  // Wait for the stored place so we don't fetch the default first and then refetch.
  const { report, error, loading, refresh, updatedAt } = useWeather(placeReady ? place : null);

  const scene = report ? describeCondition(report.current.weatherCode, report.current.isDay).scene : 'clear-day';
  const insights = useMemo(() => (report ? buildInsights(report, units) : []), [report, units]);
  const isSaved = saved.some((p) => p.id === place.id);

  useEffect(() => {
    document.title = report
      ? `${Math.round(units === 'imperial' ? report.current.temperature * 1.8 + 32 : report.current.temperature)}° ${place.name} · Skycast`
      : 'Skycast · Weather forecast';
  }, [report, place.name, units]);

  const toggleSaved = () =>
    setSaved((list) => (list.some((p) => p.id === place.id) ? list.filter((p) => p.id !== place.id) : [...list, place]));

  return (
    <div data-scene={scene} className="sky min-h-dvh">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-12 pt-5 sm:px-6 lg:gap-8 lg:px-8 lg:pt-8">
        <header className="flex flex-wrap items-center gap-3 sm:flex-nowrap sm:gap-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="size-8 rounded-lg" />
            Skycast
          </Link>
          <div className="order-last w-full sm:order-none sm:ml-auto sm:max-w-md">
            <SearchBar onSelect={setPlace} />
          </div>
          <div role="group" aria-label="Units" className="ml-auto flex rounded-full border border-white/15 bg-white/10 p-1 text-sm sm:ml-0">
            {(['metric', 'imperial'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnits(u)}
                aria-pressed={units === u}
                className={`h-8 rounded-full px-3 font-medium transition-colors ${units === u ? 'bg-white text-slate-900' : 'text-ink-2 hover:text-ink'}`}
              >
                {u === 'metric' ? '°C' : '°F'}
              </button>
            ))}
          </div>
        </header>

        {saved.length > 0 && (
          <nav aria-label="Saved places" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {saved.map((p) => {
              const selected = p.id === place.id;
              return (
                <span
                  key={p.id}
                  className={`group flex shrink-0 items-center rounded-full border text-sm transition-colors ${selected ? 'border-white/40 bg-white/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                >
                  <button
                    type="button"
                    onClick={() => setPlace(p)}
                    aria-current={selected ? 'true' : undefined}
                    className="h-9 rounded-full pl-4 pr-2 font-medium"
                  >
                    {p.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaved((list) => list.filter((x) => x.id !== p.id))}
                    aria-label={`Remove ${p.name}`}
                    className="mr-1 grid size-7 place-items-center rounded-full text-ink-3 hover:bg-white/10 hover:text-ink"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              );
            })}
          </nav>
        )}

        {error && !report ? (
          <div className="panel mx-auto mt-10 flex max-w-md flex-col items-center p-8 text-center" role="alert">
            <CloudOff className="size-10 text-ink-2" aria-hidden />
            <h1 className="mt-4 text-xl font-semibold">Couldn’t load the weather</h1>
            <p className="mt-2 text-sm text-ink-2">{error}</p>
            <button
              type="button"
              onClick={refresh}
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-slate-900 transition-opacity hover:opacity-90"
            >
              <RefreshCw className="size-4" aria-hidden />
              Try again
            </button>
          </div>
        ) : !report ? (
          <DashboardSkeleton />
        ) : (
          <main className={`flex flex-col gap-6 transition-opacity lg:gap-8 ${loading ? 'opacity-70' : ''}`} aria-busy={loading}>
            <CurrentHero
              place={place}
              current={report.current}
              today={report.daily[0]}
              units={units}
              saved={isSaved}
              onToggleSaved={toggleSaved}
            />

            <NepalCities units={units} selectedId={place.id} onSelect={setPlace} />

            {error && (
              <p role="status" className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning">
                Couldn’t refresh: {error} Showing the last loaded data.
              </p>
            )}

            <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
              <div className="flex min-w-0 flex-col gap-6 lg:col-span-2 lg:gap-8">
                <HourlyForecast hours={report.hourly} units={units} />
                <DetailsGrid report={report} units={units} />
              </div>
              <div className="flex min-w-0 flex-col gap-6 lg:gap-8">
                <InsightsPanel insights={insights} />
                <DailyForecast
                  days={report.daily}
                  today={report.current.time}
                  currentTemperature={report.current.temperature}
                  units={units}
                />
                <AirQualityPanel air={report.airQuality} />
              </div>
            </div>

            <footer className="flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-ink-3 sm:flex-row">
              <p>
                Weather data by{' '}
                <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
                  Open-Meteo
                </a>{' '}
                · {report.timezone.replace(/_/g, ' ')}
              </p>
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-white/10 hover:text-ink disabled:opacity-60"
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden />
                {updatedAt
                  ? `Updated ${new Date(updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                  : 'Refresh'}
              </button>
            </footer>
          </main>
        )}
      </div>
    </div>
  );
}

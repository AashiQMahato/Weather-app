'use client';

import { useEffect } from 'react';
import { AnalystCard } from '@/components/ai/AnalystCard';
import { DailyForecast } from '@/components/forecast/DailyForecast';
import { HourlyForecast } from '@/components/forecast/HourlyForecast';
import { DashboardSkeleton, WeatherError } from '@/components/ui/PageStates';
import { Stagger, StaggerItem } from '@/components/ui/Stagger';
import { AlertCenter } from '@/components/weather/AlertCenter';
import { Hero } from '@/components/weather/Hero';
import { MetricCards } from '@/components/weather/MetricCards';
import { NepalCities } from '@/components/weather/NepalCities';
import { SunPath } from '@/components/weather/SunPath';
import { useInsights } from '@/hooks/useInsights';
import { tempValue } from '@/lib/weather/format';
import { usePreferences } from '@/providers/PreferencesProvider';
import { useWeatherReport } from '@/providers/WeatherProvider';

export default function OverviewPage() {
  const { place, units } = usePreferences();
  const { report, error, loading, refresh, updatedAt } = useWeatherReport();
  const insights = useInsights(Boolean(report));

  useEffect(() => {
    document.title = report ? `${Math.round(tempValue(report.current.temperature, units))}° ${place.name} · Skycast` : 'Skycast · Weather intelligence';
  }, [report, place.name, units]);

  if (error && !report) return <WeatherError message={error} onRetry={refresh} />;
  if (!report) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 lg:space-y-8">
      <Hero report={report} loading={loading} updatedAt={updatedAt} onRefresh={refresh} />

      {error && (
        <p role="status" className="rounded-2xl bg-warning/10 px-4 py-2.5 text-sm text-warning ring-1 ring-warning/25">
          Couldn’t refresh: {error} Showing the last loaded data.
        </p>
      )}

      <Stagger className="grid gap-5 lg:grid-cols-3 lg:gap-6">
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-2 lg:gap-6">
          <StaggerItem>
            <AnalystCard data={insights.data} loading={insights.loading} error={insights.error} onRefresh={insights.refresh} />
          </StaggerItem>
          <StaggerItem>
            <HourlyForecast hours={report.hourly.slice(0, 24)} />
          </StaggerItem>
          <StaggerItem>
            <MetricCards report={report} />
          </StaggerItem>
        </div>
        <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
          <StaggerItem>
            <AlertCenter report={report} explainedRisks={insights.data?.risks} />
          </StaggerItem>
          <StaggerItem>
            <DailyForecast days={report.daily} today={report.current.time} currentTemperature={report.current.temperature} narrow />
          </StaggerItem>
          <StaggerItem>
            <SunPath report={report} />
          </StaggerItem>
        </div>
      </Stagger>

      <NepalCities />

      <p className="pb-2 text-center text-xs text-ink-3">
        Forecast and air quality by{' '}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
          Open-Meteo
        </a>{' '}
        · {report.timezone.replace(/_/g, ' ')} · elevation {Math.round(report.elevation)} m
      </p>
    </div>
  );
}

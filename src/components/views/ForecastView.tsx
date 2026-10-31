'use client';

import { TrendingUp } from 'lucide-react';
import { LazyTrendChart } from '@/components/charts/LazyTrendChart';
import { DailyForecast } from '@/components/forecast/DailyForecast';
import { HourlyForecast } from '@/components/forecast/HourlyForecast';
import { Panel } from '@/components/ui/Panel';
import { DashboardSkeleton, PageHeader, WeatherError } from '@/components/ui/PageStates';
import { Stagger, StaggerItem } from '@/components/ui/Stagger';
import { SunPath } from '@/components/weather/SunPath';
import { shortDate, tempValue, temperature, weekday } from '@/lib/weather/format';
import { usePreferences } from '@/providers/PreferencesProvider';
import { useWeatherReport } from '@/providers/WeatherProvider';

export function ForecastView() {
  const { place, units } = usePreferences();
  const { report, error, refresh } = useWeatherReport();

  if (error && !report) return <WeatherError message={error} onRetry={refresh} />;
  if (!report) return <DashboardSkeleton />;

  const days = report.daily;
  const warmest = days.reduce((a, b) => (b.max > a.max ? b : a));
  const wettest = days.reduce((a, b) => (b.precipitationSum > a.precipitationSum ? b : a));

  return (
    <>
      <PageHeader title="Forecast" description={`48-hour and 14-day outlook for ${place.name}, from the Open-Meteo forecast model.`} />
      <Stagger className="grid gap-5 lg:grid-cols-3 lg:gap-6">
        <StaggerItem className="lg:col-span-3">
          <HourlyForecast hours={report.hourly} title="Next 48 hours" />
        </StaggerItem>
        <StaggerItem className="lg:col-span-2">
          <DailyForecast days={days} today={report.current.time} currentTemperature={report.current.temperature} allowExtended />
        </StaggerItem>
        <div className="flex flex-col gap-5 lg:gap-6">
          <StaggerItem>
            <Panel title="Daily highs" icon={TrendingUp}>
              <LazyTrendChart
                data={days.map((d) => ({ label: shortDate(d.date), value: tempValue(d.max, units), note: `Low ${temperature(d.min, units)}` }))}
                unit="°"
                height={170}
                tickEvery={4}
                ariaLabel="Daily high temperature for the next 14 days"
              />
              <dl className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-ink/[0.05] px-3 py-2.5">
                  <dt className="text-[11px] font-medium text-ink-3">Warmest day</dt>
                  <dd className="text-sm font-semibold">
                    {weekday(warmest.date, report.current.time, 'long')} · {temperature(warmest.max, units)}
                  </dd>
                </div>
                <div className="rounded-xl bg-ink/[0.05] px-3 py-2.5">
                  <dt className="text-[11px] font-medium text-ink-3">Wettest day</dt>
                  <dd className="text-sm font-semibold">
                    {wettest.precipitationSum > 0 ? `${weekday(wettest.date, report.current.time, 'long')} · ${wettest.precipitationProbability}%` : 'No rain expected'}
                  </dd>
                </div>
              </dl>
            </Panel>
          </StaggerItem>
          <StaggerItem>
            <SunPath report={report} />
          </StaggerItem>
        </div>
      </Stagger>
    </>
  );
}

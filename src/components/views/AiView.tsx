'use client';

import { Lightbulb, ShieldAlert, Sparkles } from 'lucide-react';
import { AnalystCard } from '@/components/ai/AnalystCard';
import { Assistant } from '@/components/ai/Assistant';
import { ThinkingLines } from '@/components/ai/AiBadge';
import { Recommendations } from '@/components/ai/Recommendations';
import { Panel } from '@/components/ui/Panel';
import { PageHeader } from '@/components/ui/PageStates';
import { Stagger, StaggerItem } from '@/components/ui/Stagger';
import { RiskList } from '@/components/weather/AlertCenter';
import { useInsights } from '@/hooks/useInsights';
import { usePreferences } from '@/providers/PreferencesProvider';
import { useAiStatus, useWeatherReport } from '@/providers/WeatherProvider';

export function AiView() {
  const { place } = usePreferences();
  const { report } = useWeatherReport();
  const ai = useAiStatus();
  const insights = useInsights(Boolean(report));
  const data = insights.data;

  return (
    <>
      <PageHeader
        title="AI Weather"
        description={`An analyst, an assistant and practical recommendations for ${place.name}, all grounded in live forecast data.`}
        action={
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${ai.enabled ? 'bg-good/15 text-good' : 'glass-1 text-ink-3'}`}>
            <Sparkles className="size-3.5" aria-hidden />
            {!ai.checked ? 'Checking AI…' : ai.enabled ? `Groq · ${ai.model?.split('/').pop()}` : 'AI offline: automatic summaries'}
          </span>
        }
      />

      <Stagger className="grid gap-5 lg:grid-cols-5 lg:gap-6">
        <StaggerItem className="lg:col-span-3">
          <Assistant />
        </StaggerItem>
        <div className="flex flex-col gap-5 lg:col-span-2 lg:gap-6">
          <StaggerItem>
            <AnalystCard data={data} loading={insights.loading} error={insights.error} onRefresh={insights.refresh} variant="full" />
          </StaggerItem>
          <StaggerItem>
            <Panel title="Risk insights" icon={ShieldAlert}>
              <p className="-mt-2 mb-3 text-xs text-ink-3">Measured thresholds from the forecast, explained by AI. Not official warnings.</p>
              {data ? <RiskList risks={data.risks} /> : <ThinkingLines />}
            </Panel>
          </StaggerItem>
        </div>

        <StaggerItem className="lg:col-span-5">
          <div className="mb-3 mt-2 flex items-center gap-2">
            <Lightbulb className="size-4 text-ink-3" aria-hidden />
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-3">Smart recommendations</h2>
          </div>
          {data ? (
            <Recommendations items={data.analysis.recommendations} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="skeleton h-48" />
              ))}
            </div>
          )}
        </StaggerItem>
      </Stagger>
    </>
  );
}

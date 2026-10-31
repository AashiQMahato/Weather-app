'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, BadgeCheck, ChevronDown, CloudLightning, Droplets, ExternalLink, Eye, Flame, Info, ShieldAlert, Snowflake, Sun, Wind, type LucideIcon } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { getAlerts } from '@/lib/api';
import type { ExplainedRisk } from '@/lib/groq/schemas';
import { SEVERITY_TONE, detectRisks, type Risk } from '@/lib/weather/risks';
import type { AlertsResponse, WeatherReport } from '@/lib/types';
import { usePreferences } from '@/providers/PreferencesProvider';

const RISK_ICON: Record<Risk['kind'], LucideIcon> = {
  precipitation: Droplets,
  storm: CloudLightning,
  uv: Sun,
  wind: Wind,
  humidity: Droplets,
  air: Wind,
  heat: Flame,
  cold: Snowflake,
  visibility: Eye,
};

const TONE = {
  info: { text: 'text-info', bg: 'bg-info/10', ring: 'ring-info/25' },
  warning: { text: 'text-warning', bg: 'bg-warning/10', ring: 'ring-warning/25' },
  critical: { text: 'text-critical', bg: 'bg-critical/10', ring: 'ring-critical/25' },
  good: { text: 'text-good', bg: 'bg-good/10', ring: 'ring-good/25' },
} as const;

const SEVERITY_LABEL = { low: 'Low', moderate: 'Moderate', high: 'High', extreme: 'Extreme' } as const;

function formatWhen(iso: string | null) {
  if (!iso) return 'Not specified';
  return new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
}

export function RiskList({ risks, compact = false }: { risks: (Risk | ExplainedRisk)[]; compact?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  if (risks.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-good/10 p-4 ring-1 ring-good/20">
        <BadgeCheck className="size-5 shrink-0 text-good" aria-hidden />
        <p className="text-sm text-ink-2">No weather risks detected in the next 24 hours.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {risks.map((risk) => {
        const tone = TONE[SEVERITY_TONE[risk.severity]];
        const Icon = RISK_ICON[risk.kind];
        const explanation = 'explanation' in risk ? risk.explanation : null;
        const expanded = open === risk.id;
        return (
          <li key={risk.id} className={`rounded-2xl ${tone.bg} ring-1 ${tone.ring}`}>
            <button type="button" onClick={() => setOpen(expanded ? null : risk.id)} aria-expanded={expanded} className="flex w-full items-start gap-3 p-3.5 text-left">
              <Icon className={`mt-0.5 size-5 shrink-0 ${tone.text}`} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold">{risk.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone.text} ring-1 ${tone.ring}`}>{SEVERITY_LABEL[risk.severity]}</span>
                </span>
                <span className="mt-0.5 block text-sm text-ink-2">
                  {risk.measurement} · {risk.window}
                </span>
              </span>
              {!compact && <ChevronDown className={`mt-1 size-4 shrink-0 text-ink-3 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />}
            </button>
            <AnimatePresence initial={false}>
              {expanded && !compact && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="space-y-2 px-3.5 pb-3.5 pl-11 text-sm">
                    {explanation && <p className="leading-relaxed text-ink-2">{explanation}</p>}
                    <p className="text-xs text-ink-3">Threshold: {risk.basis}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}

/** Official alerts (verified source only) shown apart from model-derived risks. */
export function AlertCenter({ report, explainedRisks }: { report: WeatherReport; explainedRisks?: ExplainedRisk[] }) {
  const { place, units, clock } = usePreferences();
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const risks = explainedRisks ?? detectRisks(report, units, clock);

  useEffect(() => {
    const controller = new AbortController();
    setAlerts(null);
    setFailed(false);
    getAlerts(place, controller.signal)
      .then(setAlerts)
      .catch(() => !controller.signal.aborted && setFailed(true));
    return () => controller.abort();
  }, [place]);

  return (
    <Panel title="Alerts & risks" icon={ShieldAlert}>
      <section aria-label="Official alerts">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <BadgeCheck className="size-4 text-ink-2" aria-hidden />
          Official alerts
        </h3>
        {!alerts && !failed && <div className="skeleton h-14" />}
        {failed && <p className="text-sm text-ink-3">Could not check official alerts right now.</p>}
        {alerts && alerts.alerts.length > 0 && (
          <ul className="space-y-2">
            {alerts.alerts.map((a) => (
              <li key={a.id} className="rounded-2xl bg-critical/10 p-4 ring-1 ring-critical/25">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-critical" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{a.event}</p>
                    <p className="mt-0.5 text-sm text-ink-2">{a.headline}</p>
                    <p className="mt-2 text-xs text-ink-3">
                      Valid {formatWhen(a.onset)} to {formatWhen(a.expires)} · Severity {a.severity} · {a.sender}
                    </p>
                    <details className="mt-2 text-sm text-ink-2">
                      <summary className="cursor-pointer text-xs font-medium text-ink">Full alert text</summary>
                      <p className="mt-2 whitespace-pre-line leading-relaxed">{a.description}</p>
                      {a.instruction && <p className="mt-2 whitespace-pre-line font-medium leading-relaxed">{a.instruction}</p>}
                    </details>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {alerts && alerts.alerts.length === 0 && (
          <div className="flex items-start gap-3 rounded-2xl bg-ink/[0.05] p-3.5">
            <Info className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
            <p className="text-sm leading-relaxed text-ink-2">
              {alerts.supported && !alerts.note ? 'No active official alerts for this location.' : alerts.note}
              {alerts.source && (
                <a href={alerts.source.url} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-0.5 font-medium text-ink underline-offset-2 hover:underline">
                  {alerts.source.name}
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              )}
            </p>
          </div>
        )}
      </section>

      <section aria-label="Weather risk insights" className="mt-5">
        <h3 className="text-sm font-semibold">Risk insights</h3>
        <p className="mb-2 text-[11px] text-ink-3">Computed from forecast data. Not an official warning.</p>
        <RiskList risks={risks} />
      </section>
    </Panel>
  );
}

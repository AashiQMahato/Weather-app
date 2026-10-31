'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CalendarClock, ChevronDown, CloudRain, Cloud, RefreshCw, Sun, Sunrise, Thermometer, TriangleAlert, Wind, type LucideIcon } from 'lucide-react';
import type { InsightsResponse } from '@/lib/groq/schemas';
import { AiBadge, SourceChip, ThinkingLines } from './AiBadge';

const TOPIC_ICON: Record<string, LucideIcon> = {
  temperature: Thermometer,
  rain: CloudRain,
  wind: Wind,
  uv: Sun,
  air: Wind,
  sun: Sunrise,
  cloud: Cloud,
  tomorrow: CalendarClock,
};

const DETAIL_LABELS: [keyof InsightsResponse['analysis']['details'], string][] = [
  ['temperature', 'Temperature trend'],
  ['precipitation', 'Rain & precipitation'],
  ['activities', 'Outdoor activities'],
  ['inconveniences', 'Possible inconveniences'],
  ['tomorrow', "Tomorrow's outlook"],
];

interface AnalystCardProps {
  data: InsightsResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  variant?: 'compact' | 'full';
}

export function AnalystCard({ data, loading, error, onRefresh, variant = 'compact' }: AnalystCardProps) {
  const [expanded, setExpanded] = useState(variant === 'full');
  const analysis = data?.analysis;

  return (
    <section aria-label="AI weather analyst" className="panel relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-gradient-to-br from-sky-400/20 via-indigo-500/15 to-fuchsia-500/10 blur-3xl" aria-hidden />
      <header className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <AiBadge thinking={loading} />
          <div>
            <h2 className="text-[15px] font-semibold">AI Weather Analyst</h2>
            <div className="mt-0.5 flex items-center gap-2">{data ? <SourceChip source={data.source} model={data.model} /> : <span className="text-[11px] text-ink-3">Reading the live forecast…</span>}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh analysis"
          className="grid size-9 place-items-center rounded-full border border-line text-ink-2 transition-colors hover:bg-ink/10 hover:text-ink disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="relative mt-5">
        {loading && !analysis && <ThinkingLines lines={4} />}
        {error && !analysis && (
          <p role="alert" className="flex items-center gap-2 text-sm text-critical">
            <TriangleAlert className="size-4" aria-hidden />
            {error}
          </p>
        )}
        <AnimatePresence mode="wait">
          {analysis && (
            <motion.div key={data?.generatedAt} initial={{ opacity: 0, y: 6 }} animate={{ opacity: loading ? 0.6 : 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              <p className="text-lg font-semibold leading-snug tracking-tight sm:text-xl">{analysis.headline}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{analysis.summary}</p>

              <ul className={`mt-4 grid gap-2 ${variant === 'full' ? 'sm:grid-cols-2' : ''}`}>
                {analysis.keyInsights.slice(0, variant === 'full' ? 6 : 3).map((k, i) => {
                  const Icon = TOPIC_ICON[k.topic] ?? Sun;
                  return (
                    <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="flex gap-2.5 rounded-xl bg-ink/[0.045] px-3 py-2.5 text-sm leading-relaxed text-ink-2">
                      <Icon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                      {k.text}
                    </motion.li>
                  );
                })}
              </ul>

              <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-ink-2 hover:text-ink">
                {expanded ? 'Hide detailed analysis' : 'Show detailed analysis'}
                <ChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
              </button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.dl initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35 }} className="overflow-hidden">
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {DETAIL_LABELS.map(([key, label]) => (
                        <div key={key} className="rounded-xl border border-line p-3">
                          <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{label}</dt>
                          <dd className="mt-1 text-sm leading-relaxed text-ink-2">{analysis.details[key]}</dd>
                        </div>
                      ))}
                    </div>
                  </motion.dl>
                )}
              </AnimatePresence>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[11px] text-ink-3">
                <span>{data?.notice ?? 'Generated from live Open-Meteo data. AI can make mistakes; check the numbers above.'}</span>
                {variant === 'compact' && (
                  <Link href="/ai" className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:underline">
                    Ask the assistant <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowDown, ArrowUp, ChevronDown, RefreshCw, Share2, Star } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { FOCUS_SEARCH_EVENT } from '@/components/layout/SearchBar';
import { describeCondition } from '@/lib/weather/conditions';
import { clock, localNow, longDate, tempValue, temperature } from '@/lib/weather/format';
import type { WeatherReport } from '@/lib/types';
import { usePreferences } from '@/providers/PreferencesProvider';
import { useToast } from '@/providers/ToastProvider';
import { WeatherGlyph } from './WeatherGlyph';

function useLocalClock(utcOffsetSeconds: number) {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setNow(localNow(utcOffsetSeconds));
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [utcOffsetSeconds]);
  return now;
}

interface HeroProps {
  report: WeatherReport;
  loading: boolean;
  updatedAt: number | null;
  onRefresh: () => void;
}

export function Hero({ report, loading, updatedAt, onRefresh }: HeroProps) {
  const { place, units, clock: clockFormat, isSaved, toggleSaved } = usePreferences();
  const toast = useToast();
  const { current, daily } = report;
  const today = daily[0];
  const condition = describeCondition(current.weatherCode, current.isDay);
  const now = useLocalClock(report.utcOffsetSeconds) ?? current.time;
  const saved = isSaved(place);

  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const glyphY = useTransform(scrollY, [0, 400], [0, reduce ? 0 : 40]);
  const glyphScale = useTransform(scrollY, [0, 400], [1, reduce ? 1 : 0.92]);

  const share = async () => {
    const url = new URL(window.location.origin);
    url.searchParams.set('lat', place.latitude.toFixed(4));
    url.searchParams.set('lon', place.longitude.toFixed(4));
    url.searchParams.set('name', place.name);
    if (place.subtitle) url.searchParams.set('sub', place.subtitle);
    const text = `${temperature(current.temperature, units)} and ${condition.label.toLowerCase()} in ${place.name} right now (high ${temperature(today.max, units)}, low ${temperature(today.min, units)}).`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Weather in ${place.name} · Skycast`, text, url: url.toString() });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast('Weather link copied to clipboard');
      }
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') toast('Could not share right now', 'info');
    }
  };

  const minutesAgo = updatedAt ? Math.max(0, Math.round((Date.now() - updatedAt) / 60_000)) : null;

  return (
    <section aria-labelledby="hero-place" className="relative pb-2 pt-4 sm:pt-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(FOCUS_SEARCH_EVENT))}
            className="group -ml-2 flex max-w-full items-center gap-1.5 rounded-xl px-2 py-1 text-left transition-colors hover:bg-ink/[0.06]"
            aria-label={`Change location, currently ${place.name}`}
          >
            <h1 id="hero-place" className="truncate text-[28px] font-semibold leading-tight tracking-tight sm:text-4xl">
              {place.name}
            </h1>
            {place.localName && (
              <span lang="ne" className="hidden truncate text-xl text-ink-3 sm:inline">
                {place.localName}
              </span>
            )}
            <ChevronDown className="size-5 shrink-0 text-ink-3 transition-transform group-hover:translate-y-0.5" aria-hidden />
          </button>
          <p className="mt-1 truncate text-sm text-ink-2">
            {longDate(now)} · <span className="tabular">{clock(now, clockFormat)}</span>
            {place.subtitle && <span className="hidden sm:inline"> · {place.subtitle}</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={toggleSaved.bind(null, place)}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${place.name} from saved locations` : `Save ${place.name}`}
            className="grid size-10 place-items-center rounded-full border border-line bg-surface backdrop-blur-xl transition-colors hover:bg-ink/10"
          >
            <motion.span key={String(saved)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}>
              <Star className={`size-[18px] ${saved ? 'fill-amber-400 text-amber-400' : 'text-ink-2'}`} />
            </motion.span>
          </button>
          <button
            type="button"
            onClick={share}
            aria-label="Share this weather"
            className="grid size-10 place-items-center rounded-full border border-line bg-surface text-ink-2 backdrop-blur-xl transition-colors hover:bg-ink/10 hover:text-ink"
          >
            <Share2 className="size-[18px]" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-2 sm:mt-6">
        <div>
          <p className="flex items-start font-extralight leading-[0.85] tracking-[-0.06em]">
            <AnimatedNumber value={Math.round(tempValue(current.temperature, units))} className="tabular text-[7.5rem] sm:text-[10rem]" />
            <span className="mt-3 text-5xl text-ink-2 sm:mt-5 sm:text-7xl">°</span>
          </p>
          <p className="mt-3 text-xl font-medium sm:text-2xl">{condition.label}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-ink-2">
            <span>Feels like {temperature(current.feelsLike, units)}</span>
            <span className="tabular inline-flex items-center gap-3">
              <span className="inline-flex items-center gap-0.5">
                <ArrowUp className="size-4" aria-hidden />
                <span className="sr-only">High</span>
                {temperature(today.max, units)}
              </span>
              <span className="inline-flex items-center gap-0.5">
                <ArrowDown className="size-4" aria-hidden />
                <span className="sr-only">Low</span>
                {temperature(today.min, units)}
              </span>
            </span>
          </p>
        </div>
        <motion.div style={{ y: glyphY, scale: glyphScale }} className="animate-float -mr-2 sm:mr-4">
          <motion.div key={`${condition.glyph}-${condition.isDay}`} initial={{ opacity: 0, scale: 0.8, rotate: -8 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 18 }}>
            <WeatherGlyph kind={condition.glyph} isDay={current.isDay} animated size={150} className="drop-shadow-[0_18px_30px_rgb(0_0_0/0.18)] sm:size-[210px]!" label={condition.label} />
          </motion.div>
        </motion.div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-ink-3">
        <span className={`size-1.5 rounded-full ${loading ? 'bg-warning' : 'bg-good'}`} style={loading ? { animation: 'pulse-dot 1s ease-in-out infinite' } : undefined} aria-hidden />
        <span>{loading ? 'Updating…' : minutesAgo === null ? 'Live' : minutesAgo < 1 ? 'Updated just now' : `Updated ${minutesAgo} min ago`}</span>
        <button type="button" onClick={onRefresh} disabled={loading} aria-label="Refresh weather" className="grid size-7 place-items-center rounded-full hover:bg-ink/10 hover:text-ink disabled:opacity-50">
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </section>
  );
}

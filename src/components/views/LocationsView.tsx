'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeftRight, Bookmark, Check, LoaderCircle, Plus, Scale, Search, Trash2, Trophy } from 'lucide-react';
import { AiBadge, SourceChip } from '@/components/ai/AiBadge';
import { EmptyState, GhostButton, PrimaryButton } from '@/components/ui/EmptyState';
import { Panel } from '@/components/ui/Panel';
import { PageHeader } from '@/components/ui/PageStates';
import { FOCUS_SEARCH_EVENT } from '@/components/layout/SearchBar';
import { WeatherGlyph } from '@/components/weather/WeatherGlyph';
import { comparePlaces, getCities } from '@/lib/api';
import type { CompareResponse, CompareRow } from '@/lib/groq/schemas';
import { describeCondition } from '@/lib/weather/conditions';
import { clock, localNow, precipitation, speed, temperature } from '@/lib/weather/format';
import type { CityNow, Units } from '@/lib/types';
import { usePreferences } from '@/providers/PreferencesProvider';

const ACTIVITIES = ['Hiking', 'Cycling', 'Sightseeing', 'Running', 'Photography', 'Picnic'];

interface Metric {
  label: string;
  value: (r: CompareRow) => number | null;
  format: (v: number, units: Units) => string;
  better: 'low' | 'high' | 'none';
}

const METRICS: Metric[] = [
  { label: 'Temperature', value: (r) => r.temperature, format: (v, u) => temperature(v, u), better: 'none' },
  { label: 'Feels like', value: (r) => r.feelsLike, format: (v, u) => temperature(v, u), better: 'none' },
  { label: 'High / low', value: (r) => r.max, format: (v, u) => temperature(v, u), better: 'none' },
  { label: 'Rain chance', value: (r) => r.precipitationProbability, format: (v) => `${Math.round(v)}%`, better: 'low' },
  { label: 'Rain today', value: (r) => r.precipitationSum, format: (v, u) => precipitation(v, u), better: 'low' },
  { label: 'Wind', value: (r) => r.windSpeed, format: (v, u) => speed(v, u), better: 'low' },
  { label: 'Gusts', value: (r) => r.windGusts, format: (v, u) => speed(v, u), better: 'low' },
  { label: 'Humidity', value: (r) => r.humidity, format: (v) => `${Math.round(v)}%`, better: 'none' },
  { label: 'UV max', value: (r) => r.uvIndexMax, format: (v) => String(Math.round(v)), better: 'low' },
  { label: 'US AQI', value: (r) => r.usAqi, format: (v) => String(Math.round(v)), better: 'low' },
];

function SavedCard({ city, selected, compareOn, onSelect, onToggleCompare, onRemove }: { city: CityNow | null; selected: boolean; compareOn: boolean; onSelect: () => void; onToggleCompare: () => void; onRemove: () => void }) {
  const { units, clock: clockFormat } = usePreferences();
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    if (!city?.time) return;
    const tick = () => setNow(localNow(city.utcOffsetSeconds));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [city?.time, city?.utcOffsetSeconds]);
  if (!city) return <div className="skeleton h-40" />;
  const c = describeCondition(city.weatherCode, city.isDay);

  return (
    <motion.li layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`panel glass-interactive overflow-hidden ${selected ? 'ring-2 ring-accent/60' : ''}`}>
      <button type="button" onClick={onSelect} className="block w-full p-5 text-left" aria-label={`Show weather for ${city.place.name}`}>
        <div className="flex items-start justify-between gap-3 pr-16">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{city.place.name}</p>
            <p className="truncate text-xs text-ink-3">
              {city.place.localName && <span lang="ne">{city.place.localName} · </span>}
              {city.place.subtitle}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="tabular text-4xl font-light tracking-tight">{city.temperature == null ? '—' : temperature(city.temperature, units)}</p>
            <p className="mt-1 text-sm text-ink-2">{c.label}</p>
            <p className="tabular mt-0.5 text-xs text-ink-3">
              {city.max != null && city.min != null && `H ${temperature(city.max, units)}  L ${temperature(city.min, units)} · `}
              {now ? clock(now, clockFormat) : '—'} local
            </p>
          </div>
          <WeatherGlyph kind={c.glyph} isDay={city.isDay} size={56} label={c.label} />
        </div>
      </button>
      <div className="absolute right-3 top-3 flex gap-1">
        <button
          type="button"
          onClick={onToggleCompare}
          aria-pressed={compareOn}
          aria-label={`${compareOn ? 'Remove' : 'Add'} ${city.place.name} ${compareOn ? 'from' : 'to'} comparison`}
          className={`grid size-8 place-items-center rounded-full border transition-colors ${compareOn ? 'border-accent bg-accent text-canvas' : 'border-line text-ink-3 hover:bg-ink/10 hover:text-ink'}`}
        >
          {compareOn ? <Check className="size-4" /> : <Scale className="size-3.5" />}
        </button>
        <button type="button" onClick={onRemove} aria-label={`Remove ${city.place.name}`} className="grid size-8 place-items-center rounded-full border border-line text-ink-3 transition-colors hover:bg-critical/15 hover:text-critical">
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </motion.li>
  );
}

export function LocationsView() {
  const { saved, place, selectPlace, removeSaved, toggleSaved, isSaved, units, ready } = usePreferences();
  const [cities, setCities] = useState<Record<string, CityNow>>({});
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [activity, setActivity] = useState('Hiking');
  const [custom, setCustom] = useState('');
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const savedKey = saved.map((p) => p.id).join(',');
  useEffect(() => {
    if (!ready || saved.length === 0) return;
    const controller = new AbortController();
    setLoadError(null);
    getCities(saved, controller.signal)
      .then((list) => setCities(Object.fromEntries(list.map((c) => [c.place.id, c]))))
      .catch((e) => !controller.signal.aborted && setLoadError(e instanceof Error ? e.message : 'Could not load saved places.'));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the set of places changes
  }, [ready, savedKey]);

  const comparePlacesList = useMemo(() => saved.filter((p) => compareIds.includes(p.id)), [saved, compareIds]);
  const chosenActivity = custom.trim() || activity;

  const toggleCompare = (id: string) => {
    setResult(null);
    setCompareIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= 4 ? ids : [...ids, id]));
  };

  const runCompare = async () => {
    setComparing(true);
    setCompareError(null);
    try {
      setResult(await comparePlaces(comparePlacesList, chosenActivity, units));
    } catch (e) {
      setCompareError(e instanceof Error ? e.message : 'Comparison failed.');
    } finally {
      setComparing(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Saved Locations"
        description="Your places with live local weather and time. Select two to four to compare them for an activity."
        action={
          <div className="flex gap-2">
            {!isSaved(place) && (
              <GhostButton onClick={() => toggleSaved(place)}>
                <Bookmark className="size-4" aria-hidden /> Save {place.name}
              </GhostButton>
            )}
            <PrimaryButton onClick={() => window.dispatchEvent(new Event(FOCUS_SEARCH_EVENT))}>
              <Plus className="size-4" aria-hidden /> Add place
            </PrimaryButton>
          </div>
        }
      />

      {saved.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={Bookmark}
            title="No saved places yet"
            body="Search for a city and tap the star to keep it here. Saved places stay on this device."
            action={
              <PrimaryButton onClick={() => window.dispatchEvent(new Event(FOCUS_SEARCH_EVENT))}>
                <Search className="size-4" aria-hidden /> Search places
              </PrimaryButton>
            }
          />
        </div>
      ) : (
        <>
          {loadError && <p role="alert" className="mb-4 rounded-2xl bg-critical/10 px-4 py-2.5 text-sm text-critical">{loadError}</p>}
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {saved.map((p) => (
                <SavedCard
                  key={p.id}
                  city={cities[p.id] ?? (loadError ? { place: p, time: null, utcOffsetSeconds: 0, temperature: null, weatherCode: 3, isDay: true, max: null, min: null } : null)}
                  selected={p.id === place.id}
                  compareOn={compareIds.includes(p.id)}
                  onSelect={() => selectPlace(p)}
                  onToggleCompare={() => toggleCompare(p.id)}
                  onRemove={() => {
                    removeSaved(p.id);
                    setCompareIds((ids) => ids.filter((x) => x !== p.id));
                  }}
                />
              ))}
            </AnimatePresence>
          </ul>
        </>
      )}

      <div className="mt-8">
        <Panel title="Compare locations" icon={ArrowLeftRight}>
          {comparePlacesList.length < 2 ? (
            <p className="text-sm text-ink-2">
              Tap the <Scale className="inline size-3.5" aria-label="compare" /> button on two to four saved places to compare their weather. {compareIds.length === 1 && 'One selected, pick at least one more.'}
            </p>
          ) : (
            <>
              <p className="text-sm text-ink-2">
                Comparing <span className="font-semibold text-ink">{comparePlacesList.map((p) => p.name).join(', ')}</span> for:
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {ACTIVITIES.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => {
                      setActivity(a);
                      setCustom('');
                      setResult(null);
                    }}
                    aria-pressed={!custom && activity === a}
                    className={`h-8 rounded-full border px-3.5 text-sm font-medium transition-colors ${!custom && activity === a ? 'border-ink bg-ink text-canvas' : 'border-line text-ink-2 hover:bg-ink/[0.06]'}`}
                  >
                    {a}
                  </button>
                ))}
                <input
                  value={custom}
                  onChange={(e) => {
                    setCustom(e.target.value.slice(0, 60));
                    setResult(null);
                  }}
                  placeholder="Or type an activity"
                  aria-label="Custom activity"
                  className="h-8 w-44 rounded-full border border-line bg-transparent px-3.5 text-sm placeholder:text-ink-3 focus:border-ink/30 focus:outline-none"
                />
                <PrimaryButton onClick={runCompare} disabled={comparing || chosenActivity.length < 2} className="h-8 px-4">
                  {comparing ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Scale className="size-4" aria-hidden />}
                  Compare
                </PrimaryButton>
              </div>
              {compareError && <p role="alert" className="mt-3 text-sm text-critical">{compareError}</p>}

              {result && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-5">
                  {result.ai ? (
                    <div className="rounded-2xl border border-line glass-1 p-4 sm:p-5">
                      <div className="flex items-center gap-3">
                        <AiBadge size="sm" />
                        <p className="flex items-center gap-1.5 text-sm font-semibold">
                          <Trophy className="size-4 text-amber-400" aria-hidden />
                          Best for {chosenActivity.toLowerCase()}: {result.rows[result.ai.bestIndex]?.name}
                        </p>
                        <SourceChip source="ai" model={result.model} />
                      </div>
                      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{result.ai.verdict}</p>
                      <ul className="mt-4 space-y-2.5">
                        {result.ai.places.map((p) => (
                          <li key={p.index} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-3 text-sm">
                            <span className="truncate font-medium">{result.rows[p.index]?.name}</span>
                            <span className="h-2 rounded-full bg-ink/10" aria-hidden>
                              <motion.span className="block h-full rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: `${p.score * 10}%` }} transition={{ duration: 0.8 }} />
                            </span>
                            <span className="tabular text-right font-semibold">{p.score.toFixed(0)}/10</span>
                            <span className="col-span-3 -mt-1 text-xs text-ink-3">{p.summary}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-[11px] text-ink-3">AI interpretation of the live data below. Check conditions before you go.</p>
                    </div>
                  ) : (
                    result.notice && <p className="rounded-2xl glass-1 px-4 py-3 text-sm text-ink-2">{result.notice}</p>
                  )}

                  <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
                    <table className="w-full min-w-[480px] text-sm">
                      <caption className="sr-only">Live weather comparison</caption>
                      <thead>
                        <tr className="border-b border-line text-left">
                          <th scope="col" className="py-2 pr-4 text-xs font-medium text-ink-3">Live data</th>
                          {result.rows.map((r) => {
                            const c = describeCondition(r.weatherCode, r.isDay);
                            return (
                              <th key={r.name} scope="col" className="py-2 pr-4 font-semibold">
                                <span className="flex items-center gap-1.5">
                                  <WeatherGlyph kind={c.glyph} isDay={r.isDay} size={22} label={c.label} />
                                  {r.name}
                                </span>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {METRICS.map((m) => {
                          const values = result.rows.map(m.value);
                          const valid = values.filter((v): v is number => v != null);
                          const best = m.better === 'low' ? Math.min(...valid) : m.better === 'high' ? Math.max(...valid) : null;
                          return (
                            <tr key={m.label} className="border-b border-line/60">
                              <th scope="row" className="py-2.5 pr-4 text-left font-normal text-ink-3">{m.label}</th>
                              {result.rows.map((r, i) => {
                                const v = values[i];
                                const isBest = best != null && v === best && new Set(valid).size > 1;
                                return (
                                  <td key={r.name} className={`tabular py-2.5 pr-4 ${isBest ? 'font-semibold text-good' : ''}`}>
                                    {v == null ? '—' : m.label === 'High / low' ? `${temperature(r.max, units)} / ${temperature(r.min, units)}` : m.format(v, units)}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-ink-3">Green marks the most favorable value. Source: Open-Meteo, fetched just now.</p>
                </motion.div>
              )}
            </>
          )}
        </Panel>
      </div>
    </>
  );
}

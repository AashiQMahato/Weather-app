'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getInsights } from '@/lib/api';
import type { InsightsResponse } from '@/lib/groq/schemas';
import { usePreferences } from '@/providers/PreferencesProvider';

// Shared across pages so moving between Overview and AI Weather reuses one analysis.
const memory = new Map<string, InsightsResponse>();

export function useInsights(enabled = true) {
  const { place, units, clock, ready } = usePreferences();
  const key = `${place.id}|${units}|${clock}`;
  const [data, setData] = useState<InsightsResponse | null>(() => memory.get(key) ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const result = await getInsights(place, units, clock, refresh, controller.signal);
        memory.set(key, result);
        setData(result);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Could not load the analysis.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [place, units, clock, key],
  );

  useEffect(() => {
    if (!enabled || !ready) return;
    const cached = memory.get(key);
    if (cached) {
      setData(cached);
      return;
    }
    setData(null);
    load();
    return () => controllerRef.current?.abort();
  }, [enabled, ready, key, load]);

  return { data, loading, error, refresh: () => load(true) };
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getWeather } from '@/lib/api';
import type { Place, WeatherReport } from '@/lib/types';

const REFRESH_MS = 10 * 60 * 1000;

interface State {
  report: WeatherReport | null;
  error: string | null;
  loading: boolean;
  updatedAt: number | null;
}

export function useWeather(place: Place | null) {
  const [state, setState] = useState<State>({ report: null, error: null, loading: false, updatedAt: null });
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!place) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const report = await getWeather(place, controller.signal);
      setState({ report, error: null, loading: false, updatedAt: Date.now() });
    } catch (error) {
      if (controller.signal.aborted) return;
      setState((s) => ({
        ...s,
        loading: false,
        error: error instanceof Error ? error.message : 'Something went wrong.',
      }));
    }
  }, [place]);

  useEffect(() => {
    load();
    return () => controllerRef.current?.abort();
  }, [load]);

  // Refresh periodically, but only while the tab is visible.
  useEffect(() => {
    if (!place) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [place, load]);

  return { ...state, refresh: load };
}

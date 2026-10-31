'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getWeather } from '@/lib/api';
import type { Place, WeatherReport } from '@/lib/types';

const REFRESH_MS = 10 * 60 * 1000;

interface State {
  placeId: string | null;
  report: WeatherReport | null;
  error: string | null;
  loading: boolean;
  updatedAt: number | null;
}

export function useWeather(place: Place | null) {
  const [state, setState] = useState<State>({ placeId: null, report: null, error: null, loading: false, updatedAt: null });
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!place) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    // A different place must never show the previous place's numbers.
    setState((s) => (s.placeId === place.id ? { ...s, loading: true, error: null } : { placeId: place.id, report: null, error: null, loading: true, updatedAt: null }));
    try {
      const report = await getWeather(place, controller.signal);
      setState({ placeId: place.id, report, error: null, loading: false, updatedAt: Date.now() });
    } catch (error) {
      if (controller.signal.aborted) return;
      setState((s) => ({ ...s, loading: false, error: error instanceof Error ? error.message : 'Something went wrong.' }));
    }
  }, [place]);

  useEffect(() => {
    load();
    return () => controllerRef.current?.abort();
  }, [load]);

  // Refresh periodically, and when the tab becomes visible after being stale.
  useEffect(() => {
    if (!place) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible' && state.updatedAt && Date.now() - state.updatedAt > REFRESH_MS) load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [place, load, state.updatedAt]);

  return { report: state.report, error: state.error, loading: state.loading, updatedAt: state.updatedAt, refresh: load };
}

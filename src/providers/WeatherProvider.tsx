'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useWeather } from '@/hooks/useWeather';
import { getAiStatus } from '@/lib/api';
import { usePreferences } from './PreferencesProvider';

type WeatherState = ReturnType<typeof useWeather>;
interface AiStatus {
  enabled: boolean;
  model: string | null;
  reason: string | null;
  checked: boolean;
}

const WeatherContext = createContext<WeatherState | null>(null);
const AiStatusContext = createContext<AiStatus>({ enabled: false, model: null, reason: null, checked: false });

/** One shared weather report for the selected place, so pages never refetch on navigation. */
export function WeatherProvider({ children }: { children: React.ReactNode }) {
  const { place, ready } = usePreferences();
  const weather = useWeather(ready ? place : null);
  const [ai, setAi] = useState<AiStatus>({ enabled: false, model: null, reason: null, checked: false });

  useEffect(() => {
    const controller = new AbortController();
    getAiStatus(controller.signal)
      .then((s) => setAi({ ...s, checked: true }))
      .catch(() => {
        if (!controller.signal.aborted) setAi({ enabled: false, model: null, reason: 'Could not check AI status.', checked: true });
      });
    return () => controller.abort();
  }, []);

  return (
    <WeatherContext.Provider value={weather}>
      <AiStatusContext.Provider value={ai}>{children}</AiStatusContext.Provider>
    </WeatherContext.Provider>
  );
}

export function useWeatherReport() {
  const context = useContext(WeatherContext);
  if (!context) throw new Error('useWeatherReport must be used inside WeatherProvider');
  return context;
}

export function useAiStatus() {
  return useContext(AiStatusContext);
}

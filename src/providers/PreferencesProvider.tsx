'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePersistentState } from '@/hooks/usePersistentState';
import { DEFAULT_PLACE, DEFAULT_SAVED } from '@/lib/weather/nepal';
import type { ClockFormat, Place, ThemePreference, Units } from '@/lib/types';

interface Preferences {
  ready: boolean;
  units: Units;
  setUnits: (units: Units) => void;
  clock: ClockFormat;
  setClock: (clock: ClockFormat) => void;
  theme: ThemePreference;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemePreference) => void;
  place: Place;
  /** Switches location. `fromSearch` also records it in recent searches. */
  selectPlace: (place: Place, fromSearch?: boolean) => void;
  saved: Place[];
  isSaved: (place: Place) => boolean;
  toggleSaved: (place: Place) => void;
  removeSaved: (id: string) => void;
  recents: Place[];
  clearRecents: () => void;
  resetAll: () => void;
}

const PreferencesContext = createContext<Preferences | null>(null);

export const THEME_KEY = 'skycast:v2:theme';

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [units, setUnits, unitsReady] = usePersistentState<Units>('skycast:v2:units', 'metric');
  const [clock, setClock] = usePersistentState<ClockFormat>('skycast:v2:clock', '12');
  const [theme, setTheme] = usePersistentState<ThemePreference>(THEME_KEY, 'system');
  const [place, setPlace, placeReady] = usePersistentState<Place>('skycast:v2:place', DEFAULT_PLACE);
  const [saved, setSaved] = usePersistentState<Place[]>('skycast:v2:saved', DEFAULT_SAVED);
  const [recents, setRecents] = usePersistentState<Place[]>('skycast:v2:recents', []);
  const [systemDark, setSystemDark] = useState(true);
  const [linkChecked, setLinkChecked] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(query.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolvedTheme === 'dark' ? '#0a1426' : '#f4f7fb');
  }, [resolvedTheme]);

  // Shared links look like /?lat=27.7&lon=85.3&name=Kathmandu. Applied once, after the stored place loads.
  useEffect(() => {
    if (!placeReady || linkChecked) return;
    setLinkChecked(true);
    const params = new URLSearchParams(window.location.search);
    const lat = Number(params.get('lat'));
    const lon = Number(params.get('lon'));
    if (params.get('lat') && params.get('lon') && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      const name = (params.get('name') ?? 'Shared location').slice(0, 80);
      setPlace({ id: `${lat.toFixed(3)},${lon.toFixed(3)}`, name, subtitle: params.get('sub')?.slice(0, 120) ?? '', latitude: lat, longitude: lon });
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [placeReady, linkChecked, setPlace]);

  const selectPlace = useCallback(
    (next: Place, fromSearch = false) => {
      setPlace(next);
      if (fromSearch) setRecents((list) => [next, ...list.filter((p) => p.id !== next.id)].slice(0, 6));
    },
    [setPlace, setRecents],
  );

  const value = useMemo<Preferences>(
    () => ({
      ready: unitsReady && placeReady && linkChecked,
      units,
      setUnits,
      clock,
      setClock,
      theme,
      resolvedTheme,
      setTheme,
      place,
      selectPlace,
      saved,
      isSaved: (p) => saved.some((s) => s.id === p.id),
      toggleSaved: (p) => setSaved((list) => (list.some((s) => s.id === p.id) ? list.filter((s) => s.id !== p.id) : [...list, p])),
      removeSaved: (id) => setSaved((list) => list.filter((s) => s.id !== id)),
      recents,
      clearRecents: () => setRecents([]),
      resetAll: () => {
        setUnits('metric');
        setClock('12');
        setTheme('system');
        setPlace(DEFAULT_PLACE);
        setSaved(DEFAULT_SAVED);
        setRecents([]);
        try {
          window.localStorage.removeItem('skycast:v2:chat');
        } catch {
          // Storage may be unavailable.
        }
      },
    }),
    [unitsReady, placeReady, linkChecked, units, setUnits, clock, setClock, theme, resolvedTheme, setTheme, place, selectPlace, saved, setSaved, recents, setRecents, setPlace],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside PreferencesProvider');
  return context;
}

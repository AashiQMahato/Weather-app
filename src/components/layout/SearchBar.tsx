'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Clock3, LoaderCircle, LocateFixed, MapPin, Search, X } from 'lucide-react';
import { placeFromCoords, searchPlaces } from '@/lib/api';
import { NEPAL_CITIES } from '@/lib/weather/nepal';
import type { Place } from '@/lib/types';
import { usePreferences } from '@/providers/PreferencesProvider';

export const FOCUS_SEARCH_EVENT = 'skycast:focus-search';

/** Location search combobox with Nepal-first results, recent searches and geolocation. */
export function SearchBar() {
  const { selectPlace, recents, clearRecents } = usePreferences();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const term = query.trim();
  const suggestions = term.length >= 2 ? results : recents.length ? recents : NEPAL_CITIES.slice(0, 5);
  const suggestionTitle = term.length >= 2 ? null : recents.length ? 'Recent searches' : 'Popular in Nepal';

  // Debounced search; stale requests are aborted.
  useEffect(() => {
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      setMessage(null);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const places = await searchPlaces(term, controller.signal);
        setResults(places);
        setActive(places.length ? 0 : -1);
        setMessage(places.length ? null : `No places match “${term}”.`);
        setOpen(true);
      } catch (error) {
        if (!controller.signal.aborted) {
          setResults([]);
          setMessage(error instanceof Error ? error.message : 'Search failed.');
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [term]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onFocusRequest = () => {
      inputRef.current?.focus();
      setOpen(true);
    };
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(target.tagName) && !target.isContentEditable) {
        event.preventDefault();
        onFocusRequest();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener(FOCUS_SEARCH_EVENT, onFocusRequest);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener(FOCUS_SEARCH_EVENT, onFocusRequest);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const choose = (place: Place) => {
    selectPlace(place, true);
    setQuery('');
    setResults([]);
    setOpen(false);
    setMessage(null);
    inputRef.current?.blur();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter' && open && suggestions[active]) {
      event.preventDefault();
      choose(suggestions[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setMessage('Location is not supported by this browser.');
      setOpen(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const place = await placeFromCoords(coords.latitude, coords.longitude).catch(() => ({
          id: `${coords.latitude.toFixed(3)},${coords.longitude.toFixed(3)}`,
          name: 'My location',
          subtitle: `${coords.latitude.toFixed(2)}°, ${coords.longitude.toFixed(2)}°`,
          latitude: coords.latitude,
          longitude: coords.longitude,
        }));
        setLocating(false);
        choose(place);
      },
      (error) => {
        setLocating(false);
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Search for a place instead.'
            : 'Could not determine your location.',
        );
        setOpen(true);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60 * 1000 },
    );
  };

  const showList = open && (suggestions.length > 0 || message);

  return (
    <div ref={rootRef} className="relative flex w-full items-center gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={Boolean(showList)}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 && suggestions[active] ? `${listId}-${active}` : undefined}
          aria-label="Search for a city or place"
          placeholder="Search Nepal or any city"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onFocus={() => {
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="h-10 w-full rounded-full border border-line bg-surface pl-10 pr-10 text-[15px] text-ink placeholder:text-ink-3 backdrop-blur-xl transition-colors focus:border-ink/30 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <span className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-line px-1.5 text-[11px] font-medium text-ink-3 lg:block [input:focus~&]:hidden">
          /
        </span>
        {searching ? (
          <LoaderCircle className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-3" aria-hidden />
        ) : query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:bg-ink/10 hover:text-ink"
          >
            <X className="size-4" />
          </button>
        ) : null}

        {showList && (
          <div className="panel-strong absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl p-1.5 shadow-2xl">
            {suggestionTitle && (
              <div className="flex items-center justify-between px-3 pb-1 pt-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{suggestionTitle}</span>
                {recents.length > 0 && term.length < 2 && (
                  <button type="button" onClick={clearRecents} className="text-xs font-medium text-ink-3 hover:text-ink">
                    Clear
                  </button>
                )}
              </div>
            )}
            <ul id={listId} role="listbox" aria-label="Places" className="max-h-80 overflow-auto">
              {suggestions.map((place, i) => (
                <li
                  key={place.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => choose(place)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${i === active ? 'bg-ink/[0.07]' : ''}`}
                >
                  {suggestionTitle === 'Recent searches' ? (
                    <Clock3 className="size-4 shrink-0 text-ink-3" aria-hidden />
                  ) : (
                    <MapPin className="size-4 shrink-0 text-ink-3" aria-hidden />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {place.name}
                      {place.localName && (
                        <span lang="ne" className="ml-2 font-normal text-ink-3">
                          {place.localName}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-ink-3">{place.subtitle}</span>
                  </span>
                </li>
              ))}
            </ul>
            {suggestions.length === 0 && message && <p className="px-3 py-2.5 text-sm text-ink-2">{message}</p>}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={locate}
        disabled={locating}
        aria-label="Use my location"
        title="Use my location"
        className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink backdrop-blur-xl transition-colors hover:bg-ink/10 disabled:opacity-60"
      >
        {locating ? <LoaderCircle className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
      </button>
    </div>
  );
}

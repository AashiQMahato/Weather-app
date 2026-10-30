'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { LoaderCircle, LocateFixed, MapPin, Search, X } from 'lucide-react';
import { placeFromCoords, searchPlaces } from '@/lib/api';
import type { Place } from '@/lib/types';

interface SearchBarProps {
  onSelect: (place: Place) => void;
}

export function SearchBar({ onSelect }: SearchBarProps) {
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

  // Debounced search; stale requests are aborted.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
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
          setOpen(true);
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  // Close on outside click.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const choose = (place: Place) => {
    onSelect(place);
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
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter' && open && results[active]) {
      event.preventDefault();
      choose(results[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
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
        const place = await placeFromCoords(coords.latitude, coords.longitude);
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
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  };

  const showList = open && (results.length > 0 || message);

  return (
    <div ref={rootRef} className="relative flex w-full items-center gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={Boolean(showList)}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 && results[active] ? `${listId}-${active}` : undefined}
          aria-label="Search for a city"
          placeholder="Search city…"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-11 w-full rounded-full border border-white/15 bg-white/10 pl-11 pr-10 text-[15px] text-ink placeholder:text-ink-3 backdrop-blur-md transition-colors hover:bg-white/[0.14] focus:border-white/40 focus:bg-white/[0.14] focus:outline-none"
        />
        {searching ? (
          <LoaderCircle className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-3" aria-hidden />
        ) : query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:bg-white/10 hover:text-ink"
          >
            <X className="size-4" />
          </button>
        ) : null}

        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-auto rounded-2xl border border-white/15 bg-slate-900/90 p-1.5 shadow-2xl backdrop-blur-xl"
          >
            {results.map((place, i) => (
              <li
                key={place.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(place)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${i === active ? 'bg-white/10' : ''}`}
              >
                <MapPin className="size-4 shrink-0 text-ink-3" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{place.name}</span>
                  <span className="block truncate text-xs text-ink-3">{place.subtitle}</span>
                </span>
              </li>
            ))}
            {results.length === 0 && message && <li className="px-3 py-2.5 text-sm text-ink-2">{message}</li>}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={locate}
        disabled={locating}
        aria-label="Use my location"
        title="Use my location"
        className="grid size-11 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-ink backdrop-blur-md transition-colors hover:bg-white/[0.18] disabled:opacity-60"
      >
        {locating ? <LoaderCircle className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
      </button>
    </div>
  );
}

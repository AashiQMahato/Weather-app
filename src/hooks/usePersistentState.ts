'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * useState backed by localStorage. The first render always uses `initial` so
 * server and client markup match; the stored value is applied after mount.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) setValue(JSON.parse(stored) as T);
    } catch {
      // Storage can be unavailable (private mode) or hold corrupt JSON.
    }
    setHydrated(true);
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Ignore quota and availability errors; state still updates in memory.
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update, hydrated] as const;
}

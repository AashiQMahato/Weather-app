'use client';

import { useEffect } from 'react';

const SELECTOR = '.panel, .panel-strong, .glass-hero';

/**
 * Moves each glass surface's reflection toward the pointer (desktop only).
 * One delegated listener, throttled to animation frames, writing two CSS
 * variables; it never re-renders React.
 */
export function GlassPointer() {
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let last: HTMLElement | null = null;
    let event: PointerEvent | null = null;

    const apply = () => {
      frame = 0;
      if (!event || reduce.matches) return;
      const el = (event.target as Element | null)?.closest<HTMLElement>(SELECTOR) ?? null;
      if (last && last !== el) {
        last.style.removeProperty('--mx');
        last.style.removeProperty('--my');
      }
      last = el;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      el.style.setProperty('--my', `${event.clientY - rect.top}px`);
    };

    const onMove = (e: PointerEvent) => {
      event = e;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}

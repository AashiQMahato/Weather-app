'use client';

import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'motion/react';

/** Counts smoothly to `value` whenever it changes. Renders the final value on the server. */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  const reduce = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const from = previous.current;
    previous.current = value;
    if (reduce || from === value) {
      node.textContent = String(value);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        node.textContent = String(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}

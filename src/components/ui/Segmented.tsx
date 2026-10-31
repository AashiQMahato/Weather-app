'use client';

import { useId } from 'react';
import { motion } from 'motion/react';

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

/** Pill toggle with a sliding indicator. Behaves as a radio group. */
export function Segmented<T extends string>({ label, value, options, onChange, size = 'md', className = '' }: SegmentedProps<T>) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-full border border-line glass-1 p-1 ${className}`}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`relative rounded-full font-medium transition-colors ${size === 'sm' ? 'h-7 px-3 text-xs' : 'h-8 px-3.5 text-sm'} ${active ? 'text-canvas' : 'text-ink-2 hover:text-ink'}`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-ink"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

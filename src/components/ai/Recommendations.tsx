'use client';

import { motion } from 'motion/react';
import { Bike, Camera, Dumbbell, Footprints, GlassWater, Mountain, Plane, Shirt, Sprout, Umbrella, type LucideIcon } from 'lucide-react';
import type { Recommendation } from '@/lib/groq/schemas';

const CATEGORY: Record<Recommendation['category'], { icon: LucideIcon; label: string; gradient: string }> = {
  clothing: { icon: Shirt, label: 'Clothing', gradient: 'from-violet-400 to-indigo-500' },
  outdoor: { icon: Mountain, label: 'Outdoors', gradient: 'from-emerald-400 to-teal-500' },
  travel: { icon: Plane, label: 'Travel', gradient: 'from-sky-400 to-blue-500' },
  exercise: { icon: Dumbbell, label: 'Exercise', gradient: 'from-orange-400 to-rose-500' },
  cycling: { icon: Bike, label: 'Cycling', gradient: 'from-lime-400 to-emerald-500' },
  walking: { icon: Footprints, label: 'Walking', gradient: 'from-amber-400 to-orange-500' },
  photography: { icon: Camera, label: 'Photography', gradient: 'from-pink-400 to-fuchsia-500' },
  gardening: { icon: Sprout, label: 'Gardening', gradient: 'from-green-400 to-lime-500' },
  umbrella: { icon: Umbrella, label: 'Umbrella', gradient: 'from-cyan-400 to-sky-500' },
  hydration: { icon: GlassWater, label: 'Hydration', gradient: 'from-blue-400 to-cyan-500' },
};

const RATING = {
  great: { label: 'Great', className: 'text-good bg-good/10 ring-good/25' },
  good: { label: 'Good', className: 'text-info bg-info/10 ring-info/25' },
  fair: { label: 'Fair', className: 'text-warning bg-warning/10 ring-warning/25' },
  poor: { label: 'Poor', className: 'text-critical bg-critical/10 ring-critical/25' },
} as const;

export function Recommendations({ items }: { items: Recommendation[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((r, i) => {
        const cat = CATEGORY[r.category];
        const rating = RATING[r.rating];
        return (
          <motion.li
            key={`${r.category}-${i}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.45 }}
            whileHover={{ y: -3 }}
            className="panel flex flex-col p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <span className={`grid size-11 place-items-center rounded-2xl bg-gradient-to-br ${cat.gradient} text-white shadow-lg`} aria-hidden>
                <cat.icon className="size-5" />
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${rating.className}`}>{rating.label}</span>
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{cat.label}</p>
            <h3 className="mt-1 text-base font-semibold leading-snug">{r.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{r.body}</p>
            {r.items.length > 0 && (
              <ul className="mt-auto flex flex-wrap gap-1.5 pt-4" aria-label="Suggested items">
                {r.items.map((item) => (
                  <li key={item} className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-2">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </motion.li>
        );
      })}
    </ul>
  );
}

'use client';

import { memo } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import type { Scene } from '@/lib/weather/conditions';

// Full-screen atmospheric layer behind every page. Effects animate only
// transform and opacity so they stay on the compositor.

const RAIN_TILE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><g stroke='black' stroke-width='1.4' stroke-linecap='round'><line x1='12' y1='8' x2='9' y2='26'/><line x1='58' y1='40' x2='55' y2='58'/><line x1='104' y1='14' x2='101' y2='32'/><line x1='150' y1='52' x2='147' y2='70'/><line x1='30' y1='96' x2='27' y2='114'/><line x1='86' y1='120' x2='83' y2='138'/><line x1='128' y1='92' x2='125' y2='110'/><line x1='170' y1='140' x2='167' y2='158'/><line x1='52' y1='150' x2='49' y2='168'/></g></svg>";
const SNOW_TILE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><g fill='black'><circle cx='20' cy='18' r='2.2'/><circle cx='80' cy='60' r='1.6'/><circle cx='150' cy='30' r='2.6'/><circle cx='40' cy='120' r='1.8'/><circle cx='110' cy='140' r='2.4'/><circle cx='180' cy='100' r='1.5'/><circle cx='70' cy='180' r='2'/><circle cx='160' cy='175' r='1.7'/></g></svg>";

function Cloud({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 200 80" className={className} style={style} aria-hidden>
      <path d="M30 70 H165 A22 22 0 0 0 160 27 A38 38 0 0 0 88 20 A28 28 0 0 0 40 34 A18 18 0 0 0 30 70 Z" fill="currentColor" />
    </svg>
  );
}

function Precipitation({ kind, heavy = false }: { kind: 'rain' | 'snow'; heavy?: boolean }) {
  const tile = kind === 'rain' ? RAIN_TILE : SNOW_TILE;
  const layer = (size: number, duration: number, opacity: number) => (
    <div
      className="absolute inset-x-0 top-0 h-[200%]"
      style={{
        backgroundColor: 'var(--precip)',
        WebkitMaskImage: `url("${tile}")`,
        maskImage: `url("${tile}")`,
        WebkitMaskSize: `${size}px`,
        maskSize: `${size}px`,
        opacity,
        animation: `${kind === 'rain' ? 'fall' : 'snowfall'} ${duration}s linear infinite`,
        willChange: 'transform',
      }}
    />
  );
  return kind === 'rain' ? (
    <>
      {layer(180, heavy ? 1.6 : 2.2, 0.75)}
      {layer(260, heavy ? 1.1 : 1.5, 0.45)}
    </>
  ) : (
    <>
      {layer(200, 26, 0.9)}
      {layer(320, 18, 0.55)}
    </>
  );
}

// Deterministic star field so server and client markup match.
const STARS = Array.from({ length: 80 }, (_, i) => {
  const x = (i * 7919) % 1000;
  const y = (i * 104729) % 620;
  return { x: x / 10, y: y / 10, r: i % 9 === 0 ? 1.4 : i % 3 === 0 ? 1 : 0.7, twinkle: i % 6 === 0, delay: (i % 7) * 0.6 };
});

function SceneLayers({ scene }: { scene: Scene }) {
  const clouds = (count: number, tone: string, opacity: number) =>
    Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        className="animate-drift absolute"
        style={{ top: `${6 + i * 13}%`, left: `${(i * 37) % 80 - 10}%`, animationDuration: `${70 + i * 25}s`, animationDelay: `${-i * 17}s` }}
      >
        <Cloud className={`h-auto blur-[2px] ${tone}`} style={{ width: `${340 + i * 90}px`, opacity: opacity - i * 0.05 }} />
      </div>
    ));

  switch (scene) {
    case 'clear-day':
      return (
        <>
          <div
            className="animate-spin-slow absolute -right-[30rem] -top-[30rem] size-[60rem] rounded-full opacity-60"
            style={{
              background: 'repeating-conic-gradient(from 0deg, rgb(255 255 255 / 0.07) 0deg 5deg, transparent 5deg 16deg)',
              maskImage: 'radial-gradient(closest-side, black 20%, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(closest-side, black 20%, transparent 75%)',
            }}
          />
          <div className="absolute right-[8%] top-[6%] size-40 rounded-full bg-amber-200/30 blur-3xl" />
          {clouds(2, 'text-white', 0.14)}
        </>
      );
    case 'clear-night':
      return (
        <>
          <svg className="absolute inset-0 h-[70%] w-full" preserveAspectRatio="none" viewBox="0 0 100 62" aria-hidden>
            {STARS.map((s, i) => (
              <circle
                key={i}
                cx={s.x}
                cy={s.y}
                r={s.r / 10}
                fill="var(--star)"
                className={s.twinkle ? 'animate-twinkle' : undefined}
                style={s.twinkle ? { animationDelay: `${s.delay}s` } : { opacity: 0.7 }}
              />
            ))}
          </svg>
          <div className="absolute right-[10%] top-[9%] size-20 rounded-full bg-slate-100/90 shadow-[0_0_80px_30px_rgb(199_210_254/0.25)] dark:bg-slate-100/90" />
        </>
      );
    case 'cloudy':
      return <>{clouds(4, 'text-white', 0.2)}</>;
    case 'rain':
      return (
        <>
          {clouds(3, 'text-slate-300', 0.18)}
          <Precipitation kind="rain" />
        </>
      );
    case 'storm':
      return (
        <>
          {clouds(3, 'text-slate-400', 0.2)}
          <Precipitation kind="rain" heavy />
          <div className="absolute inset-0 bg-white" style={{ animation: 'flash 9s linear infinite', opacity: 0 }} />
        </>
      );
    case 'snow':
      return (
        <>
          {clouds(2, 'text-white', 0.2)}
          <Precipitation kind="snow" />
        </>
      );
    case 'fog':
      return (
        <>
          {[18, 42, 66].map((top, i) => (
            <div
              key={top}
              className="animate-drift absolute -left-1/4 h-40 w-[150%] blur-2xl"
              style={{
                top: `${top}%`,
                background: 'linear-gradient(90deg, transparent, var(--fog), transparent)',
                animationDuration: `${50 + i * 20}s`,
                animationDelay: `${-i * 12}s`,
              }}
            />
          ))}
        </>
      );
  }
}

export const SceneBackdrop = memo(function SceneBackdrop({ scene }: { scene: Scene }) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  // Subtle parallax: the atmosphere drifts up slower than the content.
  const y = useTransform(scrollY, [0, 800], [0, reduce ? 0 : -60]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <AnimatePresence initial={false}>
        <motion.div
          key={scene}
          data-scene={scene}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        >
          <div className="sky" />
          <motion.div className="absolute inset-0" style={{ y }}>
            <SceneLayers scene={scene} />
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
});

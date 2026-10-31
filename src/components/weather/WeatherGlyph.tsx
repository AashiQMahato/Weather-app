import { useId } from 'react';
import type { GlyphKind } from '@/lib/weather/conditions';

interface WeatherGlyphProps {
  kind: GlyphKind;
  isDay?: boolean;
  size?: number;
  animated?: boolean;
  label?: string;
  className?: string;
}

const CLOUD = 'M18 49 H46 A9.5 9.5 0 0 0 46 30 A13.5 13.5 0 0 0 20.5 31.5 A8.75 8.75 0 0 0 18 49 Z';
const DROP = 'M0 0 C2.2 3 3.2 4.6 3.2 6 A3.2 3.2 0 0 1 -3.2 6 C-3.2 4.6 -2.2 3 0 0 Z';

/**
 * Custom duotone weather illustrations. One drawing system (shared sun, moon,
 * cloud, drop, flake and bolt parts) so every condition reads consistently.
 */
export function WeatherGlyph({ kind, isDay = true, size = 32, animated = false, label, className = '' }: WeatherGlyphProps) {
  const uid = useId().replace(/:/g, '');
  const id = (name: string) => `${name}-${uid}`;
  const url = (name: string) => `url(#${id(name)})`;

  const sun = (cx: number, cy: number, r: number) => (
    <g className="g-sun">
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return (
          <line
            key={i}
            x1={cx + Math.cos(a) * (r + 4)}
            y1={cy + Math.sin(a) * (r + 4)}
            x2={cx + Math.cos(a) * (r + 8)}
            y2={cy + Math.sin(a) * (r + 8)}
            stroke="#fbbf24"
            strokeWidth={2.6}
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r} fill={url('sun')} />
    </g>
  );

  const moon = (cx: number, cy: number, r: number) => (
    <path
      d={`M${cx + r * 0.35} ${cy - r} A${r} ${r} 0 1 0 ${cx + r} ${cy + r * 0.45} A${r * 0.8} ${r * 0.8} 0 0 1 ${cx + r * 0.35} ${cy - r} Z`}
      fill={url('moon')}
      stroke="var(--cloud-stroke)"
      strokeWidth={1}
    />
  );

  const cloud = (transform = '', dark = false) => (
    <g className="g-cloud" transform={transform}>
      <path d={CLOUD} fill={url(dark ? 'cloudDark' : 'cloud')} stroke="var(--cloud-stroke)" strokeWidth={1.2} />
    </g>
  );

  const drops = (xs: number[], y: number, scale = 1) =>
    xs.map((x, i) => <path key={i} className="g-drop" d={DROP} transform={`translate(${x} ${y}) scale(${scale})`} fill={url('drop')} />);

  const flakes = (xs: number[], y: number) =>
    xs.map((x, i) => (
      <g key={i} className="g-drop" transform={`translate(${x} ${y + (i % 2) * 4})`}>
        {[0, 60, 120].map((deg) => (
          <line key={deg} x1={0} y1={-3.2} x2={0} y2={3.2} transform={`rotate(${deg})`} stroke="#bfdbfe" strokeWidth={1.8} strokeLinecap="round" />
        ))}
      </g>
    ));

  const raised = 'translate(0 -6)';
  let art: React.ReactNode;
  switch (kind) {
    case 'clear':
      art = isDay ? sun(32, 32, 12) : moon(30, 32, 15);
      break;
    case 'partly':
      art = (
        <>
          {isDay ? sun(24, 24, 9) : moon(24, 23, 10)}
          {cloud('translate(7 5) scale(0.86)')}
        </>
      );
      break;
    case 'cloudy':
      art = cloud();
      break;
    case 'overcast':
      art = (
        <>
          {cloud('translate(-5 -9) scale(0.82)', true)}
          {cloud('translate(4 2)')}
        </>
      );
      break;
    case 'fog':
      art = (
        <>
          {cloud('translate(0 -8)')}
          {[46, 52, 58].map((y, i) => (
            <line key={y} x1={14 + i * 3} y1={y} x2={50 - (2 - i) * 3} y2={y} stroke="var(--cloud-b)" strokeWidth={3} strokeLinecap="round" opacity={0.9 - i * 0.2} />
          ))}
        </>
      );
      break;
    case 'drizzle':
      art = (
        <>
          {cloud(raised)}
          {drops([25, 33, 41], 47, 0.7)}
        </>
      );
      break;
    case 'rain':
      art = (
        <>
          {cloud(raised, true)}
          {drops([24, 33, 42], 46)}
        </>
      );
      break;
    case 'heavy-rain':
      art = (
        <>
          {cloud(raised, true)}
          {drops([20, 28, 36, 44], 45, 1.05)}
        </>
      );
      break;
    case 'sleet':
      art = (
        <>
          {cloud(raised, true)}
          {drops([24, 40], 46)}
          {flakes([32], 50)}
        </>
      );
      break;
    case 'snow':
      art = (
        <>
          {cloud(raised)}
          {flakes([23, 32, 41], 50)}
        </>
      );
      break;
    case 'storm':
      art = (
        <>
          {cloud(raised, true)}
          <path className="g-bolt" d="M34 42 L27 53 H32.5 L29.5 61 L39 49 H33.5 L37 42 Z" fill={url('bolt')} />
          {drops([22, 44], 46, 0.85)}
        </>
      );
      break;
  }

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`shrink-0 overflow-visible ${animated ? 'glyph-animated' : ''} ${className}`}
    >
      <defs>
        <radialGradient id={id('sun')} cx="40%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#fff3b0" />
          <stop offset="55%" stopColor="#fcc93a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
        <linearGradient id={id('moon')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: 'var(--moon-a)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--moon-b)' }} />
        </linearGradient>
        <linearGradient id={id('cloud')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: 'var(--cloud-a)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--cloud-b)' }} />
        </linearGradient>
        <linearGradient id={id('cloudDark')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: 'var(--cloud-dark-a)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--cloud-dark-b)' }} />
        </linearGradient>
        <linearGradient id={id('drop')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id={id('bolt')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      {art}
    </svg>
  );
}

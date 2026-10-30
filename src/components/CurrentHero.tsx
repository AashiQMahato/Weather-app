import { ArrowDown, ArrowUp, Star } from 'lucide-react';
import { describeCondition } from '@/lib/conditions';
import { clock, longDate, temperature } from '@/lib/format';
import type { DailyPoint, CurrentConditions, Place, Units } from '@/lib/types';

interface CurrentHeroProps {
  place: Place;
  current: CurrentConditions;
  today: DailyPoint;
  units: Units;
  saved: boolean;
  onToggleSaved: () => void;
}

export function CurrentHero({ place, current, today, units, saved, onToggleSaved }: CurrentHeroProps) {
  const { label, icon: Icon } = describeCondition(current.weatherCode, current.isDay);

  return (
    <section aria-labelledby="place-name" className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 id="place-name" className="truncate text-3xl font-semibold tracking-tight sm:text-4xl">
            {place.name}
          </h1>
          <button
            type="button"
            onClick={onToggleSaved}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${place.name} from saved places` : `Save ${place.name}`}
            className="grid size-9 shrink-0 place-items-center rounded-full text-ink-2 transition-colors hover:bg-white/10 hover:text-ink"
          >
            <Star className={`size-5 ${saved ? 'fill-warning text-warning' : ''}`} />
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-2">
          {place.subtitle && <span>{place.subtitle} · </span>}
          <span>
            {longDate(current.time)}, {clock(current.time)}
          </span>
        </p>

        <div className="mt-6 flex items-center gap-5">
          <span className="tabular text-[5.5rem] font-extralight leading-none tracking-tighter sm:text-[7rem]">
            {temperature(current.temperature, units)}
          </span>
          <Icon className="size-16 shrink-0 text-ink drop-shadow-lg sm:size-20" strokeWidth={1.25} aria-hidden />
        </div>
      </div>

      <div className="flex flex-col gap-1 sm:items-end sm:text-right">
        <p className="text-xl font-medium">{label}</p>
        <p className="text-ink-2">Feels like {temperature(current.feelsLike, units)}</p>
        <p className="tabular flex items-center gap-3 text-ink-2">
          <span className="inline-flex items-center gap-0.5">
            <ArrowUp className="size-4" aria-label="High" />
            {temperature(today.max, units)}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <ArrowDown className="size-4" aria-label="Low" />
            {temperature(today.min, units)}
          </span>
        </p>
      </div>
    </section>
  );
}

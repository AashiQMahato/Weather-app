'use client';

import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Marker, Pane, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { Check, Crosshair, Earth, Layers, LoaderCircle, Pause, Play, TriangleAlert } from 'lucide-react';
import { getGrid, getRadar } from '@/lib/api';
import { speedValue, speedUnit, tempValue } from '@/lib/weather/format';
import type { GridPoint, Place, RadarFrames, Units } from '@/lib/types';
import { BASEMAPS, BASEMAP_ORDER, FALLBACK, type BasemapId } from './basemaps';

export type MapLayer = 'radar' | 'precipitation' | 'temperature' | 'wind' | 'clouds';

interface WeatherMapProps {
  place: Place;
  layer: MapLayer;
  units: Units;
  basemap: BasemapId;
  onBasemapChange: (id: BasemapId) => void;
}

// Sequential temperature ramp (°C stops), cold blue to hot red.
const TEMP_STOPS: [number, string][] = [
  [-20, '#6d28d9'],
  [-5, '#2563eb'],
  [5, '#0ea5e9'],
  [15, '#10b981'],
  [22, '#eab308'],
  [30, '#f97316'],
  [38, '#dc2626'],
];
function tempColor(c: number) {
  for (let i = TEMP_STOPS.length - 1; i >= 0; i--) if (c >= TEMP_STOPS[i][0]) return TEMP_STOPS[i][1];
  return TEMP_STOPS[0][1];
}

function FlyTo({ place }: { place: Place }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([place.latitude, place.longitude], Math.max(map.getZoom(), 6), { duration: 1.2 });
  }, [map, place.latitude, place.longitude]);
  return null;
}

/** Fetches a grid of live values for the visible bounds whenever the map settles. */
function GridLoader({ onData, onState }: { onData: (p: GridPoint[]) => void; onState: (s: 'loading' | 'idle' | 'error') => void }) {
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const load = useCallback(
    (map: L.Map) => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(async () => {
        const b = map.getBounds();
        const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
        let south = clamp(b.getSouth(), -85, 85);
        let north = clamp(b.getNorth(), -85, 85);
        let west = clamp(b.getWest(), -180, 180);
        let east = clamp(b.getEast(), -180, 180);
        // Keep within the API's maximum span around the centre.
        const c = map.getCenter();
        if (north - south > 58) [south, north] = [clamp(c.lat - 29, -85, 85), clamp(c.lat + 29, -85, 85)];
        if (east - west > 88) [west, east] = [clamp(c.lng - 44, -180, 180), clamp(c.lng + 44, -180, 180)];
        controller.current?.abort();
        controller.current = new AbortController();
        onState('loading');
        try {
          onData(await getGrid({ south, west, north, east }, controller.current.signal));
          onState('idle');
        } catch (e) {
          if (!(e instanceof DOMException && e.name === 'AbortError')) onState('error');
        }
      }, 350);
    },
    [onData, onState],
  );
  const map = useMapEvents({ moveend: () => load(map) });
  useEffect(() => {
    load(map);
    return () => {
      controller.current?.abort();
      window.clearTimeout(timer.current);
    };
  }, [map, load]);
  return null;
}

function gridIcon(point: GridPoint, layer: MapLayer, units: Units) {
  let html = '';
  if (layer === 'temperature') {
    const v = Math.round(tempValue(point.temperature, units));
    html = `<span style="background:${tempColor(point.temperature)}" class="grid-pill">${v}°</span>`;
  } else if (layer === 'wind') {
    const v = Math.round(speedValue(point.windSpeed, units));
    html = `<span class="grid-wind"><svg viewBox="0 0 24 24" width="22" height="22" style="transform:rotate(${point.windDirection + 180}deg)"><path d="M12 3 L17 13 L12 11 L7 13 Z" fill="currentColor"/><line x1="12" y1="11" x2="12" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><b>${v}</b></span>`;
  } else if (layer === 'clouds') {
    const a = 0.15 + (point.cloudCover / 100) * 0.7;
    html = `<span class="grid-cloud" style="background:rgb(226 232 240 / ${a.toFixed(2)})">${Math.round(point.cloudCover)}%</span>`;
  } else if (layer === 'precipitation') {
    const a = Math.min(0.9, 0.12 + point.precipitationProbability / 110);
    html = `<span class="grid-rain" style="background:rgb(59 130 246 / ${a.toFixed(2)})">${Math.round(point.precipitationProbability)}%${point.precipitation > 0 ? `<small>${point.precipitation.toFixed(1)}mm</small>` : ''}</span>`;
  }
  return L.divIcon({ html, className: 'grid-label', iconSize: [56, 32], iconAnchor: [28, 16] });
}

/**
 * World basemap tiles. If a provider fails to deliver any tiles (blocked
 * network, outage), it reports failure so the map can switch providers.
 */
function BaseTiles({ id, onFail }: { id: BasemapId; onFail: () => void }) {
  const basemap = BASEMAPS[id];
  const stats = useRef({ loaded: 0, errors: 0 });
  useEffect(() => {
    stats.current = { loaded: 0, errors: 0 };
    const timer = window.setTimeout(() => {
      if (stats.current.loaded === 0 && stats.current.errors > 0) onFail();
    }, 7000);
    return () => window.clearTimeout(timer);
  }, [id, onFail]);
  const handlers = useMemo(
    () => ({
      tileload: () => {
        stats.current.loaded += 1;
      },
      tileerror: () => {
        stats.current.errors += 1;
        if (stats.current.loaded === 0 && stats.current.errors >= 12) onFail();
      },
    }),
    [onFail],
  );
  return (
    <>
      <TileLayer
        key={id}
        url={basemap.url}
        subdomains={basemap.subdomains ?? 'abc'}
        attribution={basemap.attribution}
        maxNativeZoom={basemap.maxNativeZoom}
        maxZoom={19}
        detectRetina={false}
        eventHandlers={handlers}
      />
      {basemap.labels && (
        <Pane name="labels" style={{ zIndex: 450, pointerEvents: 'none' }}>
          <TileLayer key={`${id}-labels`} url={basemap.labels.url} subdomains={basemap.labels.subdomains ?? 'abc'} maxNativeZoom={basemap.maxNativeZoom} maxZoom={19} />
        </Pane>
      )}
    </>
  );
}

function frameLabel(time: number, isForecast: boolean) {
  const t = new Date(time * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return isForecast ? `${t} · forecast` : t;
}

export default function WeatherMap({ place, layer, units, basemap, onBasemapChange }: WeatherMapProps) {
  const [map, setMap] = useState<L.Map | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fallbackNote, setFallbackNote] = useState<string | null>(null);
  const handleTileFailure = useCallback(() => {
    const next = FALLBACK[basemap];
    if (!next) {
      setFallbackNote('Map tiles could not be loaded on this network.');
      return;
    }
    setFallbackNote(`${BASEMAPS[basemap].label} tiles didn’t load, so we switched to ${BASEMAPS[next].label}.`);
    onBasemapChange(next);
  }, [basemap, onBasemapChange]);
  const [radar, setRadar] = useState<RadarFrames | null>(null);
  const [radarError, setRadarError] = useState(false);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [grid, setGrid] = useState<GridPoint[]>([]);
  const [gridState, setGridState] = useState<'loading' | 'idle' | 'error'>('idle');

  useEffect(() => {
    if (layer !== 'radar' || radar) return;
    const controller = new AbortController();
    getRadar(controller.signal)
      .then((r) => {
        setRadar(r);
        setFrame(Math.max(0, r.nowcastStart - 1));
      })
      .catch(() => !controller.signal.aborted && setRadarError(true));
    return () => controller.abort();
  }, [layer, radar]);

  useEffect(() => {
    if (!playing || !radar) return;
    const id = window.setInterval(() => setFrame((f) => (f + 1) % radar.frames.length), 800);
    return () => window.clearInterval(id);
  }, [playing, radar]);

  const icons = useMemo(() => (layer === 'radar' ? [] : grid.map((p) => ({ p, icon: gridIcon(p, layer, units) }))), [grid, layer, units]);
  const current = radar?.frames[frame];

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[1.25rem]">
      <style>{`
        .grid-pill{display:inline-block;padding:3px 8px;border-radius:999px;color:#fff;font:600 12px/1.2 var(--font-sans);box-shadow:0 2px 6px rgb(0 0 0/.3);transform:translate(8px,6px)}
        .grid-wind{display:flex;align-items:center;gap:2px;padding:2px 6px 2px 2px;border-radius:999px;background:rgb(15 23 42/.72);color:#fff;font:600 11px var(--font-sans);box-shadow:0 2px 6px rgb(0 0 0/.25)}
        .grid-cloud,.grid-rain{display:inline-flex;flex-direction:column;align-items:center;padding:3px 7px;border-radius:10px;font:600 11px/1.15 var(--font-sans);color:#0f172a;transform:translate(6px,4px)}
        .grid-rain{color:#fff}.grid-rain small{font-weight:500;font-size:9px;opacity:.9}
        .leaflet-tooltip{font-family:var(--font-sans)}
      `}</style>
      <MapContainer ref={setMap} center={[place.latitude, place.longitude]} zoom={6} minZoom={2} maxZoom={14} worldCopyJump className="h-full w-full" attributionControl>
        <BaseTiles id={basemap} onFail={handleTileFailure} />
        {layer === 'radar' && radar && current && (
          <Pane name="weather" style={{ zIndex: 350 }}>
            <TileLayer
              key={current.path}
              url={`${radar.host}${current.path}/256/{z}/{x}/{y}/2/1_1.png`}
              opacity={0.75}
              maxNativeZoom={7}
              maxZoom={14}
              attribution='Radar &copy; <a href="https://www.rainviewer.com/">RainViewer</a>'
            />
          </Pane>
        )}
        {layer !== 'radar' && <GridLoader onData={setGrid} onState={setGridState} />}
        {icons.map(({ p, icon }) => (
          <Marker key={`${p.latitude},${p.longitude}`} position={[p.latitude, p.longitude]} icon={icon} interactive={false} keyboard={false} />
        ))}
        <CircleMarker center={[place.latitude, place.longitude]} radius={7} pathOptions={{ color: '#fff', weight: 3, fillColor: '#3b82f6', fillOpacity: 1 }}>
          <Tooltip direction="top" offset={[0, -8]} permanent>
            {place.name}
          </Tooltip>
        </CircleMarker>
        <FlyTo place={place} />
      </MapContainer>

      {/* Overlays */}
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[500] flex flex-col gap-2 sm:inset-x-auto sm:left-3 sm:max-w-sm">
        {layer === 'radar' && (
          <div className="panel-strong pointer-events-auto rounded-2xl p-3 shadow-xl">
            {radarError ? (
              <p className="flex items-center gap-2 text-sm text-critical">
                <TriangleAlert className="size-4" aria-hidden /> Radar is temporarily unavailable.
              </p>
            ) : !radar ? (
              <p className="flex items-center gap-2 text-sm text-ink-2">
                <LoaderCircle className="size-4 animate-spin" aria-hidden /> Loading radar…
              </p>
            ) : (
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause radar animation' : 'Play radar animation'} className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-canvas">
                  {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
                </button>
                <div className="min-w-0 flex-1">
                  <input
                    type="range"
                    min={0}
                    max={radar.frames.length - 1}
                    value={frame}
                    onChange={(e) => {
                      setPlaying(false);
                      setFrame(Number(e.target.value));
                    }}
                    aria-label="Radar time"
                    aria-valuetext={current ? frameLabel(current.time, frame >= radar.nowcastStart) : undefined}
                    className="w-full accent-[var(--accent)]"
                  />
                  <p className="tabular text-xs text-ink-2">{current && frameLabel(current.time, frame >= radar.nowcastStart)}</p>
                </div>
              </div>
            )}
          </div>
        )}
        <Legend layer={layer} units={units} />
      </div>

      {/* Basemap and view controls */}
      <div className="absolute right-3 top-3 z-[600] flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <button type="button" onClick={() => map?.flyTo([place.latitude, place.longitude], 7, { duration: 1 })} aria-label={`Center on ${place.name}`} title={`Center on ${place.name}`} className="panel-strong grid size-10 place-items-center rounded-full shadow-lg">
            <Crosshair className="size-4" aria-hidden />
          </button>
          <button type="button" onClick={() => map?.flyTo([22, 20], 2, { duration: 1.2 })} aria-label="Show the whole world" title="Whole world" className="panel-strong grid size-10 place-items-center rounded-full shadow-lg">
            <Earth className="size-4" aria-hidden />
          </button>
          <button type="button" onClick={() => setPickerOpen((v) => !v)} aria-expanded={pickerOpen} aria-haspopup="true" className="panel-strong flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold shadow-lg">
            <Layers className="size-4" aria-hidden />
            {BASEMAPS[basemap].label}
          </button>
        </div>
        {pickerOpen && (
          <ul role="menu" aria-label="Base map" className="panel-strong w-64 rounded-2xl p-1.5 shadow-2xl">
            {BASEMAP_ORDER.map((id) => (
              <li key={id} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={id === basemap}
                  onClick={() => {
                    onBasemapChange(id);
                    setFallbackNote(null);
                    setPickerOpen(false);
                  }}
                  className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left ${id === basemap ? 'glass-pill' : 'hover:bg-ink/[0.06]'}`}
                >
                  <Check className={`mt-0.5 size-4 shrink-0 ${id === basemap ? 'text-accent' : 'opacity-0'}`} aria-hidden />
                  <span>
                    <span className="block text-sm font-semibold">{BASEMAPS[id].label}</span>
                    <span className="block text-xs text-ink-3">{BASEMAPS[id].description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {fallbackNote && (
          <p role="status" className="panel-strong max-w-64 rounded-2xl px-3 py-2 text-xs text-ink-2 shadow-lg">
            {fallbackNote}
          </p>
        )}
      </div>

      {layer !== 'radar' && gridState !== 'idle' && (
        <div className="panel-strong absolute left-1/2 top-3 z-[500] flex -translate-x-1/2 items-center gap-2 rounded-full px-3 py-1.5 text-xs shadow">
          {gridState === 'loading' ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <TriangleAlert className="size-3.5 text-critical" aria-hidden />}
          {gridState === 'loading' ? 'Sampling live data…' : 'Could not load this layer'}
        </div>
      )}
    </div>
  );
}

function Legend({ layer, units }: { layer: MapLayer; units: Units }) {
  const content: Record<MapLayer, React.ReactNode> = {
    radar: (
      <>
        <div className="h-2 rounded-full" style={{ background: 'linear-gradient(90deg,#9ff,#0cf,#0a6,#ff0,#f80,#f00,#f0f)' }} />
        <div className="mt-1 flex justify-between text-[10px] text-ink-3">
          <span>Light</span>
          <span>Heavy</span>
        </div>
        <p className="mt-1.5 text-[11px] text-ink-3">Observed radar reflectivity from RainViewer, past 2 hours plus nowcast.</p>
      </>
    ),
    temperature: (
      <>
        <div className="flex gap-1">
          {TEMP_STOPS.map(([c, color]) => (
            <span key={c} className="flex-1 text-center">
              <span className="block h-2 rounded-full" style={{ background: color }} />
              <span className="tabular text-[10px] text-ink-3">{Math.round(tempValue(c, units))}°</span>
            </span>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-ink-3">Current air temperature, sampled from Open-Meteo.</p>
      </>
    ),
    wind: <p className="text-[11px] text-ink-3">Arrows point where the wind blows; numbers are speed in {speedUnit(units)}. Open-Meteo.</p>,
    clouds: <p className="text-[11px] text-ink-3">Current cloud cover (%). Brighter patches are cloudier. Open-Meteo.</p>,
    precipitation: <p className="text-[11px] text-ink-3">Chance of precipitation this hour, with the last hour&apos;s amount when it rained. Open-Meteo.</p>,
  };
  return <div className="panel-strong pointer-events-auto rounded-2xl p-3 shadow-xl">{content[layer]}</div>;
}

// Free, keyless world basemaps. Each provider's attribution is required by its
// terms and is shown in the map's attribution control.
//
// CARTO's raster basemaps are deliberately not used: they now return an
// "API KEY REQUIRED" watermark tile without a key, which loads successfully
// and so cannot be detected by tile-error failover.

export type BasemapId = 'standard' | 'streets' | 'satellite' | 'terrain' | 'light' | 'dark';

export interface Basemap {
  id: BasemapId;
  label: string;
  description: string;
  url: string;
  subdomains?: string;
  maxNativeZoom: number;
  attribution: string;
  /** Labels drawn above weather layers so place names stay readable. */
  labels?: { url: string; subdomains?: string };
}

const OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const ESRI_CREDIT = 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>';

export const BASEMAPS: Record<BasemapId, Basemap> = {
  standard: {
    id: 'standard',
    label: 'Map',
    description: 'Detailed world street map (Esri)',
    url: `${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`,
    maxNativeZoom: 19,
    attribution: `${ESRI_CREDIT} — Source: Esri, HERE, Garmin, USGS, ${OSM}`,
  },
  streets: {
    id: 'streets',
    label: 'Streets',
    description: 'OpenStreetMap standard style',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxNativeZoom: 19,
    attribution: OSM,
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    description: 'Esri World Imagery with place labels',
    url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    maxNativeZoom: 18,
    attribution: `Imagery ${ESRI_CREDIT}, Maxar, Earthstar Geographics, and the GIS User Community`,
    labels: { url: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}` },
  },
  terrain: {
    id: 'terrain',
    label: 'Terrain',
    description: 'Topographic map with contours (OpenTopoMap)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    maxNativeZoom: 17,
    attribution: `${OSM}, SRTM | Style &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)`,
  },
  light: {
    id: 'light',
    label: 'Light',
    description: 'Minimal light-gray canvas (Esri)',
    url: `${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    maxNativeZoom: 16,
    attribution: `${ESRI_CREDIT} — Esri, HERE, Garmin, ${OSM}`,
    labels: { url: `${ESRI}/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}` },
  },
  dark: {
    id: 'dark',
    label: 'Dark',
    description: 'Low-light dark-gray canvas (Esri)',
    url: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    maxNativeZoom: 16,
    attribution: `${ESRI_CREDIT} — Esri, HERE, Garmin, ${OSM}`,
    labels: { url: `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}` },
  },
};

export const BASEMAP_ORDER: BasemapId[] = ['standard', 'streets', 'satellite', 'terrain', 'light', 'dark'];

export const DEFAULT_BASEMAP: BasemapId = 'standard';

/** Older saved choices (e.g. the removed CARTO "voyager") fall back to the default. */
export function validBasemap(id: string): BasemapId {
  return id in BASEMAPS ? (id as BasemapId) : DEFAULT_BASEMAP;
}

/** Where to go if a provider's tiles fail to load (a different host each step). */
export const FALLBACK: Record<BasemapId, BasemapId | null> = {
  standard: 'streets',
  light: 'streets',
  dark: 'streets',
  satellite: 'streets',
  streets: 'terrain',
  terrain: null,
};

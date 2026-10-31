// Free, keyless world basemaps. Each provider's attribution is required by its
// terms and is shown in the map's attribution control.

export type BasemapId = 'voyager' | 'streets' | 'satellite' | 'terrain' | 'dark';

export interface Basemap {
  id: BasemapId;
  label: string;
  description: string;
  url: string;
  subdomains?: string;
  maxNativeZoom: number;
  attribution: string;
  /** Labels drawn above weather layers so place names stay readable. */
  labels?: { url: string; subdomains?: string; attribution?: string };
}

const OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const CARTO = `${OSM} &copy; <a href="https://carto.com/attributions">CARTO</a>`;

export const BASEMAPS: Record<BasemapId, Basemap> = {
  voyager: {
    id: 'voyager',
    label: 'Map',
    description: 'Clean, colorful world map (CARTO Voyager)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxNativeZoom: 19,
    attribution: CARTO,
    labels: { url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', subdomains: 'abcd' },
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
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxNativeZoom: 18,
    attribution: 'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics, and the GIS User Community',
    labels: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}' },
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
  dark: {
    id: 'dark',
    label: 'Dark',
    description: 'Low-light world map (CARTO Dark Matter)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxNativeZoom: 19,
    attribution: CARTO,
    labels: { url: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}{r}.png', subdomains: 'abcd' },
  },
};

export const BASEMAP_ORDER: BasemapId[] = ['voyager', 'streets', 'satellite', 'terrain', 'dark'];

/** Where to go if a provider's tiles fail to load (different hosts each step). */
export const FALLBACK: Record<BasemapId, BasemapId | null> = {
  voyager: 'streets',
  dark: 'streets',
  streets: 'terrain',
  terrain: 'satellite',
  satellite: null,
};

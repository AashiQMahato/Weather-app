import type { Place } from './types';

/** Major cities shown by default and in the "Across Nepal" panel. */
export const NEPAL_CITIES: Place[] = [
  { id: '1283240', name: 'Kathmandu', localName: 'काठमाडौं', subtitle: 'Bagmati Province, Nepal', latitude: 27.70169, longitude: 85.3206 },
  { id: '1282898', name: 'Pokhara', localName: 'पोखरा', subtitle: 'Gandaki Province, Nepal', latitude: 28.26689, longitude: 83.96851 },
  { id: 'np-lalitpur', name: 'Lalitpur', localName: 'ललितपुर', subtitle: 'Bagmati Province, Nepal', latitude: 27.67658, longitude: 85.31417 },
  { id: 'np-bharatpur', name: 'Bharatpur', localName: 'भरतपुर', subtitle: 'Bagmati Province, Nepal', latitude: 27.67689, longitude: 84.43589 },
  { id: 'np-biratnagar', name: 'Biratnagar', localName: 'विराटनगर', subtitle: 'Koshi Province, Nepal', latitude: 26.45505, longitude: 87.27007 },
  { id: 'np-birgunj', name: 'Birgunj', localName: 'वीरगञ्ज', subtitle: 'Madhesh Province, Nepal', latitude: 27.01709, longitude: 84.8808 },
  { id: 'np-butwal', name: 'Butwal', localName: 'बुटवल', subtitle: 'Lumbini Province, Nepal', latitude: 27.70055, longitude: 83.44836 },
  { id: 'np-nepalgunj', name: 'Nepalgunj', localName: 'नेपालगञ्ज', subtitle: 'Lumbini Province, Nepal', latitude: 28.05, longitude: 81.61667 },
  { id: 'np-dhangadhi', name: 'Dhangadhi', localName: 'धनगढी', subtitle: 'Sudurpashchim Province, Nepal', latitude: 28.68333, longitude: 80.6 },
  { id: 'np-birendranagar', name: 'Birendranagar', localName: 'वीरेन्द्रनगर', subtitle: 'Karnali Province, Nepal', latitude: 28.60194, longitude: 81.63389 },
  { id: 'np-janakpur', name: 'Janakpur', localName: 'जनकपुर', subtitle: 'Madhesh Province, Nepal', latitude: 26.72882, longitude: 85.92628 },
  { id: 'np-namche', name: 'Namche Bazaar', localName: 'नाम्चे बजार', subtitle: 'Koshi Province, Nepal', latitude: 27.80482, longitude: 86.71095 },
];

export const DEFAULT_PLACE = NEPAL_CITIES[0];
export const DEFAULT_SAVED = NEPAL_CITIES.slice(0, 3);

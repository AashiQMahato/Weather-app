import { Bookmark, CalendarDays, LayoutGrid, Map as MapIcon, Settings, Sparkles, Wind, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Overview', short: 'Today', icon: LayoutGrid },
  { href: '/forecast', label: 'Forecast', short: 'Forecast', icon: CalendarDays },
  { href: '/maps', label: 'Weather Maps', short: 'Maps', icon: MapIcon },
  { href: '/ai', label: 'AI Weather', short: 'AI', icon: Sparkles },
  { href: '/air-quality', label: 'Air Quality', short: 'Air', icon: Wind },
  { href: '/locations', label: 'Saved Locations', short: 'Places', icon: Bookmark },
  { href: '/settings', label: 'Settings', short: 'Settings', icon: Settings },
];

/** The four tabs on the mobile bar; the rest live in the "More" sheet. */
export const MOBILE_PRIMARY = NAV_ITEMS.slice(0, 4);
export const MOBILE_MORE = NAV_ITEMS.slice(4);

export function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

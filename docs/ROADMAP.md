# Skycast: weather intelligence roadmap

## Starting point

- Next.js 15 App Router, React 19, Tailwind v4, TypeScript, Recharts, Lucide.
- Weather provider: **Open-Meteo**, free and keyless, called only from server routes (`/api/weather`, `/api/places`, `/api/places/reverse`, `/api/nepal`). Base URLs can be overridden in env.
- Units: the API returns metric; `lib/format.ts` converts at display time, so switching units never refetches.
- One client page with localStorage-backed state, dark theme only.

## Kept and extended

- Open-Meteo service (extended to 14-day forecasts, 48 hours of hourly data, more variables and an hourly AQI series).
- Formatting and condition mapping, Nepal city data, Nepal-first search, Devanagari names.

## Architecture changes

| Area | Change |
| --- | --- |
| State | `PreferencesProvider` (units, clock, theme, place, saved places, recent searches) and `WeatherProvider` (one shared report), so navigating between pages never refetches |
| Layout | App shell: desktop sidebar, mobile bottom tab bar with a "More" sheet, top bar with search |
| Theme | Semantic color tokens through CSS variables; light, dark and system themes applied before paint, so there's no flash |
| Pages | Overview, Forecast, Maps, AI Weather, Air Quality, Saved Locations, Settings |
| AI | Groq through server routes only (`/api/ai/*`): structured analysis, streaming chat with a weather tool, activity comparison. Zod validation, rate limiting, size limits, timeouts. Rule-based fallback when Groq is unavailable, clearly labeled |
| Risks | Computed deterministically from provider data (fixed thresholds, real measurements). AI only explains them and never creates them. Labeled as model insights, not official warnings |
| Alerts | Official alerts only from a verified source: US National Weather Service. Other regions show a clear "no official feed connected" state with a link to the national service (DHM for Nepal) |
| Maps | Leaflet with CARTO basemap; RainViewer radar (free, attributed); temperature, wind, cloud and precipitation layers sampled from Open-Meteo on a grid. No fake tiles |
| Motion | Motion for React: page transitions, staggered cards, animated numbers, scene crossfades. Pure CSS weather scenes animate only transform and opacity. Respects reduced motion |

## Data sources and limits

- Open-Meteo: free for non-commercial use, about 10,000 calls a day; responses cached for 10 minutes.
- RainViewer: free public radar (zoom capped at 7, attribution required).
- CARTO basemaps: free with attribution for light use.
- NWS alerts: free, US only.
- Groq: needs `GROQ_API_KEY`; the model comes from `GROQ_MODEL` and is checked against `models.list()` at runtime.

## Delivery order

1. Data layer and API routes (weather, alerts, map grid, radar, AI)
2. Providers, theme tokens, app shell and navigation
3. Overview: scene backdrop, hero, metric cards with detail modal, hourly, daily, sun path
4. Forecast, Air Quality, Saved Locations with comparison, Settings
5. AI Weather: analyst, recommendations, risks, assistant
6. Maps
7. Verification: lint, types, build, mocked end-to-end runs, bundle check that the key never ships, screenshots

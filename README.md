# Skycast

A Nepal-focused weather dashboard built with Next.js 15, React 19 and Tailwind CSS v4.

Weather data comes from [Open-Meteo](https://open-meteo.com/). It's free and needs **no API key**, so the app
deploys to Vercel with zero configuration.

## Focus on Nepal

- Opens on Kathmandu, with Kathmandu, Pokhara and Lalitpur as saved places
- "Across Nepal" panel: live temperature for 12 cities from Dhangadhi to Biratnagar, in a single request
- Search ranks places in Nepal first, then matches from the rest of the world
- Nepali (Devanagari) place names next to English ones, e.g. Kathmandu काठमाडौं
- Times are shown in the place's local time (Asia/Kathmandu for Nepal)

## Features

- Current conditions with a background that matches the sky (clear, night, clouds, rain, storm, snow, fog)
- 24-hour temperature chart and hourly strip with chance of rain
- 10-day forecast with temperature range bars on a shared scale
- Wind, humidity and dew point, UV index, sunrise and sunset, precipitation, visibility, pressure and cloud cover
- Air quality (US AQI, PM2.5, PM10, ozone, NO₂)
- Plain-language tips (rain soon, high UV, strong gusts, poor air, big temperature swings)
- City search with keyboard navigation, plus "use my location"
- Saved places, °C/°F toggle and last location, all remembered in the browser
- Refreshes every 10 minutes while the tab is visible
- Accessible: labelled controls, visible focus rings, reduced-motion support

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

> After pulling new changes, run `npm install` again and hard-refresh the browser (Ctrl+Shift+R).
> If you see requests to old routes such as `/api/weather/current`, delete the `.next` folder and restart.

## Environment variables

None are required. To override an upstream URL (for a self-hosted Open-Meteo instance, for example), copy
`.env.example` to `.env.local`:

```bash
OPEN_METEO_FORECAST_URL=https://api.open-meteo.com/v1/forecast
OPEN_METEO_GEOCODING_URL=https://geocoding-api.open-meteo.com/v1/search
OPEN_METEO_AIR_QUALITY_URL=https://air-quality-api.open-meteo.com/v1/air-quality
REVERSE_GEOCODING_URL=https://api.bigdatacloud.net/data/reverse-geocode-client
```

These are server-only variables. The browser calls the app's own API routes, and those routes call Open-Meteo:

| Route                                   | Returns                                      |
| --------------------------------------- | -------------------------------------------- |
| `GET /api/weather?lat=27.70&lon=85.32`  | Current, 24-hour, 10-day and air quality data |
| `GET /api/places?q=pokhara`             | Search results, Nepal first                  |
| `GET /api/places/reverse?lat=..&lon=..` | Place name for coordinates                   |
| `GET /api/nepal`                        | Current conditions for 12 Nepali cities      |

Responses are cached for 10 minutes on Vercel's edge.

| Script              | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Start the dev server            |
| `npm run build`     | Production build                |
| `npm run start`     | Serve the production build      |
| `npm run lint`      | ESLint                          |
| `npm run typecheck` | TypeScript, no emit             |

## Deploy to Vercel

1. Push the repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the repo.
3. Keep the detected defaults (framework: Next.js). Environment variables are optional (see above).
4. Click **Deploy**.

## Project structure

```
src/
  app/            layout, page, error and 404 pages, app icon
    api/          weather, places, places/reverse and nepal route handlers
  components/     UI panels (hero, Across Nepal, hourly, daily, details, air quality, tips, search)
  hooks/          useWeather (fetch + refresh), usePersistentState (localStorage)
  lib/
    openMeteo.ts  server-side Open-Meteo client (reads the env URLs)
    api.ts        browser client for the app's /api routes
    nepal.ts      Nepali cities with Devanagari names
    conditions.ts WMO weather codes → label, icon, scene
    format.ts     unit conversion and local-time formatting
    insights.ts   rule-based weather tips
```

## Credits

Weather data by [Open-Meteo](https://open-meteo.com/) (CC BY 4.0). Reverse geocoding for "use my location" by
BigDataCloud's free client API.

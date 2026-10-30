# Skycast

A fast, good-looking weather dashboard built with Next.js 15, React 19 and Tailwind CSS v4.

Weather data comes from [Open-Meteo](https://open-meteo.com/). It's free and needs **no API key**, so the app
deploys to Vercel with zero configuration.

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
3. Keep the detected defaults (framework: Next.js). You don't need any environment variables.
4. Click **Deploy**.

## Project structure

```
src/
  app/            layout, page, error and 404 pages, app icon
  components/     UI panels (hero, hourly, daily, details, air quality, tips, search)
  hooks/          useWeather (fetch + refresh), usePersistentState (localStorage)
  lib/
    api.ts        Open-Meteo forecast, geocoding and air-quality clients
    conditions.ts WMO weather codes → label, icon, scene
    format.ts     unit conversion and local-time formatting
    insights.ts   rule-based weather tips
```

## Credits

Weather data by [Open-Meteo](https://open-meteo.com/) (CC BY 4.0). Reverse geocoding for "use my location" by
BigDataCloud's free client API.

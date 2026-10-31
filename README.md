# Skycast: weather intelligence

A Nepal-focused weather platform built with Next.js 15, React 19, Tailwind CSS v4, Motion and Groq.
It combines live forecasts, radar, air quality and an AI analyst and assistant that explain the data
without inventing it.

## What's inside

| Page | Highlights |
| --- | --- |
| **Overview** | Animated weather scenes (sun rays, drifting clouds, rain, lightning, snow, fog, stars), a hero with an animated temperature, an AI analyst, a 24-hour chart, nine metric cards with 24-hour detail charts, an alert center, a 7-day forecast, sun path, and Across Nepal |
| **Forecast** | 48-hour chart (temperature, rain, wind), 7 or 14 days with expandable details, daily highs, sun path |
| **Weather Maps** | Leaflet map with RainViewer radar playback, plus temperature, wind, cloud and precipitation layers sampled live from Open-Meteo |
| **AI Weather** | Streaming assistant that can look up other places, a full analyst briefing, risk insights and lifestyle recommendations |
| **Air Quality** | US EPA AQI gauge, 24-hour AQI, health guidance, and six pollutants compared with WHO 2021 guidelines |
| **Saved Locations** | Live local weather and time for each place, and side-by-side comparison with an AI verdict for an activity |
| **Settings** | °C/°F (metric/imperial), 12/24-hour clock, light, dark or auto theme, data controls, AI status, data sources |

Also included: search with autocomplete (Nepal first, with Devanagari names), current location, recent searches,
weather sharing (Web Share API or a copied link), skeleton loading, empty and error states, keyboard shortcuts
(`/` focuses search), and reduced-motion support.

## Design: Liquid Glass

Skycast's visual identity is a Liquid Glass-inspired system defined once in `src/app/globals.css`:

| Tier | Class | Used for |
| --- | --- | --- |
| Hero | `.glass-hero` | The weather hero: lightest frost so the sky shows through |
| 1 | `.glass-1` | Tiles inside panels: tint and edge only, no blur of its own (cheap) |
| 2 | `.panel` | Cards and panels: frosted glass with a specular edge and an inner highlight |
| 3 | `.panel-strong` | Floating chrome (sidebar, tab bar, modals, popovers, toasts, map overlays): dense frost |
| – | `.glass-control`, `.glass-pill` | Inputs, icon buttons, and the lens-like selected state for navigation |

- **Weather-responsive.** `html[data-weather]` (sunny, rain, cloudy, night, storm, snow, fog) retunes the tint, frost,
  edge light and reflection color for both themes: warm gold for sun, deeper cool frost for rain, navy with
  moonlight for night.
- **Light that moves.** On desktop, one throttled pointer listener (`GlassPointer`) moves each surface's
  reflection toward the cursor. Interactive cards lift, brighten and run a slow edge highlight on hover. The top
  bar frosts once content scrolls beneath it.
- **Atmosphere.** Weather gradients, drifting ambient light orbs, cloud illustrations, rain, snow, fog and stars,
  plus a static grain texture. Effects animate only `transform` and `opacity`.
- **Guardrails.** Blur is limited to tiers 2 and 3, and tiles never blur. Browsers without `backdrop-filter` get
  denser fallbacks, forced-colors mode drops translucency, and `prefers-reduced-motion` stops all motion.

## Getting started

```bash
npm install
cp .env.example .env.local   # add GROQ_API_KEY to enable AI
npm run dev
```

| Script | |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |

## Deploy on Vercel

1. Import the repo (framework: Next.js; keep the defaults).
2. Under **Settings → Environment Variables**, add `GROQ_API_KEY` (and optionally `GROQ_MODEL`).
3. Deploy. Everything else works without configuration.

## How the AI stays honest

- **Server-only key.** Groq is called only from `/api/ai/*` route handlers (`src/lib/groq`, guarded by
  `server-only`). The key is read at runtime and never sent to the browser. The build was checked: it does not
  appear in any client or server output.
- **Grounded prompts.** The server fetches weather itself and passes a compact facts object; the model is told
  to use only those numbers. Client-sent weather data is never trusted, and requests carry only a place and
  preferences.
- **Validated output.** Structured responses are parsed with Zod. Any sentence stating a temperature that isn't
  in the facts is dropped before it reaches the UI.
- **Facts vs. interpretation.** Risks (heavy rain, UV, wind, humidity, air quality, heat, cold, visibility) are
  computed from fixed thresholds with their measurements; the AI only explains them. They are labeled as model
  insights, never as official warnings.
- **Graceful fallback.** If the key is missing, rejected or Groq is down, the analyst and recommendations switch
  to a labeled rule-based summary, and the assistant explains that it is offline.
- **Model check.** `GROQ_MODEL` is verified against `models.list()` and falls back to a supported model if it
  isn't available.
- **Abuse limits.** Zod request validation, body size caps, a 500-character question limit, timeouts, and
  per-IP rate limits (insights 12/min, chat 15/min, compare 8/min). The limiter is in memory, so each serverless
  instance counts separately; use Upstash Redis or similar for a strict global limit.

## Data sources and limits

| Data | Provider | Notes |
| --- | --- | --- |
| Forecast, geocoding, air quality | [Open-Meteo](https://open-meteo.com/) | Free for non-commercial use (about 10k calls/day), no key. Responses cached 10 min. Commercial use needs their paid plan |
| Radar | [RainViewer](https://www.rainviewer.com/api.html) | Free public tiles, attribution required, native zoom capped at 7 |
| Base map | OpenStreetMap / [CARTO](https://carto.com/attributions) | Free with attribution for light traffic; heavy traffic needs a CARTO or MapTiler plan |
| Official alerts | [US National Weather Service](https://www.weather.gov/documentation/services-web-api) | United States only. Nepal's DHM has no public alert API, so Nepal shows a link to DHM instead of alerts |
| AI | [Groq](https://console.groq.com/docs) | Needs your API key; usage counts against your Groq plan |

Temperature, wind and cloud **map layers** are real values sampled on a 7×7 grid over the visible area. Smooth
raster layers (OpenWeatherMap or Tomorrow.io tiles) require a paid or keyed provider and are not included.

## Project structure

```
src/
  app/                   routes (each page is a Server Component exporting metadata) and API handlers
    api/weather|places|cities|nepal|alerts|map/*|ai/*
  components/
    layout/              app shell, sidebar, mobile tab bar, search
    weather/             hero, scene backdrop, custom SVG glyphs, metric cards, sun path, alert center
    forecast/  charts/  ai/  maps/  ui/  views/
  providers/             preferences, shared weather report, AI status, toasts
  hooks/                 useWeather, useInsights, usePersistentState
  lib/
    weather/             Open-Meteo client, conditions, formatting, risks, rules, alerts, radar
    groq/                client and model check, facts, prompts, schemas, insights, chat, compare
    utils/               rate limit, cache, request validation, responses
```

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the architecture plan.

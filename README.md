# GLOF Early Warning & Risk Assessment Dashboard

An interactive dashboard prototype for monitoring glacial lake outburst flood (GLOF)
risk across 20 glacial lakes in the Indian Himalayan Region.

> **Prototype note:** all lake telemetry, risk scores, LSTM-style probabilities and
> model metrics are **simulated** (seeded random generator + risk formulas) to
> demonstrate the system design. This is not a trained model and not for real
> hazard decisions. See "Data & limitations".

## What it does
- **Risk map:** 20 lakes across 5 Himalayan regions, colour-coded by risk level, with region filters
- **Risk table:** sortable and filterable by risk level, with CSV export
- **10-year time series:** surface area, water level, risk probability and ice thickness, with 1/3/5/10-year windows
- **Flood scenario view:** 25% / 50% / 100% dam-breach inundation illustration with peak discharge and arrival estimates
- **Satellite & DEM panel:** band-view toggles (RGB / NDWI / NDSI / DEM)
- **Risk reports:** per-lake technical report, printable, with CSV download
- **AI decision-support briefs:** generated with the Gemini API, with a built-in fallback if no key is set

## Tech stack
React 19, TypeScript, Vite, Tailwind CSS, D3, Recharts, Express, SQLite (better-sqlite3), Google Gemini API

## Data & limitations
- Lake names, coordinates and elevations are curated; everything else
  (time series, dam stability, population exposure, risk scores) is synthetic.
- The "LSTM" outputs and the model-evaluation page are illustrative placeholders,
  not results from a trained network.
- The flood simulation uses synthetic terrain and simplified scaling, not a hydrodynamic model.
- Roadmap: replace simulated data with real inventories (e.g. ICIMOD, Sentinel-2)
  and climate data (e.g. ERA5), then train and validate an actual model.

## Live demo
[add link once deployed and tested in an incognito window]

## Run it locally
Requires Node.js 20 or 22 (Node 26 breaks `better-sqlite3`).

```bash
npm install
npm run dev
```
Open http://localhost:3000. Optional: copy `.env.example` to `.env` and set
`GEMINI_API_KEY` (and `GEMINI_MODEL` if you get 404 errors) for AI-written briefs.

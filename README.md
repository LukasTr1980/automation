# Manual ET₀ (FAO‑56) Test

You can manually compute daily ET₀ (mm/day) using the exact backend implementation used by the irrigation app.

## Prerequisites

- Node 18+ installed
- Run commands from `nodebackend/` in this repository

## Quick Usage

Install dependencies:

```bash
cd nodebackend && npm ci
```

Run a calculation (example values):

```bash
npm run et0 -- --doy 180 --tmin 15 --tmax 25 --rh 60 --wind 3.2 --pressure 900 --cloud 45
```

Example output:

```text
ET0: <mm/day>
```

## Notes

- Uses the exact Penman–Monteith logic from `src/utils/evapotranspiration.ts` (`computeDailyET0FAO56`).
- Units: `tmin/tmax` in °C, `rh` in %, `wind` in m/s at measurement height, `pressure` in hPa, `cloud` as 0–100 %, `doy` is day‑of‑year (1–366, local).
- Optional overrides: `--lat`, `--elev`, `--albedo`, `--aS`, `--bS`, `--windZ`, `--verbose`.

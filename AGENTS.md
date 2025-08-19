# Repository Guidelines

## Project Structure & Modules
- `nodebackend/`: TypeScript backend (ES modules). Source in `src/`, build artifacts in `build/`. Key folders: `clients/` (Vault, Redis, MQTT, InfluxDB), `routes/`, `middleware/`, `utils/`. Entry point: `src/index.ts` (serves on port `8523`).
- `viteclientts/`: React + Vite + TypeScript client. Source in `src/`, static assets in `public/`, build output in `dist/`.
- CI & Ops: `.github/workflows/` Docker build; multi-stage `Dockerfile` builds backend and client.
- Docs: `CHANGELOG.md` records notable changes.

## Build, Test, and Development Commands
- Backend build/run: `cd nodebackend && npm ci && npm run build && node build/index.js` (or `npm test` to build+run).
- Backend watch: `cd nodebackend && npm run watch` (rebuild on change).
- Client dev: `cd viteclientts && npm ci && npm run dev` (Vite dev server).
- Client build/preview: `cd viteclientts && npm run build && npm run preview`.
- Docker: `docker build -t automation .` then `docker run -p 8523:8523 automation`.

## Coding Style & Naming Conventions
- Language: TypeScript with `strict` enabled; target ES2022; ESM.
- Linting: ESLint with `@typescript-eslint` (client also enforces React Hooks). Run `npm run lint` in `viteclientts/`; in backend use `npx eslint .`.
- Indentation: 2 spaces. Naming: camelCase (vars/functions), PascalCase (classes/React components), UPPER_SNAKE_CASE (env/constants). File names: `.ts` (backend), `.tsx` (React components).

### Design & Accessibility (Frontend)
- Use simple, flat surfaces. Prefer MUI `Card variant="outlined"` with `borderRadius: 2`; avoid gradients for backgrounds and cards.
- Keep page background clean and neutral (flat color), focusing attention on content.
- Use solid theme colors on icons/avatars where emphasis is needed (e.g., `primary.main`, `secondary.main`, `info.main`).
- Card headers: Use `slotProps={{ title: { sx: { fontWeight: 600 } } }}`; do not use deprecated `titleTypographyProps` (MUI v6).
- Dialogs/Modals: Render inside `#root` (pass `container={document.getElementById('root')}`) and set `aria-labelledby`; ensure focus moves into the dialog to avoid aria-hidden/focus warnings.
- Mobile gutters: Avoid double horizontal padding on `xs`. Rely on Container's default gutters and keep wrapper `Box` with `px: { xs: 0, md: 3 }, py: { xs: 2, md: 3 }` to prevent excessive margins on small screens.
- Status indicators: Prefer subtle elements (e.g., small colored dot + label) over large badges to match the simplified visual language.

#### Navigation
- Flat header: use a simple top bar with a bottom border (`borderBottom: 1px solid divider`), no elevation or shadows.
- Spacing: align header gutters with page content (`maxWidth: 1200`, `px: { xs: 2, md: 3 }`, centered `mx: 'auto'`).
- Active state: indicate with a small primary-colored dot before the label; avoid filled/raised tabs.
- Mobile: use a hamburger icon opening a simple `Menu`; include ARIA (e.g., button label "Menü öffnen").
- Text: keep all labels in German; keep the brand text minimal and neutral.

## Language & Logging
- Comments: All code comments must be written in English (frontend and backend).
- Logs: All log messages in code must be written in English (frontend and backend).
- UI: All user-visible text (frontend, API response messages shown in UI) must be in German.
- Prefer central helpers for messages to avoid drift; do not mix languages in a single message or string.
- Docs: All text in `CHANGELOG.md` and `AGENTS.md` must be written in English.

### Changelog Header
- `CHANGELOG.md` must always begin exactly with the following lines at the very top:
  - `# Changelog`
  - A blank line
  - `All notable changes to this project will be documented in this file.`
  - A blank line
  - `The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),`
  - `and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).`

### Frontend Localization
- The client is German-only. i18n has been removed from `viteclientts/` (no `i18next`/`react-i18next`).
- Static German strings are used directly in components for all labels, titles, and copy.
- Backend response keys shown to users must be mapped to German via `viteclientts/src/utils/messages.ts`:
  - Add/edit keys in that map when backend returns a new message key.
  - Use `messages[key] || key` when displaying to avoid crashes on unknown keys.
- Do not reintroduce i18n or locale switching.

### Frontend UI Conventions (Villa Anna)
- 7-day metrics on Bewässerung: Use the suffix "(7 Tage bis gestern)" and a tooltip showing the exact local date range (e.g., "Zeitraum: 12.08.–18.08. (lokal)") for both averages and sums (temperature, humidity, rain sum, irrigation sum, ET₀ sum).
- Blocker headers: Show a small info icon with a tooltip listing the possible blocker rules (temperature, humidity, 24h rain, rain rate, deficit) for quick at-a-glance context.

## Testing Guidelines
- Client unit tests: Prefer Vitest for component/unit tests. Name tests `*.test.ts` / `*.test.tsx` and colocate near source or under `__tests__/`.
- Backend unit tests: Prefer Jest or Vitest. Name tests `*.test.ts` and colocate near source or under `__tests__/`.
- End‑to‑end (Playwright): Installed in `viteclientts/`. Tests live in `viteclientts/tests/`. Run with `cd viteclientts && npx playwright test`. The config starts Vite preview on port `4173` and uses `baseURL` `http://localhost:4173`.
- Until comprehensive tests exist, validate by running the backend and client locally; keep functions pure and small to ease future testing.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits (e.g., `feat:`, `fix:`, `refactor:`) as used in history.
- PRs: include a clear description, linked issues, reproduction/verification steps, and screenshots for UI changes. Ensure both apps build (`npm run build`) and update `CHANGELOG.md` for user‑visible changes.

## Security & Configuration Tips
- Secrets: Use Vault with `VAULT_ROLE_ID`/`VAULT_SECRET_ID` in dev or Docker secrets in prod (`/run/secrets/automation_vault_*`). Never commit `.env*`.
- External services: InfluxDB, Redis, MQTT, OpenWeatherMap; endpoints in `nodebackend/src/envSwitcher.ts`.
- Auth & CSP: Traefik forwardauth enforces access and sets CSP. The app does not set CSP headers or accept CSP reports.
- PWA: The frontend no longer uses a Service Worker or manifest. On boot, existing SWs are unregistered to avoid cached `index.html` interfering with ForwardAuth redirects. Optionally set `Cache-Control: no-store` for HTML at the proxy for extra safety.

## Evapotranspiration (ET₀)
- Weekly only: 7‑day ET₀ sum is recalculated once per day shortly after midnight; the weekly total is stored, not individual daily outputs.
- Scheduler: Weather caches still refresh every 5 minutes (+30s), while weekly ET₀ is recomputed daily (00:40 local time).
- Data sources:
  - Redis daily aggregates (`weather:daily:last7`): last 7 full local days with `tMinC`, `tMaxC`, `tAvgC`, `rhMeanPct`, `windMeanMS` (sensor height), `pressureMeanHPa`.
  - Redis 7‑day means (`weather:agg:latest`): used as fallbacks if a daily field is missing (Tavg, RH, wind, pressure, mean diurnal range).
  - Influx (cloud cover): daily means for the same 7‑day window (used in radiation via Angström–Prescott, n/N ≈ 1 − cloud/100).
- Storage: Redis keys `et0:weekly:YYYY-MM-DD` and `et0:weekly:latest` store the weekly sum in mm.
- Consumption: Irrigation decision reads the latest weekly ET₀ from Redis. `queryAllData()` does not include ET₀.
- Note: ET₀ computation does not call WeatherLink directly; it reads inputs from Redis (plus Influx clouds) to avoid extra API load.

### Method (Backend)
- Formula: FAO‑56 Penman–Monteith (daily) with G≈0, computed per day and summed over 7 days.
- Radiation: Angström–Prescott using cloud‑cover daily means from Influx (`a_s`=0.25, `b_s`=0.50 by default).
- Humidity: `ea = es * RHmean/100` where `es = (svp(Tmax) + svp(Tmin)) / 2`.
- Wind: converts measured wind speed at `WIND_SENSOR_HEIGHT_M` to 2 m via FAO log law.
- Longwave: standard emissivity/cloud correction clamps to avoid unrealistically low Rnl.
- Inputs selection: Prefer daily values from `weather:daily:last7`; fall back to 7‑day means when a daily value is missing.

### ET₀ Ops & Debugging
- Manual run: `computeWeeklyET0()` can be invoked (e.g., from `index.ts` or a REPL) to produce today's Redis entry.
- Logs: Irrigation decision logs `[ET0] Using weekly ET₀ from Redis: <mm>`; the scheduler logs `ET₀ weekly sum (last 7 days): <mm>` on the daily run. ET₀ logs the 7 cloud means at info and per‑day inputs/derivations at debug (d1…d7).
- Data: Inspect Redis with `GET et0:weekly:latest`, `GET et0:weekly:YYYY-MM-DD`, and `GET weather:daily:last7`.
- Frontend API: The `/api/et0/latest` endpoint provides the most recent weekly ET₀ value for dashboard display.

## Real-Time Data Integration APIs

### WeatherLink Temperature API
- **Endpoint**: `/api/weather/temperature` — Cache-only current temperature in Celsius (from Redis `weather:latest`). Returns 503 if cache is missing. Response includes `source: 'redis'`.
- **Debug endpoint**: `/api/weather/debug` — Shows raw WeatherLink current data fields for troubleshooting.
- **Rate limiting**: Internal calls are rate limited, but the `/temperature` endpoint itself does not call WeatherLink.
- **Frontend integration**: VillaAnnaHomePage temperature status card reads from `/api/weather/latest` (cache-only) and displays Celsius.

### WeatherLink Latest Cache (Redis)
- **Scheduler**: Every 5 minutes with a 30-second delay (`30 */5 * * * *`).
- **Keys**:
  - `weather:latest` → JSON `{ temperatureC, humidity, rainRateMmPerHour, timestamp }`.
  - `weather:latest:temperatureC`, `weather:latest:humidity`, `weather:latest:rainRateMmPerHour`, `weather:latest:timestamp`.
- **Use**: Preferred by APIs and decision logic to reduce live API calls.

### Weather Aggregates Cache (Redis)
- **Scheduler**: Rolling rain totals (24h, 7d) update every 5 minutes. 7‑day means for temperature, humidity, wind, pressure, and mean diurnal range update once daily after midnight.
- **Keys**:
  - `weather:agg:latest` → JSON `{ rain24hMm, rain7dMm, temp7dAvgC, humidity7dAvgPct, wind7dAvgMS, pressure7dAvgHPa, temp7dRangeAvgC, timestamp }`.
  - `weather:agg:rain24h:mm`, `weather:agg:rain7d:mm`, `weather:agg:temp7d:avgC`, `weather:agg:humidity7d:avgPct`, `weather:agg:wind7d:avgMS`, `weather:agg:pressure7d:avgHPa`, `weather:agg:temp7d:rangeAvgC`, `weather:agg:timestamp`.
- **Consumption**: Irrigation decision uses these values first; if missing, it fetches live from WeatherLink.

### Weather Cache API
- **Endpoint**: `/api/weather/latest` — Returns Redis-cached weather snapshot and aggregates.
- **Response**: `{ latest, aggregates }`
  - `latest`: `{ temperatureC, humidity, rainRateMmPerHour, timestamp }`
  - `aggregates`: `{ rain24hMm, rain7dMm, temp7dAvgC, humidity7dAvgPct, wind7dAvgMS, pressure7dAvgHPa, temp7dRangeAvgC, timestamp }`

### Next Schedule API  
- **Endpoint**: `/api/schedule/next` - Fetches next scheduled irrigation task from Redis
- **Data source**: Uses existing `getScheduledTasks()` function from scheduler
- **Processing**: 
  - Filters for enabled irrigation tasks (`state === true`)
  - Parses `recurrenceRule` JSON to extract hour/minute for time display
  - Maps topics to human-readable zone names using frontend constants
- **Zone mapping**: Uses shared backend constants in `nodebackend/src/utils/constants.ts` (`irrigationSwitchTopics`, `irrigationSwitchSetTopics`, `irrigationSwitchDescriptions`); frontend mirrors these values.
- **Frontend integration**: Next Schedule status card and Quick Status section show real schedule data

### Frontend Dashboard Integration
- **VillaAnnaHomePage**: Modern dashboard with real-time status cards replacing all mock data
- **Status cards**: Blocker (live via SSE), Verdunstung 7 Tage, Temperatur, Nächster Zeitplan
- **Data flow**: React hooks fetch data on component mount with proper loading states and error handling; Blocker subscribes to `/api/mqtt` SSE and renders rule chips
- **Responsive design**: Cards adapt to screen size with consistent heights and proper text wrapping
- **Zone names**: All schedule displays use human-readable names (Stefan Nord, Stefan Ost, Lukas Süd, Lukas West, Alle)
- **Freshness indicator**: Schnellübersicht shows general cache freshness based on the latest snapshot timestamp from `/api/weather/latest.latest.timestamp` (warning dot if older than 10 minutes). Tooltip shows both current and aggregate timestamps for clarity.
- **Labels (current vs averages)**: Temperature card label is "Temperatur (aktuell)" (current value). 7‑day averages on the Bewässerung page are labeled "(7 Tage bis gestern)" and include a tooltip with the exact local date range (e.g., "Zeitraum: 12.08.–18.08. (lokal)").

## Irrigation Decision (No AI)
- Source of truth: `nodebackend/src/irrigationDecision.ts` implements a rule-based decision.
- Backend returns structured metrics (temps, humidity, rainfall, forecast, ET₀, deficit, blockers) for UI, not LLM text.
- Frontend displays these values inline on the Bewässerung page under the decision switch.
- Skip flag: `GET/POST /api/decisionCheck` toggles whether scheduled tasks bypass the decision check; value is stored in Redis under `skipDecisionCheck`.
- Behavior: Applies hard blockers (temp, humidity, rainfall, rain rate, deficit < 5 mm). If none apply, irrigation proceeds.
- Wiring: Scheduler and MQTT SSE call `createIrrigationDecision` directly; the `gptChatIrrigation.ts` adapter was removed.
- Weather input source: Decision logic reads latest values exclusively from Redis caches (`weather:latest`, `weather:agg:latest`); it does not call WeatherLink directly.
- Dependencies: No OpenAI usage; `openai` dependency and related Vault credentials are removed.

## Dev Server Notes
- The backend exits with a clear error if port `8523` is already in use (EADDRINUSE). Stop the previous instance (Ctrl+C) before re-running `npm run test`.

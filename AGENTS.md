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

## Testing Guidelines
- No test runner configured yet. Prefer adding unit tests (Vitest for client; Jest or Vitest for backend). Name tests `*.test.ts` / `*.test.tsx` and colocate near source or under `__tests__/`.
- Until tests exist, validate by running the backend and client locally; keep functions pure and small to ease future testing.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits (e.g., `feat:`, `fix:`, `refactor:`) as used in history.
- PRs: include a clear description, linked issues, reproduction/verification steps, and screenshots for UI changes. Ensure both apps build (`npm run build`) and update `CHANGELOG.md` for user‑visible changes.

## Security & Configuration Tips
- Secrets: Use Vault with `VAULT_ROLE_ID`/`VAULT_SECRET_ID` in dev or Docker secrets in prod (`/run/secrets/automation_vault_*`). Never commit `.env*`.
- External services: InfluxDB, Redis, MQTT, OpenWeatherMap; endpoints in `nodebackend/src/envSwitcher.ts`.
- Auth & CSP: Traefik forwardauth enforces access and sets CSP. The app does not set CSP headers or accept CSP reports.
- PWA: The frontend no longer uses a Service Worker or manifest. On boot, existing SWs are unregistered to avoid cached `index.html` interfering with ForwardAuth redirects. Optionally set `Cache-Control: no-store` for HTML at the proxy for extra safety.

## Evapotranspiration (ET₀)
- Weekly only: 7-day ET₀ sum is recalculated every 5 minutes using latest cached inputs; no daily ET₀ is stored.
- Scheduler: Every 5 minutes (+30s) refreshes Redis weather caches and recomputes weekly ET₀.
- Data sources:
  - Weather inputs from Redis aggregates (`weather:agg:latest`): 7d average temperature, humidity, wind, pressure, and mean diurnal range (Tmax−Tmin). These aggregates are refreshed every 5 minutes by polling WeatherLink.
  - Influx (cloud cover): daily means for the same 7-day window.
- Storage: Redis keys `et0:weekly:YYYY-MM-DD` and `et0:weekly:latest` store the weekly sum in mm.
- Consumption: Irrigation decision reads the latest weekly ET₀ from Redis. `queryAllData()` does not include ET₀.
- Note: ET₀ computation does not call WeatherLink directly; it reads inputs from Redis to avoid extra API load.

### ET₀ Ops & Debugging
- Manual run: `computeWeeklyET0()` can be invoked (e.g., from `index.ts` or a REPL) to produce today's Redis entry.
- Logs: Look for `[ET0] Using weekly ET₀ from Redis: <mm>` during irrigation decisions and `ET₀ weekly sum (last 7 days): <mm>` from the scheduler. A 5‑minute refresh log also appears.
- Data: Inspect Redis with `GET et0:weekly:latest` or `GET et0:weekly:YYYY-MM-DD`.
- Frontend API: The `/api/et0/latest` endpoint provides the most recent weekly ET₀ value for dashboard display.

## Real-Time Data Integration APIs

### WeatherLink Temperature API
- **Endpoint**: `/api/weather/temperature` — Provides current temperature in Celsius.
- **Cache-first**: Reads from Redis `weather:latest` if present; falls back to live WeatherLink fetch. Response includes `source: 'redis' | 'live'`.
- **Debug endpoint**: `/api/weather/debug` — Shows raw WeatherLink current data fields for troubleshooting.
- **Data source**: Uses `getWeatherlinkMetrics` with current sensor blocks (sensor type 37).
- **Processing**: Converts Fahrenheit to Celsius with error handling.
- **Rate limiting**: Respects WeatherLink API limits via the shared sliding-window limiter.
- **Frontend integration**: VillaAnnaHomePage temperature status card displays live temperature data.

### WeatherLink Latest Cache (Redis)
- **Scheduler**: Every 5 minutes with a 30-second delay (`30 */5 * * * *`).
- **Keys**:
  - `weather:latest` → JSON `{ temperatureC, humidity, rainRateMmPerHour, timestamp }`.
  - `weather:latest:temperatureC`, `weather:latest:humidity`, `weather:latest:rainRateMmPerHour`, `weather:latest:timestamp`.
- **Use**: Preferred by APIs and decision logic to reduce live API calls.

### Weather Aggregates Cache (Redis)
- **Scheduler**: Computed alongside the latest cache job every 5 minutes.
- **Keys**:
  - `weather:agg:latest` → JSON `{ rain24hMm, rain7dMm, temp7dAvgC, humidity7dAvgPct, timestamp }`.
  - `weather:agg:rain24h:mm`, `weather:agg:rain7d:mm`, `weather:agg:temp7d:avgC`, `weather:agg:humidity7d:avgPct`, `weather:agg:timestamp`.
- **Consumption**: Irrigation decision uses these values first; if missing, it fetches live from WeatherLink.

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

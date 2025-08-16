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

## Language & Logging
- Comments: All code comments must be written in English (frontend and backend).
- Logs: All log messages in code must be written in English (frontend and backend).
- UI: All user-visible text (frontend, API response messages shown in UI) must be in German.
- Prefer central helpers for messages to avoid drift; do not mix languages in a single message or string.

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
- Weekly only: Compute 7-day ET₀ sum once per day; no daily ET₀ is stored or used.
- Scheduler: Runs at `23:55` (see `nodebackend/src/scheduler.ts`).
- Data sources:
  - WeatherLink (temp, RH, wind, pressure) via range helpers chunked by 24h to respect API limits.
  - Influx (cloud cover): daily means for the same 7-day window.
- Storage: Append JSONL lines to `nodebackend/data/evapotranspiration_weekly/YYYY-MM-DD.jsonl` with `{ timestamp, et0_week }`.
- Consumption: Irrigation decision logic reads the latest weekly `et0_week` directly from JSONL in `irrigationDecision` using `readLatestJsonlNumber`. `queryAllData()` does not include ET₀.
- Notes: Do not write ET₀ to Influx; `.gitignore` excludes `nodebackend/data/`.

### ET₀ Ops & Debugging
- Manual run: `computeWeeklyET0()` can be invoked (e.g., from `index.ts` or a REPL) to produce today's JSONL entry.
- Logs: Look for `[ET0] Using weekly ET₀ from JSONL: <mm>` during irrigation decisions and `ET₀ weekly sum (last 7 days): <mm>` from the scheduler.
- Files: Latest record is the last line of `nodebackend/data/evapotranspiration_weekly/YYYY-MM-DD.jsonl`.
- Frontend API: The `/api/et0/latest` endpoint provides the most recent weekly ET₀ value for dashboard display.

## Real-Time Data Integration APIs

### WeatherLink Temperature API
- **Endpoint**: `/api/weather/temperature` - Provides current temperature from WeatherLink API
- **Debug endpoint**: `/api/weather/debug` - Shows raw WeatherLink current data fields for troubleshooting
- **Data source**: Uses existing `getWeatherlinkMetrics` function with current sensor blocks (sensor type 37)
- **Processing**: Automatically converts Fahrenheit to Celsius with proper error handling
- **Rate limiting**: Respects WeatherLink API limits through existing rate limiter
- **Frontend integration**: VillaAnnaHomePage temperature status card displays live temperature data

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
- Dependencies: No OpenAI usage; `openai` dependency and related Vault credentials are removed.

## Dev Server Notes
- The backend exits with a clear error if port `8523` is already in use (EADDRINUSE). Stop the previous instance (Ctrl+C) before re-running `npm run test`.

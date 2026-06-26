# AGENTS.md — Design & Development Handbook (Agent Edition)

## Purpose (for coding agents)
This handbook encodes exactly how to build, design, and reason about the irrigation automation app. It unifies repository rules, UI/UX standards, accessibility, state strategy, real‑time patterns, IoT‑grade security, testing, performance, and domain specifics (ET₀, WeatherLink, scheduling).

Follow these rules. Prefer the patterns and decisions stated here over guesses. Do not introduce new paradigms unless explicitly requested.

## PUBLIC REPOSITORY WARNING

> THIS REPOSITORY IS PUBLIC ON GITHUB.
> NEVER put secrets, credentials, API keys, tokens, passwords, local keys, private URLs, customer data, or any other sensitive information into source code, config files, documentation, tests, screenshots, commits, or any other file that may be pushed to GitHub.
> If a feature needs sensitive data, load it from Vault, Docker secrets, or local untracked environment files that are explicitly ignored by Git.

---

## Quick Start (agents)
- Backend run: `cd nodebackend && npm ci && npm run build && node build/index.js`
  - Direct local runs require reachable Redis/MQTT/QuestDB/Vault services and an ignored `nodebackend/.env` with `VAULT_ROLE_ID`/`VAULT_SECRET_ID`.
- Backend watch: `cd nodebackend && npm run watch`
- Client dev: `cd viteclientts && npm ci && npm run dev`
- Client build/preview: `cd viteclientts && npm run build && npm run preview`
- Docker build: `docker build -t automation .`
  - Running the final image requires Docker secrets `automation_vault_role_id` and `automation_vault_secret_id`; Swarm service deployment is the expected production-style runtime.

---

## Repository Map
- `nodebackend/`: TypeScript backend (ES modules). Source in `src/`, build in `build/`.
  - Key folders: `clients/` (Vault, Redis, MQTT, QuestDB), `routes/`, `middleware/`, `utils/`
  - Entry: `src/index.ts` (HTTP on port 8523)
- `viteclientts/`: React + Vite + TypeScript client. Source in `src/`, static in `public/`, build in `dist/`.
- CI & Ops: `.github/workflows/` (Docker build); multi‑stage `Dockerfile` builds backend and client.
- Docs: `CHANGELOG.md` records notable changes.

---

## Golden Rules (Do / Don’t)
- Do: Keep docs English; UI strings German; logs/comments English.
- Do: Map backend message keys → German via `viteclientts/src/utils/messages.ts` using `messages[key] || key`.
- Do: Use WSS/WebSockets for bi-directional control; SSE only for one-way blockers stream.
- Do: Keep server state in React Query; UI state separate.
- Do: Wait for explicit user instruction before creating git commits; never commit autonomously.
- Don’t: Reintroduce i18n or locale switching.
- Don’t: Call WeatherLink live from backend APIs; use Redis caches only.
- Don’t: Embed secrets in client; only expose `VITE_*` env vars.
- Don’t: Bypass server-side authorization checks where present, or any safety interlocks on commands.

---

## Coding Standards
- Language: TypeScript (strict), ESM modules. Backend target is ES2022; client target is ES2020.
- Linting: ESLint with `@typescript-eslint` (client enforces React Hooks).
  - Client lint: `cd viteclientts && npm run lint`
  - Backend lint: `cd nodebackend && npx eslint .`
- Formatting: 2‑space indentation.
- Naming: `camelCase` (vars/functions), `PascalCase` (classes/React components), `UPPER_SNAKE_CASE` (env/constants).
- Files: `.ts` (backend), `.tsx` (React components).

### Language & Logging
- Comments (code): English only.
- Logs (code): English only.
- UI (visible text): German only (static strings).
- Docs: English only (CHANGELOG.md, AGENTS.md). Strict: AGENTS.md must be written entirely in English; do not include German prose. It is acceptable to quote German UI strings as examples where relevant.

---

## Frontend Design System & Accessibility (MUI v7)

### Visual & Layout
- Overall: Simple, flat surfaces. No gradients. Neutral background.
- Cards: `Card` with `variant="outlined"` and `sx={{ borderRadius: 2 }}`.
- Color: Use theme solids for emphasis on icons/avatars (`primary.main`, `secondary.main`, `info.main`); avoid over‑coloring content.
- Card headers: Use slots (`slotProps={{ title: { sx: { fontWeight: 600 } } }}`). Do not use `titleTypographyProps`.
- Status indicators: Prefer small colored dot + short label over large badges.
- Dialogs/Modals: Render inside `#root` (`container={document.getElementById('root')}`), set `aria-labelledby`, move focus on open.

### Navigation
- Top app bar: flat with bottom border (`borderBottom: 1px solid`, color `divider`); no elevation/shadows.
- Gutters aligned with `CONTENT_MAX_WIDTH` (`900px`) and `Layout` container padding (`px: { xs: 1, md: 3 }`, `mx: 'auto'`).
- Active state: small primary‑colored dot before label; no raised/filled tabs.
- Mobile: hamburger button opening `Menu`, ARIA label “Menü öffnen”.
- Labels: German only; brand text minimal, neutral.

### Mobile Gutters
- Avoid double horizontal padding on `xs`.
- Wrap page content with `Box sx={{ px: { xs: 0, md: 3 }, py: { xs: 2, md: 3 } }}` and rely on `Container` defaults.

### Progressive Disclosure
- Homeowners: plain language (e.g., “Pumpe AN”), direct toggles, big tap targets.
- Engineers: reveal Advanced panels (calibration, logs, telemetry) via toggles/expansion or “Expert mode”.
- Keep core controls up front; tuck complexity deeper. Avoid info overload.

### Feedback & Visualization
- Commands: show loading/disabled + success/failure snackbar.
- Realtime control status (e.g., “Bewässerung läuft… 03:12”).
- Engineers: charts (moisture, water use, faults); Homeowners: plain indicators.
- Notifications: distinct severities (info/success/warn/error); avoid alarm fatigue.

### Accessibility (WCAG 2.1/2.2 AA, EAA 2025)
- Contrast ≥ 4.5:1. Never convey status via color alone—pair with icon/label.
- Keyboard: tab through all controls; visible focus ring.
- Names: proper accessible names (`aria-label`, `aria-labelledby`, `alt`).
- Landmarks: `role="navigation"` (named), `role="main"`; correct heading hierarchy.
- Testing: NVDA/VoiceOver runs; RTL a11y checks; dialogs must trap focus.
- Outdoor use: bigger touch targets and high‑contrast labels.

---

## Architecture (Vite + React + TS)

### Current Folder Strategy
`viteclientts/src/`
  components/        # Reusable UI (cross‑feature)
  pages/             # Route‑level views (if using routing)
  hooks/             # Shared hooks (SSE, countdowns, weather status, etc.)
  utils/             # Shared helpers, messages, snackbar/store utilities
  types/             # Global shared types if needed
  assets/, images/   # Static assets

Co‑locate component code (`Component.tsx`, `Component.test.tsx`, styles) in the same folder.
No path aliases are currently configured; imports are relative. If adding aliases, configure both `tsconfig.json` and `vite.config.ts` in the same change.

### Component Guidelines
- Small, pure, testable components.
- API/WS logic belongs in custom hooks or small utilities; keep views declarative.
- Prefer controlled components for forms; centralize formatters in `utils/`.

---

## State Management Strategy

### Decision Table
- Simple local UI state: use `useState`
- App‑wide static config (theme, auth user): React Context (split by domain)
- Medium global UI state: Zustand store (selectors to avoid rerenders)
- Server‑derived data: React Query (TanStack) queries & mutations
- Do not add Redux Toolkit or Jotai unless explicitly requested and justified by new complexity.

### Principles
- Server state ≠ client state. Keep server data in React Query; derive UI state separately.
- Treat commands as mutations: use React Query `useMutation` or a dedicated command hook.
- Optimistic updates: update UI immediately; reconcile with server/device events.
- Render performance: memoize selectors, split Contexts, use Suspense where useful.

---

## Command Execution (Irrigation Control)

### Pattern
- Current manual irrigation commands use authenticated/proxied HTTP POSTs such as `/api/simpleapi`; schedule/countdown commands use their existing REST routes.
- If adding a broader command layer, create `useIrrigationController()` exposing: `startZone(zoneId)`, `stopZone(zoneId)`, `stopAll()`, `setSchedule(id, payload)`, …
- Route new commands via authenticated HTTP POST or WebSocket/Socket.IO messages. Do not introduce GraphQL unless explicitly requested.
- Apply optimistic UI, emit toast/snackbar, handle retries/errors.

### Reliability
- Idempotency: include idempotency keys on commands; server de‑dupes.
- Queueing: if offline or WS down, queue in memory; flush on reconnect; cap size.
- Out‑of‑order: timestamps/sequence numbers; last writer wins or explicit conflict policy.

### Feedback
- Disable buttons or show inline loader while in flight.
- On failure, show clear German error (map backend key → German label).

---

## Real‑Time Integration

### Transport
- Prefer WebSockets (WSS) for bi‑directional control and telemetry.
- Optionally integrate MQTT over WebSockets if broker present.
- Use SSE only for one‑way streams (status only); WS is preferred elsewhere.

### Client Behavior
- Auth handshake on connect when implementing new authenticated WSS/Socket.IO flows. Current access is primarily enforced by Traefik ForwardAuth.
- Auto‑reconnect with backoff and “Reconnecting…” UI hint.
- Heartbeat/keepalive; detect stale socket.
- Event routing: a single WS client dispatches device updates to Zustand stores or invalidates React Query caches.

### Sync Model
- Devices → backend → push status deltas: `{ zoneId, status, at }`.
- UI applies deltas immediately; keep optimistic → confirmed path tight.

---

## Security & Privacy (IoT‑grade)

### Authentication & Authorization
- Never hardcode credentials. Use Traefik ForwardAuth and/or OAuth2/JWT with rotation where applicable.
- RBAC: roles (homeowner, engineer, admin) should guard commands/settings server-side when an app-level auth model is present. Until then, do not rely on client-only checks.
- Per‑resource checks: server verifies device ownership before executing commands.

### Transport & Protocol
- HTTPS for REST; WSS for WebSockets; TLS for MQTT.
- No plaintext; pin to secure origins only.

### Input Validation & Abuse Controls
- Validate/sanitize all inbound fields (backend).
- Rate limit command endpoints.
- Safety rules: block dangerous/conflicting commands (e.g., mutually exclusive valves).

### Secrets & Storage
- Secrets via Vault (`VAULT_ROLE_ID`/`VAULT_SECRET_ID`) in dev or Docker secrets in prod (`/run/secrets/automation_vault_*`).
- Vite exposes only `VITE_*` env vars; do not embed secrets client‑side.
- Prefer HttpOnly cookies over localStorage for long‑lived sessions.

### Data Protection
- Treat schedules/usage as sensitive. Encrypt at rest server‑side where applicable.
- Respect deletion and export on request (GDPR).

### Updates & Device Safety
- Firmware updates must be signed/verified (device side).
- Use command acknowledgements and prevent replay (nonces/sequence).

---

## Vite Tooling & Performance

### Recommended Plugins & Settings
- Current React plugin: `@vitejs/plugin-react`.
- `vite-plugin-svgr` is not currently installed; add it only when SVG-as-React-component imports are needed.
- PWA: currently disabled to avoid ForwardAuth issues.
  - If re‑introducing: use `vite-plugin-pwa` with update on reload and exclude HTML from caching to prevent stale auth redirects.
- Bundle analysis: add `rollup-plugin-visualizer` only when needed; maintain performance budgets (e.g., initial chunk < 300 KB gzip).

### SVG Icons
- Location: put external/custom SVGs under `viteclientts/src/assets/icons/`.
- Default usage: import as URL and render via `<img>` (no extra plugin required).
  - Example: `import sunUrl from '../assets/icons/sun.svg'` then `<img src={sunUrl} alt="..." />`.
- Optional: enable `vite-plugin-svgr` to import as React components when needed.
  - Example (once enabled): `import Logo from '../assets/icons/logo.svg?react'` and use `<Logo role="img" aria-label="..." />`.
- Accessibility: always provide an accessible name (`alt` for `<img>`, or `aria-label`/`title` for components) when the icon conveys meaning.

### Code‑Splitting
- Route‑level lazy imports for heavy admin/engineer tools.
- Manual chunks for large libs (charts, MUI icons) to improve caching.

### Dev Proxy
- Use Vite dev server proxy to avoid CORS in dev (e.g., `/api → http://localhost:8523`).

---

## Testing Policy

### Unit & Integration (Client)
- Vitest + React Testing Library; colocate `*.test.ts(x)` with code.
- Cover components, hooks, controller services (mock HTTP/WS).

### Backend Tests
- Backend tests are lightweight TypeScript scripts using `node:assert`, compiled by `npm run build` and run from `build/tests/*`.
- Existing scripts include `test:weather-staleness`, `test:blocker-reason`, `test:tuya-bridge`, and `test:suntimes`.

### End‑to‑End (Client)
- Playwright configured in `viteclientts/`.
  - Tests: `viteclientts/tests/`
  - Config: `viteclientts/playwright.config.ts`
- Launches Vite dev on `http://127.0.0.1:5173`; `page.goto('/')`.
- Browsers: chromium, firefox, webkit. Install with `npx playwright install [--with-deps]`.
- Parallel locally; CI: `workers: 1`, `retries: 2`.
- Reports: HTML in `viteclientts/playwright-report/`; traces `trace: 'on-first-retry'`.

### Locators (strict & stable)
- Use roles/landmarks: `getByRole('navigation', { name: 'Navigation' })`, `getByRole('main')`.
- After clicks, assert URL (e.g., `/\/bewaesserung$/`) before content assertions.
- Constrain headings by level/name where helpful.

### Accessibility Testing
- Use React Testing Library/Vitest assertions for component accessibility where practical; add `@testing-library/jest-dom` only if the assertion set is needed.
- Periodically verify with NVDA/VoiceOver and keyboard‑only runs.

### Until coverage improves
- Keep functions pure & small. Manually validate by running both apps locally.

---

## Commit & PR Guidelines
- Commits: Conventional Commits (`feat:`, `fix:`, `refactor:`, …).
- PRs: clear description, linked issues, repro/verification steps, screenshots for UI changes.
- Ensure both apps build (`npm run build`) and `CHANGELOG.md` is updated for user‑visible changes.
- CHANGELOG language: English only. Do not write German text in CHANGELOG entries; translate any German content to English before merging.

### Changelog Header (must be exact)
```
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
```

---

## Frontend UI Conventions (Villa Anna)

### 7‑Day Metrics on Bewässerung
- Suffix “(7 Tage bis gestern)”.
- Tooltip shows exact local range (e.g., UI string “Zeitraum: 12.08.–18.08. (lokal)”) for averages (temperature, humidity). Do not display 7‑day rain sums or weekly ET₀.

### Blocker Headers
- Small info icon with tooltip listing possible blockers (temperature, humidity, 24h rain, rain rate, soil bucket: depletion < start threshold). Treat weather station freshness as a separate station/data fault, not as a normal weather blocker.

### Dashboard Integration
- `VillaAnnaHomePage`: real‑time status cards replacing mocks.
- Cards: Blocker (via SSE), Wasserreserve, Bewässerungsmenge, Verdunstung/Temperatur, Nächste Bewässerung, Regenprognose, Sonnenstrahlung.
- Data flow: Hooks fetch on mount with loading/error states; Blocker subscribes to `/api/mqtt` SSE and renders rule chips; water reserve reads `/api/soil-bucket` so freshness remains visible even when decision checks are disabled.
- Responsive: Cards adapt to screen sizes; consistent heights; good text wrapping.
- Zone names: Human‑readable always (Stefan Nord, Stefan Ost, Lukas Süd, Lukas West, Alle).
- Weather station freshness has exactly one hard threshold: 30 minutes. Missing, invalid, backend-marked stale, query-failed, or older-than-30-minute current weather data is an error.
- Global weather fault: render a top banner on all pages when the weather station freshness state is error. Use a German error label such as “Wetterstation gestört: Automatische Bewässerung blockiert.” and include timestamp details in an info tooltip.
- Freshness indicator: show weather station age from `latest.observedAt ?? latest.timestamp`; no 10-minute warning state. Tooltip shows both snapshot and aggregated timestamps; “Aggregiert” shows `meansTimestamp` when present else `aggregates.timestamp`.
- Labels: Temperature card label is “Temperatur (aktuell)” only when the station is fresh; in the fault state use “Temperatur (letzter Wert)” and show a visible station fault label. 7‑day averages are labeled “(7 Tage bis gestern)” with range tooltip.

---

## Backend: Weather & Scheduling APIs

### WeatherLink Temperature API
- `GET /api/weather/temperature` — cache‑only current °C from Redis `weather:latest`. `503` if cache missing. Response includes `source: 'redis'`.
- `GET /api/weather/debug` — raw WeatherLink current data for troubleshooting.
- Rate limiting: Internal only; endpoint itself never hits WeatherLink live.
- Frontend: `VillaAnnaHomePage` temp card reads `/api/weather/latest` (cache‑only) and displays °C.

### Weather Latest Cache (Redis)
- Scheduler: every 5 min + 30 s (`30 */5 * * * *`).
- Keys:
  - `weather:latest` → `{ temperatureC, humidity, rainRateMmPerHour, timestamp, observedAt?, cachedAt?, stale? }`
  - Individual convenience keys: `weather:latest:*`
- Consumption: APIs and decision logic prefer cached values.

### Weather Aggregates Cache (Redis)
- Scheduler:
  - Rolling rain (24h, 7d) every 5 min.
  - 7‑day means (temp, humidity, wind, pressure, mean diurnal range) daily after midnight.
- Key: `weather:agg:latest` → `{ rain24hMm, rain7dMm, temp7dAvgC, humidity7dAvgPct, wind7dAvgMS, pressure7dAvgHPa, temp7dRangeAvgC, timestamp, meansTimestamp? }`
- Consumption: Decision and HTTP APIs use cached aggregates only; do not call WeatherLink live from request/decision paths.

### Weather Cache API
- `GET /api/weather/latest` → `{ latest, aggregates }`
  - `latest`: `{ temperatureC, humidity, rainRateMmPerHour, timestamp, observedAt?, cachedAt?, stale? }`
  - `aggregates`: as above

### Soil Bucket API
- `GET /api/soil-bucket` → current Redis soil bucket for the default decision zone (`lukasSued`).
- Response: `{ zone, soilStorageMm, tawMm, depletionMm, updatedAt }`.
- This endpoint is read-only and does not initialize or mutate the bucket. The frontend uses it for water reserve freshness/display independently of `/api/mqtt` decision snapshots and independently of the `skipDecisionCheck` flag.

### Next Schedule API
- `GET /api/schedule/next` – next scheduled irrigation from Redis.
- Processing:
  - Filter enabled (`state === true`)
  - Parse `recurrenceRule` JSON → hour/minute
  - Map topics → readable zone names (shared constants)
- Response includes `nextIrrigation` with `status`, `reasonKey`, `blockerCount`, `nextTimestamp`, and `zone`.
- Weather station freshness failures map to `reasonKey: 'weather_station_error'` and must render as a station/data fault (for example “Wetterstation gestört”), not as the generic weather-blocker label.
- Constants: `nodebackend/src/utils/constants.ts`
  - `irrigationSwitchTopics`, `irrigationSwitchSetTopics`, `irrigationSwitchDescriptions`
- Frontend mirrors values.

---

## Evapotranspiration (ET₀)

### Method & Ops
- Formula: FAO‑56 Penman–Monteith (daily, G≈0). Daily values are stored and used for the soil‑bucket balance.
- Radiation: measured global radiation from QuestDB table `weather_radiation_observations`; days without enough measured radiation are stored as `null` instead of falling back to cloud-cover estimates.
- Humidity: `ea = es * RHmean/100`, `es = (svp(Tmax)+svp(Tmin))/2`.
- Wind: convert sensor height to 2 m using FAO log law.
- Longwave: standard emissivity/cloud correction with clamps (avoid unrealistic `Rnl`).

### Inputs (priority)
- Redis `weather:daily:last7`: last 7 full local days → `tMinC`, `tMaxC`, `tAvgC`, `rhMeanPct`, `windMeanMS`, `pressureMeanHPa`.
- Redis `weather:agg:latest`: 7‑day means fallback (Tavg, RH, wind, pressure, mean diurnal range).
- QuestDB measured global radiation observations for the same 7-day window.

### Storage
- Daily ET₀ values: `et0:daily:last7` (mm).

### Consumption & Debug
- Decision uses daily ET₀ via the soil‑bucket balance (see `dailySoilBalance`). Weekly ET₀ is not used for decisions and is not shown in the UI.
- Inspect Redis inputs with `GET weather:daily:last7`; inspect computed ET₀ with `GET et0:daily:last7`.

---

## Irrigation Decision (No AI)
- Source of truth: `nodebackend/src/irrigationDecision.ts` (rule‑based).
- Returns: structured metrics (temps, humidity, rainfall, forecast, blockers) for UI. No LLM text.
- Frontend: displays metrics inline under decision switch on Bewässerung page.
- Skip flag: `GET/POST /api/decisionCheck` toggles bypass via Redis `skipDecisionCheck`.
- Behavior: hard blockers (weather station data missing/stale, temperature, humidity, rainfall, rain rate, soil bucket: depletion < start threshold). If none apply → allow irrigation.
- Weather station data missing/stale is a system/data fault and must be surfaced separately from normal weather-condition blockers in UI labels and schedule summaries.
- Inputs: reads exclusively from Redis caches (`weather:latest`, `weather:agg:latest`); never calls WeatherLink directly.
- OpenAI: not used; `openai` dep removed.

---

## Real‑Time Data Integration (Backend Wiring)
- SSE for blockers: `/api/mqtt` SSE streams rule chips to UI.
- WebSocket (preferred for bi‑directional): Use authenticated WSS when implementing live control + telemetry (see Real‑Time Integration).

---

## Security & Proxy Notes
- Auth & CSP: Traefik forwardauth enforces access and sets CSP; the app itself does not set CSP headers or accept CSP reports.
- PWA: Disabled. On boot, unregister any existing SWs to avoid cached `index.html` breaking forwardauth redirects. Optionally set proxy `Cache-Control: no-store` for HTML.

---

## Dev Server Notes
- Backend exits with a clear error if port `8523` is taken (`EADDRINUSE`). Stop previous instance before re‑running.

---

## Checklists (agent‑friendly)

### Before touching UI
- Labels in German; follow MUI v7 patterns (slots, outlined cards, flat app bar).
- Add ARIA names; verify roles/landmarks; ensure focus visibility and dialog focus trap.
- Use status chips (small dot + label) for state.

### Adding an API endpoint (backend)
- Validate and sanitize inputs.
- Enforce server-side authorization where the current auth/role model supports it; never rely on client-side checks for safety-sensitive commands.
- Use Redis caches; never hit WeatherLink directly from HTTP endpoints.
- Rate limit commands; return clear machine keys that map to German via `messages.ts`.

### Implementing a WebSocket feature
- Authenticate handshake; add heartbeat and reconnect backoff.
- Keep a single WS client; dispatch to stores or invalidate React Query caches.
- Include idempotency keys and sequence numbers in commands/events.

### PR readiness
- Lint and build both apps.
- Update `CHANGELOG.md` for user‑visible changes (exact header required).
- Include screenshots for UI changes and repro steps.

---

## Appendix: Design Tokens & Patterns

### MUI Theme Defaults (preferred)
- Typography: h1/h2 600, h3/h4 600, subheads 500; avoid body < 14px on mobile.
- Spacing: base unit 8px; consistent grid.
- Radius: 8px (MUI 2); Elevation: none (use borders/dividers).
- Semantic colors: `success` → irrigation OK (green dot + label), `warning` → attention/non-fault staleness, `error` → faults/failures such as weather station freshness errors, `info` → neutral notices.

### Status Chip Pattern
- Small dot + short label (German), e.g., `● Läuft`, `● Gestoppt`, `● Verbindungsproblem`.

### ARIA Landmarks
- Top nav: `role="navigation"`, `aria-label="Navigation"`.
- Main content: `role="main"`.
- Link/button text in German, descriptive.

---

## Quick Reference (paths & constants)
- Weather/Schedule constants: `nodebackend/src/utils/constants.ts`
  - `irrigationSwitchTopics`, `irrigationSwitchSetTopics`, `irrigationSwitchDescriptions`

End of AGENTS.md

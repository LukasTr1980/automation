Repository Guidelines
Project Structure & Modules

nodebackend/: TypeScript backend (ES modules). Source in src/, build artifacts in build/. Key folders: clients/ (Vault, Redis, MQTT, InfluxDB), routes/, middleware/, utils/. Entry point: src/index.ts (serves on port 8523).

viteclientts/: React + Vite + TypeScript client. Source in src/, static assets in public/, build output in dist/.

CI & Ops: .github/workflows/ Docker build; multi-stage Dockerfile builds backend and client.

Docs: CHANGELOG.md records notable changes.

Build, Test, and Development Commands

Backend build/run: cd nodebackend && npm ci && npm run build && node build/index.js (or npm test to build+run).

Backend watch: cd nodebackend && npm run watch (rebuild on change).

Client dev: cd viteclientts && npm ci && npm run dev (Vite dev server).

Client build/preview: cd viteclientts && npm run build && npm run preview.

Docker: docker build -t automation . then docker run -p 8523:8523 automation.

Coding Style & Naming Conventions

Language: TypeScript with strict enabled; target ES2022; ESM.

Linting: ESLint with @typescript-eslint (client also enforces React Hooks). Run npm run lint in viteclientts/; in backend use npx eslint ..

Indentation: 2 spaces. Naming: camelCase (vars/functions), PascalCase (classes/React components), UPPER_SNAKE_CASE (env/constants). File names: .ts (backend), .tsx (React components).

Design & Accessibility Guidelines (Frontend)
Visual & Layout

Use simple, flat surfaces. Prefer MUI Card variant="outlined" with borderRadius: 2; avoid gradients for backgrounds and cards.

Keep page background clean and neutral (flat color), focusing attention on content.

Use solid theme colors on icons/avatars where emphasis is needed (primary.main, secondary.main, info.main).

Card headers: use slotProps={{ title: { sx: { fontWeight: 600 } } }}; do not use deprecated titleTypographyProps (MUI v6).

Status indicators: prefer subtle elements (small colored dot + label) over large badges.

Dialogs: render inside #root, set aria-labelledby, and ensure focus moves into the dialog.

Navigation

Flat header with bottom border (borderBottom: 1px solid divider), no shadows.

Spacing: align header gutters with content (maxWidth: 1200, px: { xs: 2, md: 3 }, centered mx: 'auto').

Active state: indicate with a small primary-colored dot; avoid raised/filled tabs.

Mobile: hamburger Menu with ARIA label (“Menü öffnen”).

Text: all labels in German; brand text minimal.

Cross-Platform & User Types

Design for both homeowners and engineers:

Homeowners: simple labels (“Pumpe AN”) and intuitive controls.

Engineers: advanced data views (logs, sensor calibration) via expandable panels or expert mode.

Progressive disclosure: show core irrigation controls first, advanced config deeper.

Responsive layouts: consistent experience across mobile/desktop/tablet.

Accessibility (WCAG/EAA 2025)

Follow WCAG 2.1/2.2 AA.

Minimum color contrast 4.5:1 for text/background.

Never use color alone: pair with labels/icons.

Ensure all interactive elements have accessible names (aria-label, alt).

Full keyboard navigation with visible focus.

Test with screen readers (NVDA, VoiceOver).

Add tooltips for metrics (e.g., date ranges, blockers) and icons.

Architecture & State Management
Project Structure

Feature-first organization:

src/features/<feature>/: domain modules (e.g., irrigation, scheduling). Contain components, hooks, services.

src/components/: reusable, cross-feature UI components.

src/pages/: route-level views if using router.

src/hooks/, src/context/: shared custom hooks and providers.

src/services/: API clients, WebSocket handlers, utils.

Co-locate component code (Component.tsx, Component.test.tsx, styles) in same folder.

Use path aliases (@components, @features/irrigation) for clean imports.

State Management

Local/UI state: useState or Context for simple, static config.

Global complex state: Redux Toolkit for predictable flows and debugging.

Lightweight global state: Zustand or Jotai for simpler stores.

Server state: React Query (TanStack) for caching, background refresh, and command mutations.

Command execution: encapsulate irrigation control in hooks/services (useIrrigationController) for reuse and testing.

Optimistic updates: update UI immediately on command, then reconcile with server/device state.

Error handling: centralize notifications (toast, snackbar) for failed commands.

Security & Configuration

Authentication: use JWT/OAuth2; enforce role-based access (homeowner vs engineer).

Transport: enforce HTTPS/WSS; no plaintext traffic.

Secrets: never commit; store in Vault or Docker secrets.

Validation: sanitize all input; backend validates commands; rate-limit APIs.

Local storage: avoid storing long-lived tokens in localStorage; prefer HttpOnly cookies.

OWASP IoT Top 10 compliance: secure comms, patch dependencies, device auth, signed updates.

Frontend: Vite only exposes VITE_* env vars – never leak secrets.

CSP/Auth: Traefik forwardauth enforces access; app itself does not set CSP headers.

Integration & Real-Time Communication

APIs: REST/GraphQL for configs, schedules, logs.

Real-time: WebSockets (wss://) for live zone status, telemetry, and immediate command feedback.

MQTT (optional): via WebSocket bridge for IoT integration.

Sync: keep UI state updated via push events; reconcile with optimistic updates.

Reconnection: auto-reconnect websockets; fallback to HTTP if offline.

Conflict handling: idempotent commands, timestamps for out-of-order events.

Offline: show cached state with warning; queue commands until reconnect.

Tooling & Testing
Tooling

Vite plugins:

@vitejs/plugin-react-swc for fast builds.

vite-plugin-svgr for SVG as components.

vite-plugin-pwa if adding install/offline.

Rollup visualizer to monitor bundle size.

Storybook: for component-driven development and design system documentation.

ESLint + Prettier: enforce coding style and accessibility rules.

Testing

Unit tests: Vitest + React Testing Library; colocate *.test.ts(x).

Backend tests: Jest or Vitest.

E2E: Playwright (configured for dev server).

CI: run lint, unit tests, E2E (workers:1, retries:2).

Reports: HTML reports and Playwright traces stored in repo.

Locator guidance: prefer role-based locators (getByRole), assert URL after nav.

Language & Logging

Comments & logs: English only.

UI text: German only (static strings).

Message mapping: backend keys mapped in viteclientts/src/utils/messages.ts.

Docs: English only (CHANGELOG.md, AGENTS.md).

Special Domain Logic
Evapotranspiration (ET₀)

Computed daily, summed weekly (FAO-56 Penman–Monteith).

Inputs from Redis daily aggregates and Influx clouds.

Stored in Redis as et0:weekly:YYYY-MM-DD and et0:weekly:latest.

Consumed by decision engine and frontend.

Logs include inputs/outputs at info/debug.

Irrigation Decision

Pure rule-based (src/irrigationDecision.ts).

Hard blockers: temp, humidity, rainfall, rain rate, deficit.

Skip flag toggled via /api/decisionCheck.

Backend returns structured metrics; frontend displays inline.

No AI or OpenAI dependencies.

Commit & PR Guidelines

Commits: Conventional Commits (feat:, fix:, refactor:).

PRs: clear description, linked issues, repro steps, screenshots for UI changes.

Build check: both backend and client must build before merge.

CHANGELOG.md: updated for user-visible changes; follow Keep a Changelog + SemVer.
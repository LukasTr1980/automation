# Repository Guidelines

## Project Structure & Modules
- `nodebackend/`: TypeScript backend (ES modules). Source in `src/`, build artifacts in `build/`. Key folders: `clients/` (Vault, MongoDB, Redis, MQTT, InfluxDB), `routes/`, `middleware/`, `utils/`. Entry point: `src/index.ts` (serves on port `8523`).
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

## Testing Guidelines
- No test runner configured yet. Prefer adding unit tests (Vitest for client; Jest or Vitest for backend). Name tests `*.test.ts` / `*.test.tsx` and colocate near source or under `__tests__/`.
- Until tests exist, validate by running the backend and client locally; keep functions pure and small to ease future testing.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits (e.g., `feat:`, `fix:`, `refactor:`) as used in history.
- PRs: include a clear description, linked issues, reproduction/verification steps, and screenshots for UI changes. Ensure both apps build (`npm run build`) and update `CHANGELOG.md` for user‑visible changes.

## Security & Configuration Tips
- Secrets are fetched via Vault using `VAULT_ROLE_ID`/`VAULT_SECRET_ID` in dev or Docker secrets in production (`/run/secrets/automation_vault_*`). Never commit `.env*`.
- External services: InfluxDB, MongoDB, Redis, MQTT, OpenAI, OpenWeatherMap; configure endpoints in `nodebackend/src/envSwitcher.ts` and related configs.


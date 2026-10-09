# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start Vite dev server (HMR, proxy /api → localhost:8080)
pnpm build            # Type-check (tsc -b) then bundle with Vite → dist/
pnpm build:milos      # Build then copy dist/ → milos-ui-0.0.1/ (for external deploy)
pnpm lint             # Run oxlint on src/
pnpm preview          # Preview production build locally
```

No test framework is configured.

## Architecture

React 19 SPA with TypeScript, Vite 8, and React Router 7. Three-page app: **Auth → Onboarding → Daily Routine dashboard**.

### Routing & Auth flow (in [src/app/App.tsx](src/app/App.tsx))

- On mount, `POST /auth/refresh` attempts silent re-auth via httpOnly cookie. If successful, the user is logged in.
- Route guards redirect unauthenticated users to `/auth` and onboarded users past `/onboarding`.
- `App.tsx` holds all auth state (token, user, form fields) and passes them as props — no global state library. `AuthContext` provides `user` / `setUser` to children.

### API layer ([src/lib/api.ts](src/lib/api.ts))

- `apiRequest<T>(path, options)` wraps `fetch` with `credentials: 'include'` (for refresh-token cookie), auto JSON serialization/deserialization, and throws `ApiError` on non-2xx responses.
- `API_BASE_URL` defaults to `/api/v1`; override with `VITE_API_BASE_URL` env var for production.
- Auth endpoints (`/auth/login`, `/auth/register`, `/auth/logout`) bypass `apiRequest` and call `fetch` directly in `App.tsx`.
- Daily routine and onboarding API modules use `toAbsoluteApiUrl()` to build full URLs (avoids proxy issues in production).

### Feature structure (follows [codingrules.md](codingrules.md))

Each feature under `src/features/<name>/` has: `api/`, `components/`, `pages/`, `types/`. Global shared code lives in `src/components/`, `src/hooks/`, `src/lib/`, `src/types/`.

- **auth** — `AuthPage` with sign-in/sign-up toggle, decorative hero panel.
- **onboarding** — `OnboardingPage` with weekday/weekend toggle, `EditingBoard` timeline, `BuddyChat` AI assistant, `TaskEditModal`. Communicates with `/default-routine/` and `/api/ai/chat/default-routine/` endpoints.
- **daily** — `DailyRoutinePage` with date navigation, same `EditingBoard` + `BuddyChat` pattern. Communicates with `/api/routine-manager/daily-routine/` and `/api/ai/chat/daily-routine/` endpoints.

### Shared components

- `EditingBoard` — the core timeline view: 24-hour vertical track with draggable/resizable task blocks, live clock, scroll-to-current-time, task completion toggling. Shared between onboarding and daily pages.
- `BuddyChat` — AI chat sidebar using `react-markdown` for rendering bot replies.
- `TaskEditModal` — create/edit task form (name, start time, duration, notes, color).
- `FabButton` — floating action button for adding tasks.

### Dev proxy ([vite.config.ts](vite.config.ts))

Vite proxies `/api` → `http://localhost:8080` and strips `www-authenticate` headers on 401 responses to prevent browser native auth dialogs.

### Styling

Plain CSS in `src/index.css` and `src/App.css` — no CSS framework. Uses CSS custom properties (e.g., `--blue-primary`). Font: Poppins from Google Fonts.

## Deployment

Two deploy targets exist:
- **GitHub Pages** (`.github/workflows/deploy.yml`): builds and deploys `dist/` to `tangtaidvlp/milos.github.io` via `peaceiris/actions-gh-pages@v4`.
- **AWS S3 + CloudFront** (noted in [notes/deploy-secrets-notes.md](notes/deploy-secrets-notes.md)): requires `AWS_ROLE_ARN`, `S3_BUCKET_NAME`, `CLOUDFRONT_DISTRIBUTION_ID`.

## Key conventions

- File extensions: `.tsx` for React components with TypeScript, `.ts` for pure logic, `.jsx` for React components without types. There is a mix — new work should use `.tsx`/`.ts`.
- `verbatimModuleSyntax: true` — use `import type` for type-only imports.
- oxlint enforces React rules-of-hooks and warns on non-constant exports.
- The backend is a separate service (not in this repo) expected at `localhost:8080`.

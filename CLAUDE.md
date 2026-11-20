# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Coding rules for this repo (loaded automatically):
@codingrules.md

## Commands

```bash
pnpm dev              # Start Vite dev server (HMR, proxy /api → localhost:8080)
pnpm build            # Type-check (tsc -b) then bundle with Vite → dist/
pnpm build:milos      # Build then copy dist/ → milos-ui-0.0.1/ (for external deploy)
pnpm lint             # Run oxlint on src/
pnpm preview          # Preview production build locally
pnpm test             # Vitest unit tests (pure logic: *.test.ts next to the code)
```

Tests cover pure logic only (no DOM setup). UI behaviour is checked by hand with the feature's `quickstart.md`.

## Architecture

React 19 SPA with TypeScript, Vite 8, and React Router 7. Three-page app: **Auth → Onboarding → Daily Routine dashboard**.

### Route table ([src/app/App.tsx](src/app/App.tsx))

| Route        | Page               | Guard |
|-------       |------              |-------|
| `/`          | Redirect           | → `/auth` if logged out, else → `/dashboard` or `/onboarding` |
| `/auth`      | `AuthPage`         | Redirects to `/dashboard` or `/onboarding` if already logged in |
| `/onboarding`| `OnboardingPage`   | Requires login; redirects to `/dashboard` if onboarded |
| `/dashboard` | `DailyRoutinePage` | Requires login + onboarded; redirects to `/onboarding` or `/auth` |
| `*`          | Redirect           | Same logic as `/` |

Uses `HashRouter` (not `BrowserRouter`) — all routes appear after `#` so GitHub Pages always serves `index.html`.

### Routing & Auth flow (in [src/app/App.tsx](src/app/App.tsx))

- On mount, `POST /auth/refresh` attempts silent re-auth via httpOnly cookie. If successful, the user is logged in.
- Route guards redirect unauthenticated users to `/auth` and onboarded users past `/onboarding`.
- `App.tsx` holds all auth state (token, user, form fields) and passes them as props — no global state library. `AuthContext` (from [src/context/AuthContext.ts](src/context/AuthContext.ts)) provides `user` / `setUser` to children.
- **Note:** [src/context/Auth.ts](src/context/Auth.ts) is a stale/unused duplicate of `AuthContext.ts` — use `AuthContext.ts`.

### API layer ([src/lib/api.ts](src/lib/api.ts))

- `apiRequest<T>(path, options)` wraps `fetch` with `credentials: 'include'` (for refresh-token cookie), auto JSON serialization/deserialization, and throws `ApiError` on non-2xx responses.
- `API_BASE_URL` defaults to `/api/v1`; override with `VITE_API_BASE_URL` env var for production.
- Auth endpoints (`/auth/login`, `/auth/register`, `/auth/logout`) bypass `apiRequest` and call `fetch` directly in `App.tsx`.
- **Two URL-building patterns exist:**
  - Onboarding API modules use relative paths like `/default-routine/...` (goes through Vite proxy in dev).
  - Daily routine API modules use `toAbsoluteApiUrl(path)` which builds `new URL(path, window.location.origin)` — this avoids proxy issues in production where the backend is on a different origin. Prefer this pattern for new API code.

### Feature behavior (structure rules are in `codingrules.md`)

- **onboarding** — the Weekday/Weekend tabs are two separate default routines, loaded with `fetchDefaultRoutine(userId, 'DAILY' | 'WEEKEND')` (`features/onboarding/api/defaultRoutine.ts`; the server creates an empty weekend routine on first request). Each tab has its own `BuddyChat` (the inactive one is hidden), because the server keeps one AI conversation per routine. Load/save failures show an error banner instead of an empty board. On completion, `POST /api/users/{userId}/onboarding/complete` marks the user as onboarded; the GET of that path returns the User, whose flag is `onboardCompleted`.
- **Board live clock** — `EditingBoard` has a `liveClock` prop (default `true`). The setup screen passes `liveClock={false}`: no clock readout, Pause/Resume, slider, now-line, current-task highlight or "Now: …" line, and the board opens at 06:00 (again on each Weekday/Weekend switch; zoom keeps the top time in place). The dashboard keeps the live clock. Spec `specs/003-onboarding-time-live-off/`.
- **walkthrough** — intro slides + guided tour (`features/walkthrough/`, spec `specs/002-onboarding-instruction/`). `OnboardingPage` opens it on every visit until onboarding is done; "How it works" replays it (slides only on the dashboard). Text lives in `content/walkthroughContent.ts`, mirrored from `walkthrough-script.md`. The tour finds its targets by `data-tour="…"` attributes on the setup screen; search for `data-tour=` before renaming or restructuring those elements.
- **daily** — "Clean up" deletes all tasks for the current date. On first access to a non-today date, `ensureDailyRoutine` lazily creates the routine (cloning from the user's default routine).

### Shared components (quirks)

The four shared components — `EditingBoard`, `BuddyChat`, `TaskEditModal`, `FabButton` — all live under `src/features/onboarding/components/`. The daily page imports them via relative paths (`../../onboarding/components/...`). New features that need these components should either:

- Continue importing from `onboarding/components/` (pragmatic, matches existing pattern), or
- Move them to `src/components/` (cleaner, but requires updating all imports).

`TaskEditModal` takes a `showColor` prop; the daily page passes `showColor={false}` because daily tasks have no color.

### Mobile view toggle pattern

Both `OnboardingPage` and `DailyRoutinePage` use a `mobileView` state (`'board'` | `'chat'`) to swap between the timeline and the AI chat sidebar on narrow screens. The root div carries `data-mobile-view={mobileView}` which CSS uses to show/hide sections. A floating chat button (with `SendIcon`) switches to `'chat'`, and a "View schedule" button switches back to `'board'`.

### Type differences between features

- `RoutineTask` (onboarding): has `color?: string` — tasks can be color-coded.
- `DailyTask` (daily): has `completed: boolean` instead of color — tasks track completion state. The server computes `endTime` from `startTime + durationMinutes` in both types; never send it in create/update requests.

### Dev proxy ([vite.config.ts](vite.config.ts))

Vite proxies `/api` → `http://localhost:8080` and strips `www-authenticate` headers on 401 responses to prevent browser native auth dialogs. The `base` path is set to `/milos.github.io/` for GitHub Pages asset URLs.

### Styling

Plain CSS in `src/index.css` and `src/App.css` — no CSS framework. Uses CSS custom properties (e.g., `--blue-primary`). Font: Poppins from Google Fonts. CSS class naming is loose (mix of BEM-like `.ob-*` for onboarding, `.dr-*` for daily routine, and generic `.page`/`.btn` classes).

## Deployment

Two deploy targets exist:
- **GitHub Pages** (`.github/workflows/deploy.yml`): builds and deploys `dist/` to `tangtaidvlp/milos.github.io` via `peaceiris/actions-gh-pages@v4`.
- **AWS S3 + CloudFront** (noted in [notes/deploy-secrets-notes.md](notes/deploy-secrets-notes.md)): requires `AWS_ROLE_ARN`, `S3_BUCKET_NAME`, `CLOUDFRONT_DISTRIBUTION_ID`.

## Key conventions

- **File extensions:** `.tsx` for React components with TypeScript, `.ts` for pure logic, `.jsx` for React components without types. The onboarding and daily feature pages use `.jsx` (no types), while the auth page uses `.tsx`. New work should use `.tsx`/`.ts`.
- **`verbatimModuleSyntax: true`** — use `import type` for type-only imports.
- **oxlint** enforces React rules-of-hooks (error) and warns on non-constant exports. Config in [`.oxlintrc.json`](.oxlintrc.json).
- The backend is a separate repo (`../ms-personal-routine-manager`) expected at `localhost:8080`.
- **URL construction for API calls:** Use `toAbsoluteApiUrl(path)` (as done in `features/daily/api/`) for production safety — it builds full URLs from `window.location.origin`. Avoid bare relative paths like `/default-routine/...` in new code.
- **Auth state:** Only `AuthContext` (from `src/context/AuthContext.ts`) is active. `src/context/Auth.ts` is a stale duplicate — don't import from it.
- **`pnpm`** is the package manager — don't use `npm` or `yarn`.

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

React 19 SPA with TypeScript, Vite 8, and React Router 7. Flow: **Auth → Onboarding → app shell** (sidebar with Today, Default routine, Analytics). Spec: `specs/F002-ui-refactoring/`.

### Route table ([src/app/App.tsx](src/app/App.tsx))

| Route              | Page                 | Guard |
|-------             |------                |-------|
| `/`                | Redirect             | → `/auth` if logged out, else → `/today` or `/onboarding` |
| `/auth`            | `AuthPage`           | Redirects to `/today` or `/onboarding` if already logged in |
| `/onboarding`      | `OnboardingPage`     | Requires login; redirects to `/today` if onboarded |
| `/today`           | `DailyRoutinePage`   | Shell route (see below) |
| `/default-routine` | `DefaultRoutinePage` | Shell route |
| `/analytics`       | `AnalyticsPage` (placeholder) | Shell route |
| `/dashboard`       | Redirect             | Old bookmarks → `/today` (same guard) |
| `*`                | Redirect             | Same logic as `/` |

The three shell routes are children of one layout route: `RequireOnboarded` (→ `/auth` or `/onboarding`) wrapping `AppShell` (`src/components/layout/`). `AppShell` renders the sidebar, the page `<Outlet>`, and the "Replay tour" intro slides; pages read `user`, `onLogout`, `isMobile`, etc. with `useShellContext()` and start with `<PageHeader>` (burger on narrow screens, title, actions, Sign out).

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
- **Board live clock** — `EditingBoard` has a `liveClock` prop (default `true`). The setup screen passes `liveClock={false}`: no clock readout, Pause/Resume, slider, now-line, current-task highlight or Now/Next footer, and the board opens at 06:00 (again on each Weekday/Weekend switch; zoom keeps the top time in place). The Today page keeps the live clock: the board scrolls to now **once per mount**; clock ticks, Pause/Resume, the slider, zoom, saves and date changes never move the view (zoom keeps the top time in place in both modes; specs F005). Spec `specs/003-onboarding-time-live-off/`.
- **walkthrough** — intro slides + guided tour (`features/walkthrough/`, spec `specs/002-onboarding-instruction/`). `OnboardingPage` opens it on every visit until onboarding is done; "How it works" replays it there. After onboarding, "Replay tour" in the sidebar replays the slides only. Text lives in `content/walkthroughContent.ts`, mirrored from `walkthrough-script.md`. The tour finds its targets by `data-tour="…"` attributes on the setup screen (it uses the first *visible* match, so `add-task` sits on both the "+ Add task" header button and the phone FAB); search for `data-tour=` before renaming or restructuring those elements.
- **default routine editor** — `features/onboarding/components/DefaultRoutineEditor.tsx` + `hooks/useDefaultRoutines.ts` hold the Weekday/Weekend editing (load/save errors, task modal). `OnboardingPage` adds Buddy chat, "Ready to roll" and the tour; `features/default-routine/pages/DefaultRoutinePage.tsx` adds Buddy chat (one per tab, `features/default-routine/api/defaultRoutineChat.ts`) without the finish step.
- **sidebar** — shown on wide screens by default; the hidden/shown choice is stored in `localStorage["milos.sidebar.collapsed"]` (`components/layout/sidebarPreference.ts`). At ≤ 760px it opens from a burger as an overlay (closes on pick, backdrop, Escape).
- **daily** — "Clean up" and "+ Add task" sit in the board toolbar (`EditingBoard` `toolbarActions` prop); the board footer shows Now/Next (`features/daily/utils/nowAndNext.ts`). "Clean up" deletes all tasks for the current date. On first access to a non-today date, `ensureDailyRoutine` lazily creates the routine (cloning from the user's default routine).

### Shared components (quirks)

The four shared components — `EditingBoard`, `BuddyChat`, `TaskEditModal`, `FabButton` — all live under `src/features/onboarding/components/`. The daily page imports them via relative paths (`../../onboarding/components/...`). New features that need these components should either:

- Continue importing from `onboarding/components/` (pragmatic, matches existing pattern), or
- Move them to `src/components/` (cleaner, but requires updating all imports).

`BuddyChat` takes an optional `loadHistory(before?)` prop (F004). With it, the stored conversation is shown under the greeting (newest 20 first). Scrolling to the top of the thread, or pressing "Show earlier messages", loads older pages; the reading position is kept. A failed load shows "Couldn't load earlier messages." and sending still works. The paging and merge logic lives in `onboarding/components/chatHistory.ts` (tested), which also strips the `Onboarding: [ … ]` wrapper from stored onboarding messages. Callers key the chat by routine id (Default Routine, Onboarding) or by `selectedDate` (Daily), so it remounts and loads the right conversation. History APIs: `fetchDefaultRoutineChatHistory` (`default-routine/api/defaultRoutineChat.ts`) and `fetchDailyRoutineChatHistory` (`daily/api/dailyRoutineTasks.ts`); types are in `onboarding/types/chatHistory.ts`.

`TaskEditModal` takes a `showColor` prop; the daily page passes `showColor={false}`: daily tasks do have a stored color (copied from the default routine, or assigned by the server), but it isn't picked on that page. With `showColor`, the dialog shows `PaletteSwatches` (`features/palette/`): the backend palette plus a Custom color.

### Mobile view toggle pattern

Both `OnboardingPage` and `DailyRoutinePage` use a `mobileView` state (`'board'` | `'chat'`) to swap between the timeline and the AI chat on phones (≤ 760px; from 761px up the chat is always beside the board). `DefaultRoutinePage` uses the same pattern. The root div carries `data-mobile-view={mobileView}` which CSS uses to show/hide sections. A floating chat button (with `SendIcon`) switches to `'chat'`, and a "View schedule" button switches back to `'board'`.

### Type differences between features

- `RoutineTask` (onboarding) and `DailyTask` (daily) both have `color?: string | null` — a backend palette id (e.g. `green`, follows the theme) or an exact `#RRGGBB`. Omit it on create and the server assigns the next round-robin palette color; routines expose that as `nextColor`. A null color on update keeps the stored one (specs F005).
- `DailyTask` adds `completed: boolean` — tasks track completion state. The server computes `endTime` from `startTime + durationMinutes` in both types; never send it in create/update requests.

### Dev proxy ([vite.config.ts](vite.config.ts))

Vite proxies `/api` → `http://localhost:8080` and strips `www-authenticate` headers on 401 responses to prevent browser native auth dialogs. The `base` path is set to `/milos.github.io/` for GitHub Pages asset URLs.

### Styling

Plain CSS, no framework. **All colours, spacing, radius, shadow and type values come from `src/styles/tokens.css`** (primitives + semantic tokens; spec `specs/F002-ui-refactoring/contracts/style-tokens.md`). Use semantic tokens (`var(--color-accent)`, `var(--color-text-secondary)`, …) everywhere else — **never a raw hex/rgb value**. `src/styles/noRawColors.test.ts` fails on any literal outside `tokens.css` (allowlist: brand logos in `AuthPage.tsx`, the `<input type="color">` default in `PaletteSwatches.tsx`); `src/styles/contrast.test.ts` checks WCAG contrast of the token pairs in **both themes**. Shared classes live in `src/styles/base.css` with a `ui-` prefix (`.ui-btn`, `.ui-btn-primary`, `.ui-icon-btn`, `.ui-card`, `.ui-pill`, `.ui-segmented`). **Light/dark theme (F005)**: `tokens.css` holds light values in `:root` and a `:root[data-theme="dark"]` block that overrides tier-2 semantic tokens only — never style per theme anywhere else except task-card/swatch palette variables. `<html data-theme>` is set before first paint by the inline script in `index.html` and kept in sync by `src/theme/useTheme.ts` (module-level store); the per-device choice is `localStorage["milos.theme"]` (`src/theme/themePreference.ts`; absent = follow the OS). `components/ThemeToggle.tsx` sits in the sidebar footer, the auth header and the onboarding top bar. **Task colors** come from the backend palette (`features/palette/`: `usePalette()` fetches `GET /api/v1/task-palette` once per session; `resolveTaskColor()` turns a task's `color` into `--task-accent-light/-dark` and `--task-bg-light/-dark` inline variables, and `.ob-board-task` / `.ob-swatch` pick the pair for the current theme). There are no `--color-task-N-*` tokens any more; an unresolved color falls back to the neutral card style. Page CSS: `src/App.css` (`.ob-*` onboarding/board/buddy, `.drt-*` default routine, `.dr-*` daily, `.wt-*` walkthrough) and `src/components/layout/AppShell.css` (shell, sidebar, page header). Font: Poppins.

Test files are type-checked by `tsconfig.test.json` (adds Node types); `tsconfig.app.json` excludes `*.test.ts`.

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

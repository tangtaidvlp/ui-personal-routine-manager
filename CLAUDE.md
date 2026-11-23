# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Coding rules for this repo (loaded automatically):
@codingrules.md

## Commands

```bash
pnpm dev              # Start Vite dev server (calls the backend at localhost:8080 via .env.development)
pnpm build            # Type-check (tsc -b) then bundle with Vite → dist/
pnpm build:milos      # Build then copy dist/ → milos-ui-0.0.1/ (for external deploy)
pnpm lint             # Run oxlint on src/
pnpm preview          # Preview production build locally
pnpm test             # Vitest: logic tests (*.test.ts, Node) + React component tests (*.test.tsx, jsdom)
pnpm test:e2e         # Playwright, headless Chromium (e2e/); needs backend + `pnpm dev` running
```

## Testing strategy

Testing Trophy: let types and lint catch the cheap bugs, unit-test the logic, and cover the core journeys with a few Playwright tests. Add component tests only where the UI itself has logic. The suite is a guardrail so that a change (including one Claude makes) can't silently break an existing feature. It is not a coverage exercise. Constitution Principle II has the summary.

| Layer | What | Where / tool | Command |
|---|---|---|---|
| Static | Typos, wrong props, broken imports | Strict TypeScript (`tsc -b`), oxlint | `pnpm build`, `pnpm lint` |
| Unit | Every pure function, reducer, schema or transformer, with its edge cases (empty, null, zero, negative, malformed input). E.g. `palette/utils/taskColor`, `settings/utils/settingsSchema`, `walkthrough/utils/walkthroughReducer`, `daily/utils/nowAndNext` | `*.test.ts` next to the code; Vitest in Node | `pnpm test` |
| Component | Only complex widgets: multi-step flows, forms with conditional validation, stateful lists (e.g. Buddy chat history paging, the reflection task popup). Not simple buttons, headers or static pages. Existing simple-component tests stay; don't add new ones | `*.test.tsx` next to the code; Vitest + Testing Library; put `// @vitest-environment jsdom` at the top (`src/test/setupDom.ts` adds jest-dom matchers and cleanup only when a DOM exists) | `pnpm test` |
| E2E | 5–10 core journeys: register, onboard and sign in/out; editing the default and the daily routine; reflection; settings and profile. Today: `profile`, `reflection`, `settings-persistence`, `today-board` (daily board: live clock, task dialog, "More" menu) | `e2e/*.spec.ts`; Playwright, headless Chromium; helpers `registerAndOnboard`, `signIn` in `e2e/helpers.ts`; every run registers a fresh user | `pnpm test:e2e` (setup below) |

Rules:
- **Test user behaviour, not implementation.** Query the way a user finds things (`getByRole`, `getByLabelText`, `getByText`). Never assert on internal state, hook calls or CSS classes.
- **No snapshot tests.** Never create `.snap` files.
- **Fake the backend at the feature's API module**, with `vi.mock('../api/<module>.ts')` (example: `settings/hooks/useUserSettings.test.ts`). All HTTP goes through `src/lib/api.ts` and `features/*/api/`, so that is the network boundary. Don't mock custom hooks or child components, and don't add MSW.
- **No coverage targets.** Spend tests on core journeys (e2e) and pure logic (unit).
- **Keep the targeted style checks:** `src/styles/contrast.test.ts` (WCAG AA contrast in both themes, constitution VI) and `src/styles/noRawColors.test.ts`. Skip heavier extras: visual regression, Storybook interaction tests, full automated accessibility suites.
- **Bug fixes start with a failing test** at the layer where the bug lives: unit for a logic bug, component for a widget bug, Playwright for a journey bug.
- **Workflow:** when you build or change a feature, add or update its Playwright journey and unit tests for any logic it adds. Before committing, run `pnpm lint && pnpm test`, plus `pnpm test:e2e` for the journeys you touched.

E2E setup: start the backend with `SPRING_PROFILES_ACTIVE=fast ./gradlew bootRun` (for reflection, also `SPRING_AI_ACTIVE=false`), then `pnpm dev`, then `pnpm test:e2e`. The first time, run `pnpm exec playwright install chromium`.

Visual polish is still checked by hand with the feature's `quickstart.md`.

## Architecture

React 19 SPA with TypeScript, Vite 8, and React Router 7. Flow: **Auth → Onboarding → app shell** (sidebar with Today, Default routine, Analytics; the user block opens Profile). Spec: `specs/.done.F002-ui-refactoring/`.

### Route table ([src/app/App.tsx](src/app/App.tsx))

| Route              | Page                 | Guard |
|-------             |------                |-------|
| `/`                | Redirect             | → `/auth` if logged out, else → `/today` or `/onboarding` |
| `/auth`            | `AuthPage`           | Redirects to `/today` or `/onboarding` if already logged in |
| `/onboarding`      | `OnboardingPage`     | Requires login; redirects to `/today` if onboarded |
| `/today`           | `DailyRoutinePage`   | Shell route (see below) |
| `/default-routine` | `DefaultRoutinePage` | Shell route |
| `/analytics`       | `AnalyticsPage` (placeholder) | Shell route |
| `/profile`         | `ProfilePage` (`features/profile/`) | Shell route; opened from the sidebar user block, not in `NAV_ENTRIES` |
| `/dashboard`       | Redirect             | Old bookmarks → `/today` (same guard) |
| `*`                | Redirect             | Same logic as `/` |

The shell routes are children of one layout route: `RequireOnboarded` (→ `/auth` or `/onboarding`) wrapping `AppShell` (`src/components/layout/`). `AppShell` renders the sidebar, the page `<Outlet>`, and the "Replay tour" intro slides; pages read `user`, `onLogout`, `isMobile`, etc. with `useShellContext()` and start with `<PageHeader>` (burger on narrow screens, title, actions). There is no Sign out in the header; it lives on the Profile page (F010).

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
- **Board live clock** — `EditingBoard` has a `liveClock` prop (default `true`). The live clock always follows real time: there is no Pause/Resume or time slider, and it refreshes when the tab becomes visible again (`useBoardClock`, F010). The setup screen passes `liveClock={false}`: no clock readout, now-line, current-task highlight or Now/Next footer, and the board opens at 06:00 (again on each Weekday/Weekend switch; zoom keeps the top time in place). The Today page keeps the live clock: the board scrolls to now **once per mount**; clock ticks, zoom, saves and date changes never move the view (zoom keeps the top time in place in both modes; specs F005). Spec `specs/.done.003-onboarding-time-live-off/`.
- **walkthrough** — intro slides + guided tour (`features/walkthrough/`, spec `specs/.done.002-onboarding-instruction/`). `OnboardingPage` opens it on every visit until onboarding is done; "How it works" replays it there. After onboarding, "Replay tour" in the sidebar replays the slides only. Text lives in `content/walkthroughContent.ts`, mirrored from `walkthrough-script.md`. The tour finds its targets by `data-tour="…"` attributes on the setup screen (it uses the first *visible* match, so `add-task` sits on both the "+ Add task" header button and the phone FAB); search for `data-tour=` before renaming or restructuring those elements.
- **default routine editor** — `features/onboarding/components/DefaultRoutineEditor.tsx` + `hooks/useDefaultRoutines.ts` hold the Weekday/Weekend editing (load/save errors, task modal). `OnboardingPage` adds Buddy chat, "Ready to roll" and the tour; `features/default-routine/pages/DefaultRoutinePage.tsx` adds Buddy chat (one per tab, `features/default-routine/api/defaultRoutineChat.ts`) without the finish step.
- **profile (F006)** — `features/profile/pages/ProfilePage.tsx`: Account (name = username, else email; read-only), Plan (`GET /api/v1/users/{id}/profile`; everyone is "Free plan"), Preferences (`ThemeControl variant="full"` + board zoom stepper) and Sign out. A failed profile load still shows what sign-in knew. The sidebar user block is a `NavLink` to `/profile` ("Open profile"), and the collapsed rail shows the avatar as the same link.
- **account settings (F006)** — `features/settings/`: `hooks/useUserSettings.ts` is a module-level store. `App.tsx` calls `loadUserSettings(userId)` after login and after the silent refresh (`startUserSession`), and `await resetUserSettings()` first in logout (sends a pending save while the session is valid). Theme and the **one shared board zoom** (`useBoardZoom()`, used by `EditingBoard` on Today, Default routine and Onboarding) are saved via `PATCH /api/v1/users/{id}/settings`; theme saves at once, zoom after 500 ms (pending zoom is also sent on `pagehide` with `keepalive`). Changes made while settings load win over the loaded values. A failed save keeps the value and shows `SettingsSaveNotice` (rendered once in `App.tsx`); a failed load falls back quietly. Known keys and defaults live in `utils/settingsSchema.ts` (mirror of the backend registry) — add a preference there and in the backend, no DB change.
- **sidebar** — shown on wide screens by default; the hidden/shown choice is stored in `localStorage["milos.sidebar.collapsed"]` (`components/layout/sidebarPreference.ts`). At ≤ 760px it opens from a burger as an overlay (closes on pick, backdrop, Escape).
- **reflection (F007, `specs/.done.F007-reflection/`)**: lives in `features/reflection/` (api, types, components, hooks, utils).
  - **Toggle**: a compact **"Reflection"** toggle (`ReflectionToggle`, `aria-pressed`) sits in the board toolbar. There are no Plan/Reality tabs. Reflection mode is `reflectionOn && !isFutureDate(date)`. It is kept across date changes; future days disable the toggle and show a hint under the date row.
  - **Creating a reflection**: entering via the toggle creates it (`ensureReflection` copies the plan once). Changing date in reflection mode only reads (`fetchReflection`) and offers "Reflect on this day" (no silent writes); until then the plan is shown view-only.
  - **Layout** (`useMediaQuery('(min-width: 1280px)')` in `src/hooks/`, page `data-layout="single|compare"`):
    - At 1280px and wider, `CompareBoards` shows Plan | Reality side by side. Both are editable ("Add to plan" / "Add to reality"). One `BoardToolbar` drives both boards with a shared `useBoardClock`; scrolling is synced by `useSyncedScroll`; zoom is the shared account setting. Gap clear and Reset day act on the plan only.
    - Below 1280px, one board shows Reality, and tapping a reality task opens `ReflectionTaskPopup` (status, plan vs real, Edit).
  - **Page handlers** take a target (`'plan' | 'reality'`), and the task modal remembers its target. Plan edits made while reflecting also refresh the reflection.
  - **Reality boards** pass `showCompletion={false}`, so they have no done checks. "Clean up" is plan-only.
  - **Comparison and note**: `ReflectionSummaryStrip` (one line of totals and chips, with a collapsed task-by-task list) sits above the board(s). `ReflectionNote` (Buddy's note, get/refresh) is in the reflection BuddyChat `topSlot` with `compactHeader`. BuddyChat is keyed `${date}:reality` and has its own history.
  - **Board API**: `EditingBoard` has the optional props `showToolbar`, `clock`, `gapClearMode`, `resetSignal`, `scrollContainerRef`, `showCompletion` and `toolbarMenuActions`. Its toolbar is `BoardToolbar.jsx`: `actions` always show; zoom, Gap clear, Reset day and `menuActions` (Today: Clean up) fold into a "More" disclosure (`ToolbarMoreMenu.tsx`) when the toolbar's own width is ≤ 770px (CSS container query in `App.css`; measured from the full Today toolbar, F010). Those tools render in both places and CSS shows one; `.ob-board-scroll` uses `isolation: isolate` so the board's layers stay under the open panel.
  - **Styling and tests**: `data-reflection="on"`, a "Reality" badge, and a dashed outline on the Reality board. Styles are the `.rf-*` classes in `App.css`. E2E: `e2e/reflection.spec.ts` (run with a mock-AI backend: `SPRING_AI_ACTIVE=false`).
- **daily** — "Clean up" and "+ Add task" sit in the board toolbar (`EditingBoard` `toolbarActions` prop); the board footer shows Now/Next (`features/daily/utils/nowAndNext.ts`). "Clean up" deletes all tasks for the current date. On first access to a non-today date, `ensureDailyRoutine` lazily creates the routine (cloning from the user's default routine).

### Shared components (quirks)

The four shared components — `EditingBoard`, `BuddyChat`, `TaskEditModal`, `FabButton` — all live under `src/features/onboarding/components/`. The daily page imports them via relative paths (`../../onboarding/components/...`). New features that need these components should either:

- Continue importing from `onboarding/components/` (pragmatic, matches existing pattern), or
- Move them to `src/components/` (cleaner, but requires updating all imports).

`BuddyChat` takes an optional `loadHistory(before?)` prop (F004). With it, the stored conversation is shown under the greeting (newest 20 first). Scrolling to the top of the thread, or pressing "Show earlier messages", loads older pages; the reading position is kept. A failed load shows "Couldn't load earlier messages." and sending still works. The paging and merge logic lives in `onboarding/components/chatHistory.ts` (tested), which also strips the `Onboarding: [ … ]` wrapper from stored onboarding messages. Callers key the chat by routine id (Default Routine, Onboarding) or by `selectedDate` (Daily), so it remounts and loads the right conversation. History APIs: `fetchDefaultRoutineChatHistory` (`default-routine/api/defaultRoutineChat.ts`) and `fetchDailyRoutineChatHistory` (`daily/api/dailyRoutineTasks.ts`); types are in `onboarding/types/chatHistory.ts`.

`TaskEditModal` takes duration as Hours + Minutes (saved as `durationMinutes`, 1–1440; `onboarding/utils/duration.ts`, F010). Its `showColor` prop defaults to `true`, and every page, Today included, shows the color picker (no color picked = the server assigns the next one). With `showColor`, the dialog shows `PaletteSwatches` (`features/palette/`): the backend palette plus a Custom color.

### Mobile view toggle pattern

Both `OnboardingPage` and `DailyRoutinePage` use a `mobileView` state (`'board'` | `'chat'`) to swap between the timeline and the AI chat on phones (≤ 760px; from 761px up the chat is always beside the board). `DefaultRoutinePage` uses the same pattern. The root div carries `data-mobile-view={mobileView}` which CSS uses to show/hide sections. A floating chat button (with `SendIcon`) switches to `'chat'`, and a "View schedule" button switches back to `'board'`.

### Type differences between features

- `RoutineTask` (onboarding) and `DailyTask` (daily) both have `color?: string | null` — a backend palette id (e.g. `green`, follows the theme) or an exact `#RRGGBB`. Omit it on create and the server assigns the next round-robin palette color; routines expose that as `nextColor`. A null color on update keeps the stored one (specs F005).
- `DailyTask` adds `completed: boolean` — tasks track completion state. The server computes `endTime` from `startTime + durationMinutes` in both types; never send it in create/update requests.

### Dev server ([vite.config.ts](vite.config.ts))

There is no `/api` proxy: `.env.development` sets `VITE_API_BASE_URL=http://localhost:8080`, so `apiRequest('/api/v1/...')` calls the backend directly (the backend's `fast`/`local` CORS config allows `localhost:5173`). `base` is `/`. `vite.config.ts` also holds the Vitest config (`test.include`, `setupFiles`).

### Styling

Plain CSS, no framework. **All colours, spacing, radius, shadow and type values come from `src/styles/tokens.css`** (primitives + semantic tokens; spec `specs/.done.F002-ui-refactoring/contracts/style-tokens.md`). Use semantic tokens (`var(--color-accent)`, `var(--color-text-secondary)`, …) everywhere else — **never a raw hex/rgb value**. `src/styles/noRawColors.test.ts` fails on any literal outside `tokens.css` (allowlist: brand logos in `AuthPage.tsx`, the `<input type="color">` default in `PaletteSwatches.tsx`); `src/styles/contrast.test.ts` checks WCAG contrast of the token pairs in **both themes**. Shared classes live in `src/styles/base.css` with a `ui-` prefix (`.ui-btn`, `.ui-btn-primary`, `.ui-icon-btn`, `.ui-card`, `.ui-pill`, `.ui-segmented`). **Light/dark theme (F005)**: `tokens.css` holds light values in `:root` and a `:root[data-theme="dark"]` block that overrides tier-2 semantic tokens only — never style per theme anywhere else except task-card/swatch palette variables. `<html data-theme>` is set before first paint by the inline script in `index.html` and kept in sync by `src/theme/useTheme.ts` (module-level store: `setThemePreference` = user choice, saved to the account when signed in; `applyThemeFromAccount` = loaded value, not saved back). **Theme is account-level (F006)**: `light` / `dark` / `system`. `localStorage["milos.theme"]` is only the device cache for the boot script and signed-out screens (`light`/`dark`, absent = system; encoding unchanged, so `index.html` needs no change). `localStorage["milos.theme.migrated"]` marks that this device already did its one-time copy of a pre-F006 theme to the first account that signed in (`shouldMigrateDeviceTheme`). `components/ThemeControl.tsx` (Light / Dark / System radiogroup; variants `sidebar`, `compact`, `full`) sits in the sidebar footer, the auth header, the onboarding top bar and Profile. **Task colors** come from the backend palette (`features/palette/`: `usePalette()` fetches `GET /api/v1/task-palette` once per session; `resolveTaskColor()` turns a task's `color` into `--task-accent-light/-dark` and `--task-bg-light/-dark` inline variables, and `.ob-board-task` / `.ob-swatch` pick the pair for the current theme). There are no `--color-task-N-*` tokens any more; an unresolved color falls back to the neutral card style. Page CSS: `src/App.css` (`.ob-*` onboarding/board/buddy, `.drt-*` default routine, `.dr-*` daily, `.wt-*` walkthrough) and `src/components/layout/AppShell.css` (shell, sidebar, page header). Font: Poppins.

Test files are type-checked by `tsconfig.test.json` (adds Node + jest-dom types; includes `*.test.tsx`, `src/test/`, `e2e/`); `tsconfig.app.json` excludes them.

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

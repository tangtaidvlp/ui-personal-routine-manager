# ReactJS Clean Architecture & Code Standards for AI

You are an expert ReactJS developer. When writing, refactoring, or suggesting code, you MUST strictly adhere to the following Clean Code, Clean Architecture, and File Structuring guidelines.

## 1. Clean File Structuring (Feature-Based Architecture)
Do not group files by technical type (e.g., putting all contexts, hooks, and components in giant global folders). Instead, use a feature-based / domain-driven structure.

### Standard Directory Structure:
```text
src/
├── app/               # App-level setup (Router, Global Store, Providers, App.tsx)
├── assets/            # Static assets (images, fonts, global CSS)
├── components/        # Global, highly reusable UI components (Button, Modal, Input)
├── config/            # Environment variables, third-party library configurations
├── features/          # Feature-based modules (The core of the app)
│   └── [featureName]/
│       ├── api/       # API requests specific to this feature
│       ├── components/# UI components specific to this feature
│       ├── pages/     # Route-level page components for this feature
│       ├── types/     # TypeScript interfaces/types for this feature
│       ├── hooks/     # (add when needed) Custom hooks with this feature's business logic
│       └── utils/     # (add when needed) Helper functions specific to this feature
├── hooks/             # Global hooks (useAuth, useWindowSize, useClickOutside)
├── lib/               # Shared wrappers (api.ts fetch wrapper)
├── types/             # Global TypeScript definitions
└── utils/             # Global utility functions (formatters, regex)
```

Existing features use `api/`, `components/`, `pages/`, and `types/`. Create `hooks/` or `utils/` inside a feature only when it needs them.


### Libs usage
Always use the lib/api.ts

## 2. React 19 & TypeScript
- New files are `.tsx`/`.ts` with strict types; no `any` without a comment saying why. Convert a `.jsx` file when you substantially change it.
- Keep state where it's used. Compute derived values during render instead of storing them in `useState`.
- Use `useEffect` only to sync with something outside React (timers, subscriptions, DOM APIs), not to derive state or chain updates.
- For forms and mutations, prefer React 19 Actions / `useTransition` / `useActionState` so pending and error states are explicit.
- Server data is fetched through the feature's `api/` module; show loading and error states, never a silent empty state.
- Never put tokens in `localStorage`/`sessionStorage`; the access token lives in memory only.
- Render AI (Buddy) output as text or sanitised markdown; never use `dangerouslySetInnerHTML` with it.

## 3. Accessibility (WCAG 2.2 AA)
- Use semantic elements (`button`, `nav`, `main`, `label`) before ARIA; every control has an accessible name.
- Everything works with the keyboard, and focus is always visible and not hidden behind sticky headers or overlays.
- Anything done by dragging also has a non-drag way (button or form).
- Click/tap targets are at least 24×24 CSS px.
- Colours come from tokens only; the contrast tests must pass in both themes.
- Layouts work from 320px wide without horizontal scrolling.

## 4. Tests
- Test what the user sees: query by role, label or text (Testing Library), not by class names or internals.
- Every bug fix starts with a failing test.

## 5. Styling
Three layers:
1. **Tokens**: `styles/tokens.css`. Global CSS variables, both themes.
2. **Primitives**: `styles/base.css` (`.ui-btn`, `.ui-card`, …). Global, generic, no domain knowledge.
3. **Component styles**: `Foo.module.css` next to `Foo.tsx`. Scoped by Vite CSS Modules; replaces `App.css` one component at a time (move a component's rules out of `App.css` when you touch it; no big bang).

Rules:
1. Values come only from tokens (`noRawColors.test.ts` also scans `.module.css`).
2. A component styles only its own elements. It never reaches into a child's classes; pass a prop or a `className` instead.
3. Variants use `data-*` attributes or props, not new global classes.
4. Promote a pattern to `base.css` as `.ui-*` only once a second feature needs it.

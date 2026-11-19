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
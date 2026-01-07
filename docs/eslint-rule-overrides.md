# ESLint Rule Overrides

This codebase currently disables several ESLint rules in `eslint.config.mjs` to keep `npm run lint` green while we stabilize the React Compiler warnings and existing patterns. The overrides are not a long-term solution; they are a stopgap to prevent CI failures.

## Disabled rules

- `@next/next/no-html-link-for-pages` (migrating to `<Link />`)
- `@typescript-eslint/no-explicit-any` (typed refactors needed in habit hooks)
- `react/no-unescaped-entities` (text escaping cleanups)
- `react-hooks/incompatible-library` (React Hook Form `watch()` warnings)
- `react-hooks/preserve-manual-memoization` (React Compiler memoization warnings)
- `react-hooks/purity` (impure render warnings like `Date.now()`)
- `react-hooks/refs` (ref access during render)
- `react-hooks/set-state-in-effect` (effects calling `setState`)
- `react-hooks/static-components` (component creation during render)

## Codex prompt to plan fixes

```
ROLE
You are an implementation agent. Make a detailed plan to remove the ESLint rule overrides in eslint.config.mjs by fixing the underlying issues. Use the repo’s existing patterns and do not add new frameworks.

REQUIREMENTS
- Identify each disabled rule and where it is currently violated.
- Propose concrete code-level changes per rule.
- Break the work into small, safe chunks (1–4 files each).
- Include verification steps after each chunk (build + lint).
- Call out any risky refactors separately.
```

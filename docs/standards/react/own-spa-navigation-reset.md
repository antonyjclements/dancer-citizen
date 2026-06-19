# Own SPA Navigation Reset in the React Shell

The AWS React app must explicitly reset scroll position on every client-side route change except hash-only anchor navigation. Do this once in the shell with `useLocation()` so individual pages and links do not have to manage scroll behavior.

## Use This When

- Adding or changing routes in `apps/react-site`.
- Adding shell-level navigation behavior.
- Fixing mobile or SPA navigation issues.

## Do

- Keep scroll restoration in a shell-level helper such as `ScrollToTop`.
- Reset on `pathname` or `search` changes.
- Leave hash-only changes alone so footnotes, references, and anchor links keep normal browser behavior.
- Use immediate scroll reset, matching normal document navigation.

## Avoid

- Adding `window.scrollTo()` to individual page components or link handlers.
- Resetting on every hash change and breaking in-page reference links.
- Assuming React Router will mimic full-page browser navigation automatically.

## Evidence

- `apps/react-site/src/App.tsx`
- `docs/features/site-shell-and-navigation/spec.md`

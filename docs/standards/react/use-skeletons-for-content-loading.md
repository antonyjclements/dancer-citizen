# Use Skeletons for Content Loading

All React data and content loading states must use the shared skeleton loading experience. Do not show plain loading text for route-level CMS content, article content, issue content, page content, or other reader-facing data fetches.

## Use This When

- Adding or changing async data loading in `apps/react-site`.
- Adding a new CMS-backed React page or component.
- Replacing temporary loading text or spinners.

## Do

- Render the shared `Loading` component for route-level CMS loading states.
- Keep skeleton markup accessible with `aria-busy` and an appropriate label.
- Keep decorative skeleton shapes hidden from assistive technology.
- Respect reduced-motion preferences for shimmer or animation.
- Extend the shared skeleton component when a new content shape needs a better loading state.

## Avoid

- Rendering visible text such as `Loading...` for reader-facing content loading.
- Creating one-off loading indicators inside individual route pages.
- Using unsupported-slice diagnostics as a loading state.
- Adding animated loaders that ignore reduced-motion preferences.

## Evidence

- `apps/react-site/src/components/Loading.tsx`
- `apps/react-site/src/hooks.ts`
- `apps/react-site/src/pages/HomePage.tsx`
- `apps/react-site/src/pages/ArticlePage.tsx`
- `apps/react-site/src/pages/IssuePage.tsx`
- `apps/react-site/src/pages/ContentPage.tsx`
- `apps/react-site/src/styles.css`

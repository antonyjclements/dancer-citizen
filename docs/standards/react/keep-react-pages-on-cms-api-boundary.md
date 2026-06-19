# Keep React Pages on the CMS API Boundary

AWS React pages must fetch normalized `/cms/*` API responses and must not read Prismic directly. During parity work, React components may render the body slice payload returned by the CMS API, but Prismic fetching, ordering, fallback, preview, and metadata decisions belong in `apps/cms-api`.

## Use This When

- Adding or changing routes in `apps/react-site/src/pages`.
- Adding React rendering for article, issue, home, or content page data.
- Adding new CMS-backed behavior to the AWS delivery path.

## Do

- Fetch page data through `getJson()` from `apps/react-site/src/api.ts`.
- Use `useAsyncData()` or a shared route-loading helper for loading, success, and error states.
- Keep API paths stable and route-shaped, such as `/home`, `/issues/:uid`, `/articles/:uid`, and `/pages/:uid`.
- Let `apps/cms-api` own Prismic reads, preview cookies, content ordering, fallback text, media data, references, works cited, and metadata lookup.
- Render body slice payloads in React only after they have crossed the CMS API boundary.

## Avoid

- Importing `@prismicio/client` into React route pages.
- Re-implementing issue ordering, article navigation, thumbnail fallback, references, works cited, or metadata extraction in the React app.
- Hardcoding deployed API origins in route components; use `VITE_CMS_API_BASE` or the default `/cms` base.
- Treating React route pages as the canonical content normalization layer.

## Evidence

- `apps/react-site/src/api.ts`
- `apps/react-site/src/hooks.ts`
- `apps/react-site/src/pages/HomePage.tsx`
- `apps/react-site/src/pages/ArticlePage.tsx`
- `apps/react-site/src/pages/IssuePage.tsx`
- `apps/react-site/src/pages/ContentPage.tsx`
- `apps/cms-api/src/content.ts`

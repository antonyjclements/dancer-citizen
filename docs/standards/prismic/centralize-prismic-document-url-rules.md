# Centralize Prismic Document URL Rules

Prismic document URL generation must stay centralized so routing, previews, summaries, and UI links agree on the same paths. Use `getHref()`/`getSummary()` in the CMS API or normalized `href` fields instead of rebuilding document paths inside React components.

## Use This When

- Adding a new Prismic document type with a public URL.
- Linking to issue, article, content, or future journal documents.
- Creating view models, summaries, navigation props, cards, or related-content lists.

## Do

- Update `apps/cms-api/src/content.ts` when adding or changing a Prismic document route or href rule.
- Update `infra/lib/dancer-citizen-web-stack.ts` when a public route must be served by the HTML-shell Lambda.
- Prefer passing normalized `href` values from data loaders into UI components.
- Keep document type unions exhaustive so new types force URL-rule updates.

## Avoid

- Hardcoding `/issues/${uid}`, `/articles/${uid}`, or similar document paths inside components.
- Letting Prismic route definitions and UI href generation drift.
- Adding a new document type without deciding its public URL rule.

## Evidence

- `apps/cms-api/src/content.ts`
- `apps/react-site/src/api.ts`
- `infra/lib/dancer-citizen-web-stack.ts`

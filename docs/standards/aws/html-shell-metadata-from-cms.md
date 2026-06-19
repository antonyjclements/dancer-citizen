# Render HTML Shell Metadata from the CMS API

AWS React document routes must get route-specific metadata from the CMS API/shared metadata normalization, not from hardcoded React `index.html` tags or duplicated frontend logic. The HTML-shell Lambda owns injecting canonical, description, Open Graph, Twitter, and image metadata before the React app hydrates.

## Use This When

- Changing `apps/cms-api/src/html-shell.ts`.
- Changing metadata normalization in `apps/cms-api/src/content.ts`.
- Changing CloudFront/API Gateway document-route behavior in `infra`.
- Adding or changing article, issue, or content-page metadata fields.

## Do

- Resolve route metadata through `getMetadataForPath()`.
- Keep canonical path, title, description, type, social image, and image alt in the shared metadata view.
- Escape metadata values before injecting them into the HTML shell.
- Replace generic Vite/React shell metadata for document responses.
- Return `Cache-Control: no-store` for preview and 404 HTML-shell responses.
- Keep React `index.html` metadata generic; document routes should be enriched by the HTML-shell Lambda.

## Avoid

- Hardcoding article, issue, or content-page metadata in `apps/react-site/index.html`.
- Duplicating metadata extraction in React components.
- Returning generic SPA metadata for `/articles/:uid`, `/issues/:uid`, or content page document requests.
- Adding Open Graph image tags without non-empty alt text.

## Evidence

- `apps/cms-api/src/html-shell.ts`
- `apps/cms-api/src/content.ts`
- `apps/cms-api/src/handler.ts`
- `apps/react-site/index.html`
- `infra/lib/dancer-citizen-web-stack.ts`
- `docs/features/aws-react-lambda-delivery/spec.md`
- `docs/features/public-journal-experience/spec.md`

# Keep Preview and Cache Rules Explicit

Preview and cache behavior must stay explicit for the React/Lambda delivery path. The `dc_prismic_ref` preview cookie must force `Cache-Control: no-store` for `/cms/*` JSON responses and HTML-shell document responses.

## Use This When

- Changing `/cms/preview/start` or `/cms/preview/exit`.
- Changing CMS API JSON response headers.
- Changing HTML-shell Lambda response headers.
- Changing CloudFront cache policies for CMS or document routes.

## Do

- Set the preview cookie as HTTP-only, Secure, SameSite=Lax, path-wide, and time-limited.
- Clear the preview cookie through the exit endpoint.
- Send `Cache-Control: no-store` for preview start, preview exit, preview JSON responses, preview HTML-shell responses, 404s, and server errors.
- Allow CloudFront document-route caching to vary by the preview cookie.

## Avoid

- Serving preview content with public cache headers.
- Reading preview refs without also disabling response caching.
- Adding framework-specific draft/preview helpers to the Lambda preview flow.
- Changing CloudFront cache policy without checking preview-cookie behavior.
- Treating framework tag revalidation as part of delivery; content is fetched through Lambda APIs at request time.

## Evidence

- `apps/cms-api/src/preview.ts`
- `apps/cms-api/src/handler.ts`
- `apps/cms-api/src/html-shell.ts`
- `apps/cms-api/src/http.ts`
- `infra/lib/dancer-citizen-web-stack.ts`
- `docs/features/prismic-preview-and-cache-revalidation/spec.md`

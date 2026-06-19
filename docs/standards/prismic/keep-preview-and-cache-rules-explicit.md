# Keep Preview and Cache Rules Explicit

Preview and cache behavior must stay explicit for both the current Next app and the AWS React/Lambda delivery path. In AWS delivery, the `dc_prismic_ref` preview cookie must force `Cache-Control: no-store` for `/cms/*` JSON responses and HTML-shell document responses.

## Use This When

- Changing Next preview, exit-preview, or revalidation routes.
- Changing AWS `/cms/preview/start` or `/cms/preview/exit`.
- Changing CMS API JSON response headers.
- Changing HTML-shell Lambda response headers.
- Changing CloudFront cache policies for CMS or document routes.

## Do

- Keep Next preview behavior delegated to Prismic's Next integration helpers.
- Keep production Next Prismic fetches aligned with the shared `prismic` cache tag.
- Set the AWS preview cookie as HTTP-only, Secure, SameSite=Lax, path-wide, and time-limited.
- Clear the AWS preview cookie through the exit endpoint.
- Send `Cache-Control: no-store` for AWS preview start, preview exit, preview JSON responses, preview HTML-shell responses, 404s, and server errors.
- Allow CloudFront document-route caching to vary by the preview cookie.

## Avoid

- Serving preview content with public cache headers.
- Reading preview refs without also disabling response caching.
- Mixing Next draft/preview helpers into the AWS Lambda preview flow.
- Changing CloudFront cache policy without checking preview-cookie behavior.
- Treating revalidation as part of AWS delivery; AWS content is fetched through Lambda APIs at request time.

## Evidence

- `src/app/api/preview/route.ts`
- `src/app/api/exit-preview/route.ts`
- `src/app/api/revalidate/route.ts`
- `src/foundation/prismic/prismicClient.ts`
- `apps/cms-api/src/preview.ts`
- `apps/cms-api/src/handler.ts`
- `apps/cms-api/src/html-shell.ts`
- `apps/cms-api/src/http.ts`
- `infra/lib/dancer-citizen-web-stack.ts`
- `docs/features/prismic-preview-and-cache-revalidation/spec.md`

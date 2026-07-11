# Use the Shared Prismic Client

All CMS API Prismic access must go through `createPrismicClient()` from `apps/cms-api/src/prismic.ts`. This keeps repository configuration and preview refs centralized.

## Use This When

- Reading Prismic content in CMS API route handlers, content loaders, or utilities.
- Adding new document types or page data helpers.

## Do

- Import `createPrismicClient` from `./prismic` inside the CMS API package.
- Keep repository name and preview ref wiring inside the shared client.
- Pass preview context into `createPrismicClient()` when handling preview requests.

## Avoid

- Calling `@prismicio/client`'s base `createClient` outside the shared client module.
- Re-declaring Prismic repository names or preview ref setup in content-loading code.

## Evidence

- `apps/cms-api/src/prismic.ts`
- `apps/cms-api/src/content.ts`
- `apps/cms-api/src/handler.ts`

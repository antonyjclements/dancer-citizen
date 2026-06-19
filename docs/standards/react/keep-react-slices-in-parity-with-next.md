# Keep React Slices in Parity with Next

Until production cutover, the Next Slice Machine components remain the source of truth for slice behavior. React slice rendering in `apps/react-site` should match those behaviors first, and any intentional deviations or incomplete parity must be documented in the Prismic content/slices spec.

## Use This When

- Adding or changing slice rendering in `apps/react-site/src/components/Slices.tsx`.
- Adding new Slice Machine slices or changing `slices/*/index.tsx`.
- Fixing article, issue, content page, media, reference, or contributor rendering in the AWS React path.

## Do

- Compare React slice behavior against the matching `slices/*/index.tsx` component before changing React rendering.
- Preserve important behaviors from the Next source of truth: rich text rendering, reference markers, image alt fallbacks, video handling, file links, contributor legacy cleanup, and pending-import fallbacks.
- Keep unsupported React slices explicit while parity work continues.
- Update `docs/features/prismic-content-model-and-slices/spec.md` when React intentionally differs from Next or when a parity gap is closed.
- Keep generated Slice Machine registries generated; do not hand-edit `slices/index.ts`.

## Avoid

- Treating the React slice renderer as canonical before cutover.
- Adding React-only behavior without checking the corresponding Next slice.
- Silently dropping slice fields, media fallbacks, reference behavior, or legacy cleanup that the Next site supports.
- Letting `Pending slice import` placeholders remain for slices that are expected to be production-visible.

## Evidence

- `apps/react-site/src/components/Slices.tsx`
- `slices/index.ts`
- `src/slices/index.ts`
- `slices/*/index.tsx`
- `docs/features/prismic-content-model-and-slices/spec.md`

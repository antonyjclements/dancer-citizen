# Normalize Legacy Content Early

Legacy migrated Prismic content should be cleaned as early as practical at the data/API boundary. Slice-specific legacy formats may stay in React slice renderers temporarily when moving them earlier would risk changing behavior, but those cases should remain explicit migration targets.

## Use This When

- Handling migrated HTML strings, encoded entities, legacy JSON fields, or old inline link text.
- Building CMS API summaries, metadata, image alt text, page bodies, or normalized view models.
- Rendering contributor lists or other slices with known legacy field formats.
- Fixing bugs where raw HTML, encoded text, or legacy URLs render visibly.

## Do

- Strip legacy HTML and decode common entities before returning summary, metadata, fallback alt, or navigation text.
- Normalize page-specific legacy content in the CMS API when the React app consumes it as a view model.
- Keep legacy cleanup helpers small, named, and covered by focused tests when feasible.
- Keep slice-specific cleanup near the matching slice renderer only when moving it to the API boundary would risk changing rendering behavior.
- Document known legacy cleanup behavior in the Prismic content/slices spec when it affects durable rendering.

## Avoid

- Patching raw legacy strings ad hoc in multiple page components.
- Letting raw `<strong>`, `<em>`, `&amp;`, or legacy JSON strings reach visible UI.
- Moving slice-specific cleanup out of a renderer before confirming React behavior is preserved.
- Treating CMS migration artifacts as normal presentation data.

## Evidence

- `apps/cms-api/src/content.ts`
- `apps/cms-api/src/content.test.ts`
- `apps/react-site/src/text.ts`
- `apps/react-site/src/components/Slices.tsx`
- `docs/features/prismic-content-model-and-slices/spec.md`

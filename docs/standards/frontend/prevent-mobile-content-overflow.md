# Prevent Mobile Content Overflow

CMS-rendered content must not make the page wider than the device viewport. Apply explicit wrapping and shrink constraints to rich text, references, works cited, long URLs, and grid/flex children in the React app.

## Use This When

- Rendering Prismic rich text, references, works cited, or footnotes.
- Adding responsive grids or flex layouts with CMS content.
- Styling article bodies, issue bodies, content pages, or slice output.
- Fixing mobile layout bugs where text or links push the viewport sideways.

## Do

- Use `overflow-wrap: anywhere` for CMS text that can contain long URLs, encoded strings, citations, or unbroken words.
- Use `break-words` / `word-break: break-word` where Tailwind or plain CSS needs a companion fallback.
- Use `minmax(0, 1fr)` for grid columns that contain text.
- Add `min-w-0` to grid or flex children that must shrink on mobile.
- Check references and works cited specifically; they often contain the longest unbroken strings.

## Avoid

- Using `1fr` text columns without `minmax(0, 1fr)` when adjacent columns are fixed width.
- Putting rich text inside grid or flex children that lack `min-w-0`.
- Assuming links will wrap naturally on mobile.
- Fixing a single URL instance instead of making the CMS rendering surface overflow-safe.

## Evidence

- `apps/react-site/src/components/Slices.tsx`
- `apps/react-site/src/pages/ArticlePage.tsx`
- `apps/react-site/src/pages/ContentPage.tsx`
- `apps/react-site/src/styles.css`

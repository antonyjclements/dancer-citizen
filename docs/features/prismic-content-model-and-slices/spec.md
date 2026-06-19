---
title: Prismic Content Model and Slices
status: active
created: 2026-05-25
updated: 2026-06-19
tags:
  - prismic
  - slices
  - content-model
related_decisions: []
related_standards:
  - docs/standards/prismic/centralize-prismic-document-url-rules.md
  - docs/standards/prismic/normalize-prismic-documents-at-data-boundary.md
  - docs/standards/prismic/use-shared-prismic-client.md
---

# Prismic Content Model and Slices

## Intent

The Prismic content model gives editors repeatable issue, article, and content page documents, with shared slices for long-form editorial content, media, links, downloads, contributor lists, and placeholders for future embeds.

## Users

- Editors creating and maintaining Prismic documents.
- Readers consuming rendered issue, article, and content pages.
- Developers extending document types or shared slices.

## Current Behavior

- The Prismic repository is `dancercitizen`, configured through Slice Machine.
- Repeatable custom types exist for `issue_page`, `article_page`, and `content_page`.
- All three document types include UID, title, hero fields, tile fields, and a body made from shared slices.
- Issue pages include `issue_number`, `publication_date`, hero image/credit, tile metadata, and a body that can use rich text, linked tiles, quotes, images, galleries, videos, file links, and form embeds.
- Article pages include SEO fields, hero fields, body slices, references, works cited, relationship links, and tile metadata.
- Content pages include SEO fields, hero fields, body slices, relationship links, navigation/sitemap settings, and tile metadata.
- Shared slices are registered through generated Slice Machine component maps and rendered through `SliceZone`.
- The AWS React migration includes a separate client-side slice renderer that consumes the same Prismic body payloads from the CMS API while parity work continues.
- Rich text rendering is centralized through `RichText` and `articleRichTextComponents`, including paragraph, heading, list, hyperlink, article-reference, and donation-link rendering rules.
- Article rich text and quotes can receive article reference context; when a reference location matches body text, the renderer injects linked superscript markers that point to the article references section.
- Images and galleries render Prismic images when present, fill missing alt text from nearby caption/credit/title context, and show pending-import placeholders when missing.
- Video embeds detect YouTube URLs, render a thumbnail with a play button, and swap to an inline `youtube-nocookie.com` iframe when played.
- Video embeds fall back to a "Watch video" outbound link when a non-YouTube embed URL exists and a pending-import placeholder when absent.
- Form embeds currently render a placeholder message until providers are confirmed.
- File links render an "Open file" link when a media link is present and a pending-import message when absent.
- Linked tiles and biography/contributor lists render structured lists from slice items.
- Contributor lists normalize imported legacy title-link JSON into readable names, same-page anchors, issue labels, and inline `read more` links.
- Rich text PayPal donation links render as outlined button-style external links that open in a new tab.

## Key Flows

### Render Body Slices

1. A Prismic page document includes a `body` slice zone.
2. The Next route renders `SliceZone` with the generated `components` map.
3. Each shared slice renders its own fields and uses Prismic helpers for images and links.
4. Rich text fields delegate to the shared rich-text renderer.

### Maintain Slice Models

1. Slice models live under `slices/*/model.json`.
2. Slice components live beside their models at `slices/*/index.tsx`.
3. `scripts/scaffold-slices.cjs` can upsert and push the current slice model set through Slice Machine.

## Acceptance Criteria

- `issue_page`, `article_page`, and `content_page` custom types remain repeatable Prismic documents.
- Body slices render through the generated `slices/index.ts` component registry.
- The AWS React migration can render the same Prismic body payloads from `/cms/*` responses without requiring a site rebuild after CMS changes.
- Shared rich text uses the centralized rich-text serializer for paragraphs, headings, lists, and links.
- External rich-text links opening in a new tab include `rel="noreferrer"`.
- Article reference markers render as linked superscripts when matching reference locations are provided.
- PayPal donation links render as readable button-style links with `target="_blank"`.
- YouTube video slices render inline playable media with thumbnail alt text.
- Missing optional media renders a clear pending-import fallback rather than crashing.
- Slice components preserve `data-slice-type` and `data-slice-variation` attributes.
- New public Prismic document types update both Prismic routes and journal href rules.

## Boundaries and Non-Goals

- Slice models define several fields that are not fully rendered yet, including gallery/image anchors and video `use_in_hero`.
- The `FormEmbed` slice does not render provider embed HTML yet.
- Non-YouTube `VideoEmbed` URLs render as outbound links rather than inline embeds.
- Content relationship fields exist in custom types, but most relationship-driven navigation is not implemented.
- Generated `slices/index.ts` is not hand-edited.
- The AWS React slice renderer is not yet the canonical slice implementation; the Next slice components remain the source of truth until parity is complete.

## Open Questions / TODOs

- Which form provider should power `FormEmbed`?
- Should non-YouTube video providers render inline or remain outbound links?
- Should image/gallery anchors produce DOM IDs for deep linking?
- Should relationship fields replace tag-based issue membership?

## Decision Links

- None yet.

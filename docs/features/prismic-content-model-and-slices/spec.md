---
title: Prismic Content Model and Slices
status: active
created: 2026-05-25
updated: 2026-07-11
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

- The Prismic repository is `dancercitizen`; custom type and slice models are kept in versioned JSON under `customtypes/` and `slices/*/model.json`.
- Repeatable custom types exist for `issue_page`, `article_page`, and `content_page`.
- All three document types include UID, title, hero fields, tile fields, and a body made from shared slices.
- Issue pages include `issue_number`, `publication_date`, hero image/credit, tile metadata, and a body that can use rich text, linked tiles, quotes, images, galleries, videos, file links, and form embeds.
- Article pages include SEO fields, hero fields, body slices, references, works cited, relationship links, and tile metadata.
- Content pages include SEO fields, hero fields, body slices, relationship links, navigation/sitemap settings, and tile metadata.
- Shared slices are rendered by the React slice renderer in `apps/react-site/src/components/Slices.tsx`.
- The CMS API returns Prismic body payloads to the React app without requiring a site rebuild after CMS changes.
- Rich text rendering is centralized in the React rich-text component, including paragraph, heading, list, hyperlink, article-reference, and donation-link rendering rules.
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
2. The CMS API normalizes document-level data and returns the body payload.
3. The React slice renderer renders each shared slice and applies media/link fallbacks.
4. Rich text fields delegate to the shared rich-text renderer.

### Maintain Slice Models

1. Slice models live under `slices/*/model.json`.
2. React rendering behavior lives in `apps/react-site/src/components/Slices.tsx`.
3. CMS/API normalization behavior lives in `apps/cms-api/src/content.ts`.

## Acceptance Criteria

- `issue_page`, `article_page`, and `content_page` custom types remain repeatable Prismic documents.
- Body slices render through the React slice renderer.
- The React app can render Prismic body payloads from `/cms/*` responses without requiring a site rebuild after CMS changes.
- Shared rich text uses the centralized rich-text serializer for paragraphs, headings, lists, and links.
- External rich-text links opening in a new tab include `rel="noreferrer"`.
- Article reference markers render as linked superscripts when matching reference locations are provided.
- PayPal donation links render as readable button-style links with `target="_blank"`.
- YouTube video slices render inline playable media with thumbnail alt text.
- Missing optional media renders a clear pending-import fallback rather than crashing.
- New public Prismic document types update both Prismic routes and journal href rules.

## Boundaries and Non-Goals

- Slice models define several fields that are not fully rendered yet, including gallery/image anchors and video `use_in_hero`.
- The `FormEmbed` slice does not render provider embed HTML yet.
- Non-YouTube `VideoEmbed` URLs render as outbound links rather than inline embeds.
- Content relationship fields exist in custom types, but most relationship-driven navigation is not implemented.
- Slice model JSON is preserved even though the legacy Slice Machine component runtime has been removed.
- The React slice renderer is the canonical public slice implementation.

## Open Questions / TODOs

- Which form provider should power `FormEmbed`?
- Should non-YouTube video providers render inline or remain outbound links?
- Should image/gallery anchors produce DOM IDs for deep linking?
- Should relationship fields replace tag-based issue membership?

## Decision Links

- None yet.

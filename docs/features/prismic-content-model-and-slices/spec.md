---
title: Prismic Content Model and Slices
status: active
created: 2026-05-25
updated: 2026-11-05
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
- Each shared slice exposes a `Hide` toggle. The renderer omits slices whose `primary.hide` is `true`, including on `/submissions`.
- The CMS API returns Prismic body payloads to the React app without requiring a site rebuild after CMS changes.
- Rich text rendering is centralized in the React rich-text component, including paragraph, heading, list, hyperlink, article-reference, and donation-link rendering rules.
- Article rich text and quotes can receive article reference context; when a reference location matches body text, the renderer injects linked superscript markers that point to the article references section.
- Images and galleries render Prismic images when present, fill missing alt text from nearby caption/credit/title context, and show pending-import placeholders when missing.
- Video embeds detect YouTube URLs, render a thumbnail with a play button, and swap to an inline `youtube-nocookie.com` iframe when played.
- Video embeds fall back to a "Watch video" outbound link when a non-YouTube embed URL exists and a pending-import placeholder when absent.
- Form embeds currently render a placeholder message until providers are confirmed.
- File links render an "Open file" link when a media link is present and a pending-import message when absent.
- Linked tiles and biography/contributor lists render structured lists from slice items.
- Biography Lists give CMS editors control over each list's heading, membership, and ordering, including on Editors / Staff.
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

### SLICE-001 — Editor-controlled component visibility

- Every shared slice available in the submissions page's body exposes a non-repeating Boolean `hide` field labeled `Hide`, defaulting to `false`.
- When `primary.hide` is exactly `true`, the frontend renders none of that slice's content, media, links, or fallback placeholders.
- False, missing, and null values preserve existing rendering. Visible siblings retain their CMS order, and switching the toggle off restores the component.
- The toggle applies wherever these shared slices are rendered. It does not control the page heading or the direct submission form appended outside the slice zone.
- Model definitions must be synced to Prismic before editors can use the new field; publishing follows the existing CMS cache/preview behavior.

### BIO-001 — CMS-authored biography lists

- Each `BiographyList` slice exposes the existing plain-text `heading` field and repeatable biography items retaining the existing name, summary, image, and optional linked article fields.
- An editor can add multiple independently headed lists to a content page, including “Editors”, “Past Editors”, or any other title, without a code change.
- Each list renders its authored `heading` as its section heading. A list without a heading renders its biographies without an invented heading. No new `title` field is needed.
- Headings do not determine membership, sorting, or special rendering rules.

### BIO-002 — CMS ordering is authoritative

- Biography Lists render at their positions in the page's body slice zone, including relative to non-biography slices.
- Biography items render in their stored order within their own list. No name-based sorting, cross-list regrouping, deduplication, or promotion overrides that order.
- Given “Past Editors”, a rich-text slice, and “Editors” in that order, the public page renders that same sequence. Reversing either list's biography items reverses their display order without affecting the other list.
- Adding, removing, renaming, or moving a list or biography is reflected through the normal CMS publishing and cache behavior without a site rebuild.

### BIO-003 — Existing biography content remains usable

- Existing biography items retain their content and linked articles. A legacy single-list document renders as that one list in its stored item order until an editor reorganizes it in Prismic.
- Missing or empty item arrays render safely without placeholder people or generated groups.
- This contract does not require destructive field removal or an automatic rewrite of published documents. The existing `heading` and repeatable item fields remain unchanged.
- Existing Editors / Staff “In Memoriam” behavior for Jane Alexandre is preserved independently of her list or position. Role labels are not synthesized.

## Boundaries and Non-Goals

- Slice models define several fields that are not fully rendered yet, including gallery/image anchors and video `use_in_hero`.
- The `FormEmbed` slice does not render provider embed HTML yet.
- Non-YouTube `VideoEmbed` URLs render as outbound links rather than inline embeds.
- Content relationship fields exist in custom types, but most relationship-driven navigation is not implemented.
- Slice model JSON is preserved even though the legacy Slice Machine component runtime has been removed.
- The React slice renderer is the canonical public slice implementation.
- Biography-list changes do not redesign biography cards or change the separate contributor-list slice.
- Editors choose list names and membership in Prismic; the application does not prescribe “Editors”, “Past Editors”, or “Moving the Map” sections.

## Open Questions / TODOs

- Which form provider should power `FormEmbed`?
- Should non-YouTube video providers render inline or remain outbound links?
- Should image/gallery anchors produce DOM IDs for deep linking?
- Should relationship fields replace tag-based issue membership?

## Decision Links

- `docs/decisions/2026-07-10-do-not-inject-editor-role-labels.md`: the prohibition on synthesized roles remains applicable. This spec replaces its historical rationale for name-based grouping with explicit CMS control.
- `docs/features/public-journal-experience/spec.md`: Editors / Staff page behavior follows this biography-list contract.

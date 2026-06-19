import type { Content } from "@prismicio/client";
import { isFilled } from "@prismicio/client";
import { PrismicNextImage, PrismicNextLink } from "@prismicio/next";
import type { SliceComponentProps } from "@prismicio/react";
import type { RichTextField, RTInlineNode } from "@prismicio/client";
import { getImageFieldWithAlt } from "@/foundation/prismic/getImageFieldWithAlt";
import { RichText } from "@/foundation/rich-text/RichText";

export type ContributorListProps = SliceComponentProps<Content.ContributorListSlice>;

type LegacyLinkValue = {
  fieldsets?: Array<{
    properties?: Array<{
      alias?: string;
      value?: string;
    }>;
  }>;
};

type ContributorTitleLink = {
  label: string;
  href?: string;
};

function getLegacyLinkProperty(value: LegacyLinkValue, alias: string) {
  const properties = value.fieldsets?.flatMap((fieldset) => fieldset.properties ?? []) ?? [];

  return properties.find((property) => property.alias === alias)?.value?.trim();
}

function parseContributorTitleLink(value: unknown): ContributorTitleLink {
  if (typeof value !== "string") {
    return { label: "" };
  }

  try {
    const legacyLink = JSON.parse(value) as LegacyLinkValue;
    const label = getLegacyLinkProperty(legacyLink, "cta") || value;
    const href = getLegacyLinkProperty(legacyLink, "url");

    return href ? { label, href } : { label };
  } catch {
    return { label: value };
  }
}

function getIssueLabel(issue: string | null | undefined) {
  const value = issue?.trim();

  return value ? `(Issue ${value})` : null;
}

function offsetSpanForRemovedRange(span: RTInlineNode, start: number, end: number): RTInlineNode | null {
  const removedLength = end - start;

  if (span.end <= start) {
    return span;
  }

  if (span.start >= end) {
    return { ...span, start: span.start - removedLength, end: span.end - removedLength };
  }

  return null;
}

function linkLegacyReadMoreText(field: RichTextField | null | undefined): RichTextField | null | undefined {
  if (!field) {
    return field;
  }

  return field.map((node) => {
    if (!("text" in node) || !Array.isArray(node.spans)) {
      return node;
    }

    const marker = "read more (";
    const markerStart = node.text.toLowerCase().indexOf(marker);

    if (markerStart === -1) {
      return node;
    }

    const urlStart = markerStart + marker.length;
    const urlEnd = node.text.lastIndexOf(")");

    if (urlEnd <= urlStart) {
      return node;
    }

    const url = node.text.slice(urlStart, urlEnd).trim();
    const linkText = "read more";
    const text = `${node.text.slice(0, markerStart)}${linkText}${node.text.slice(urlEnd + 1)}`;
    const spans = node.spans
      .map((span) => offsetSpanForRemovedRange(span, markerStart + linkText.length, urlEnd + 1))
      .filter((span): span is RTInlineNode => Boolean(span));

    spans.push({
      type: "hyperlink",
      start: markerStart,
      end: markerStart + linkText.length,
      data: {
        link_type: "Web",
        url,
      },
    });

    return { ...node, text, spans };
  }) as RichTextField;
}

export default function ContributorList({ slice }: ContributorListProps) {
  return (
    <section className="mb-9" data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
      {slice.primary.heading ? (
        <h2 className="font-display text-[28px] font-medium leading-[1.25] text-ink mt-12 mb-5">
          {slice.primary.heading}
        </h2>
      ) : null}
      <div className="flex flex-col gap-6">
        {slice.items.map((item, index) => {
          const titleLink = parseContributorTitleLink(item.title_link);
          const issueLabel = getIssueLabel(item.issue);
          const articleId = titleLink.href?.startsWith("#") ? titleLink.href.slice(1) : undefined;

          return (
            <article className="border-t border-rule pt-6" id={articleId} key={`${slice.id}-${index}`}>
              {isFilled.image(item.thumbnail) ? (
                <PrismicNextImage
                  field={getImageFieldWithAlt(item.thumbnail, titleLink.label || "Contributor thumbnail")}
                  className="w-full h-auto mb-4"
                />
              ) : null}
              <div>
                <h3 className="font-display text-[24px] font-medium leading-[1.3] mb-4">
                  {titleLink.href ? (
                    <a href={titleLink.href} className="border-b border-current pb-0.5">
                      {titleLink.label}
                    </a>
                  ) : (
                    titleLink.label
                  )}
                  {issueLabel ? (
                    <span className="ml-2 align-baseline font-sans text-[13px] font-semibold tracking-[0.08em] uppercase text-faint">
                      {issueLabel}
                    </span>
                  ) : null}
                </h3>
                <RichText field={linkLegacyReadMoreText(item.body_text)} />
                {isFilled.link(item.link) ? (
                  <PrismicNextLink
                    field={item.link}
                    className="inline-block mt-4 text-[12px] font-bold tracking-[0.08em] uppercase border-b border-current pb-0.5"
                  >
                    {item.link_label || "Read more"}
                  </PrismicNextLink>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

import { createContext, useContext } from "react";
import { PrismicRichText } from "@prismicio/react";
import type { RichTextField, RTNode } from "@prismicio/client";
import type { ArticlePageDocumentDataReferencesItem } from "../../../../prismicio-types";

export const RichTextEmbedsEnabled = createContext(true);

function addReferenceMarkers(field: RichTextField, references: ArticlePageDocumentDataReferencesItem[]): RichTextField {
  const [first, ...rest] = field;
  if (!first) return field;

  function addMarkers(node: RTNode): RTNode {
    if (!("text" in node)) return node;

    const markers = references.flatMap((reference, index) => {
      const location = reference.location?.trim();
      if (!location) return [];

      // Migrated excerpts can begin in a different rich text block.
      const tail = location.split(/\s+/).slice(-4).join(" ");
      const excerpt = node.text.includes(location) ? location : tail;
      const start = node.text.indexOf(excerpt);
      if (start === -1) return [];

      const end = start + excerpt.length;
      // A reference link must sit outside an existing hyperlink.
      const position = node.spans.find((span) => span.type === "hyperlink" && span.start < end && end < span.end)?.end ?? end;
      return [{ position, number: index + 1 }];
    });
    if (!markers.length) return node;

    let { text, spans } = node;
    // Insert from right to left so matches always use the original text offsets.
    for (const { position, number } of markers.sort((a, b) => b.position - a.position || b.number - a.number)) {
      const label = String(number);
      text = text.slice(0, position) + label + text.slice(position);
      spans = spans.map((span) => ({
        ...span,
        start: span.start >= position ? span.start + label.length : span.start,
        end: span.end > position ? span.end + label.length : span.end,
      }));
      spans.push({ type: "hyperlink", start: position, end: position + label.length, data: { link_type: "Web", url: `#reference-${number}` } });
    }
    return { ...node, text, spans };
  }

  return [addMarkers(first), ...rest.map(addMarkers)];
}

export function RichText({ field, references }: {
  field: RichTextField | null | undefined;
  references?: ArticlePageDocumentDataReferencesItem[];
}) {
  const embedsEnabled = useContext(RichTextEmbedsEnabled);
  if (!field || field.length === 0) return null;

  return (
    <PrismicRichText
      field={references?.length ? addReferenceMarkers(field, references) : field}
      components={{
        // A null result falls back to Prismic's raw HTML embed renderer.
        ...(embedsEnabled ? {} : { embed: () => <></> }),
        paragraph: ({ children }) => <p>{children}</p>,
        heading1: ({ children }) => <h1>{children}</h1>,
        heading2: ({ children }) => <h2>{children}</h2>,
        heading3: ({ children }) => <h3>{children}</h3>,
        list: ({ children }) => <ul>{children}</ul>,
        oList: ({ children }) => <ol>{children}</ol>,
        hyperlink: ({ children, node }) => {
          const data = node.data as { url?: string; target?: string };
          const referenceNumber = data.url?.match(/^#reference-(\d+)$/)?.[1];
          if (referenceNumber) return <a href={data.url} aria-label={`Reference ${referenceNumber}`}><sup>{children}</sup></a>;
          const isExternal = data.target === "_blank";
          return <a href={data.url} target={data.target} rel={isExternal ? "noreferrer" : undefined}>{children}</a>;
        },
      }}
    />
  );
}

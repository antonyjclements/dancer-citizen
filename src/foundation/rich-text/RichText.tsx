import { PrismicRichText } from "@prismicio/react";
import type { RichTextField, RTInlineNode } from "@prismicio/client";
import type { ArticleReference } from "@/features/journal/types/ArticleReferences";
import { articleRichTextComponents } from "./richTextComponents";

type RichTextProps = {
  field: RichTextField | null | undefined;
  className?: string;
  references?: ArticleReference[];
};

function offsetSpan(span: RTInlineNode, markerStart: number, markerLength: number): RTInlineNode {
  if (span.start > markerStart) {
    return { ...span, start: span.start + markerLength, end: span.end + markerLength };
  }

  if (span.end > markerStart) {
    return { ...span, end: span.end + markerLength };
  }

  return span;
}

function getReferenceInsertionPoint(text: string, location: string): number {
  const markerStart = text.indexOf(location);

  if (markerStart !== -1) {
    return markerStart + location.length;
  }

  const locationTail = location.split(/\s+/).slice(-4).join(" ");
  const tailStart = locationTail ? text.indexOf(locationTail) : -1;

  return tailStart === -1 ? -1 : tailStart + locationTail.length;
}

function injectReferenceMarkers(field: RichTextField, references: ArticleReference[]): RichTextField {
  return field.map((node) => {
    if (!("text" in node) || !Array.isArray(node.spans)) {
      return node;
    }

    let text = node.text;
    let spans = [...node.spans];

    references.forEach((reference, index) => {
      const location = reference.location?.trim();

      if (!location) {
        return;
      }

      const markerText = `${index + 1}`;
      const insertionPoint = getReferenceInsertionPoint(text, location);

      if (insertionPoint === -1) {
        return;
      }

      text = `${text.slice(0, insertionPoint)}${markerText}${text.slice(insertionPoint)}`;
      spans = spans.map((span) => offsetSpan(span, insertionPoint, markerText.length));
      spans.push({
        type: "hyperlink",
        start: insertionPoint,
        end: insertionPoint + markerText.length,
        data: {
          link_type: "Web",
          url: `#reference-${index + 1}`,
        },
      });
    });

    return { ...node, text, spans };
  }) as RichTextField;
}

export function RichText({ field, className, references }: RichTextProps) {
  if (!field || field.length === 0) {
    return null;
  }

  const richTextField = references?.length ? injectReferenceMarkers(field, references) : field;

  return (
    <div className={className}>
      <PrismicRichText field={richTextField} components={articleRichTextComponents} />
    </div>
  );
}

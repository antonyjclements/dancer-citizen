import type { Content } from "@prismicio/client";
import type { SliceComponentProps } from "@prismicio/react";
import { RichText } from "@/foundation/rich-text/RichText";
import type { ArticleReferenceContext } from "@/features/journal/types/ArticleReferences";

export type RichTextSectionProps = SliceComponentProps<Content.RichTextSectionSlice, ArticleReferenceContext>;

export default function RichTextSection({ slice, context }: RichTextSectionProps) {
  return (
    <section className="mb-9" data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
      {slice.primary.heading ? (
        <h2 className="font-display text-[28px] font-medium leading-[1.25] text-ink mt-12 mb-5">
          {slice.primary.heading}
        </h2>
      ) : null}
      <RichText field={slice.primary.body} references={context?.references} />
    </section>
  );
}

import type { Content } from "@prismicio/client";
import type { SliceComponentProps } from "@prismicio/react";
import { RichText } from "@/foundation/rich-text/RichText";
import type { ArticleReferenceContext } from "@/features/journal/types/ArticleReferences";

export type QuoteProps = SliceComponentProps<Content.QuoteSlice, ArticleReferenceContext>;

export default function Quote({ slice, context }: QuoteProps) {
  const isCentered = slice.primary.centered;

  return (
    <section className="mb-9" data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
      <blockquote
        className={[
          "font-display text-[22px] italic leading-[1.6] text-muted my-12",
          isCentered
            ? "text-center"
            : "pl-7 border-l-2 border-rule",
        ].join(" ")}
      >
        <RichText field={slice.primary.quote} references={context?.references} />
      </blockquote>
      {slice.primary.attribution ? (
        <p className="text-[12px] leading-[1.7] text-[#999]">{slice.primary.attribution}</p>
      ) : null}
    </section>
  );
}

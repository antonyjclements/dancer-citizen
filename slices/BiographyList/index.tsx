import type { Content } from "@prismicio/client";
import { isFilled } from "@prismicio/client";
import { PrismicNextImage, PrismicNextLink } from "@prismicio/next";
import type { SliceComponentProps } from "@prismicio/react";
import { getImageFieldWithAlt } from "@/foundation/prismic/getImageFieldWithAlt";
import { RichText } from "@/foundation/rich-text/RichText";

export type BiographyListProps = SliceComponentProps<Content.BiographyListSlice>;

export default function BiographyList({ slice }: BiographyListProps) {
  return (
    <section className="mb-9" data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
      {slice.primary.heading ? (
        <h2 className="font-display text-[28px] font-medium leading-[1.25] text-ink mt-12 mb-5">
          {slice.primary.heading}
        </h2>
      ) : null}
      <div className="flex flex-col gap-6">
        {slice.items.map((item, index) => (
          <article className="border-t border-rule pt-6" key={`${slice.id}-${index}`}>
            {isFilled.image(item.image) ? (
              <PrismicNextImage
                field={getImageFieldWithAlt(item.image, item.name || "Contributor portrait")}
                className="w-full h-auto mb-4"
              />
            ) : null}
            <div>
              <h3 className="font-display text-[24px] font-medium mb-2">{item.name}</h3>
              <RichText field={item.summary} />
              {isFilled.contentRelationship(item.linked_article) ? (
                <PrismicNextLink
                  field={item.linked_article}
                  className="inline-block mt-4 text-[12px] font-bold tracking-[0.08em] uppercase border-b border-current pb-0.5"
                >
                  Read contribution
                </PrismicNextLink>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

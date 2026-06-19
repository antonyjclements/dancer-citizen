import type { Content } from "@prismicio/client";
import { asText, isFilled } from "@prismicio/client";
import { PrismicNextImage } from "@prismicio/next";
import type { SliceComponentProps } from "@prismicio/react";
import { getImageFieldWithAlt } from "@/foundation/prismic/getImageFieldWithAlt";
import { RichText } from "@/foundation/rich-text/RichText";

export type GalleryProps = SliceComponentProps<Content.GallerySlice>;

export default function Gallery({ slice }: GalleryProps) {
  return (
    <section className="mb-9" data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
      {slice.primary.heading ? (
        <h2 className="font-display text-[28px] font-medium leading-[1.25] text-ink mt-12 mb-5">
          {slice.primary.heading}
        </h2>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {slice.items.map((item, index) => (
          <figure className="m-0" key={`${slice.id}-${index}`}>
            {isFilled.image(item.image) ? (
              <PrismicNextImage
                field={getImageFieldWithAlt(
                  item.image,
                  asText(item.caption) || asText(item.credit) || `Gallery image ${index + 1}`,
                )}
                className="w-full h-auto"
              />
            ) : (
              <div className="flex min-h-[200px] items-center justify-center bg-[#f0ebe3] text-[13px] tracking-[0.05em] uppercase text-[#aaa]">
                Image pending import
              </div>
            )}
            <figcaption className="mt-3 text-[12px] leading-[1.7] text-[#999]">
              <RichText field={item.caption} />
              <RichText field={item.credit} />
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

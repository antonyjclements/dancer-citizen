import type { Content } from "@prismicio/client";
import { asText, isFilled } from "@prismicio/client";
import { PrismicNextImage } from "@prismicio/next";
import type { SliceComponentProps } from "@prismicio/react";
import { getImageFieldWithAlt } from "@/foundation/prismic/getImageFieldWithAlt";
import { RichText } from "@/foundation/rich-text/RichText";

export type ImageProps = SliceComponentProps<Content.ImageSlice>;

export default function Image({ slice }: ImageProps) {
  return (
    <figure className="mb-9 m-0" data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
      {isFilled.image(slice.primary.image) ? (
        <PrismicNextImage
          field={getImageFieldWithAlt(
            slice.primary.image,
            asText(slice.primary.caption) || asText(slice.primary.credit),
          )}
          className="w-full h-auto"
        />
      ) : (
        <div className="flex min-h-[320px] items-center justify-center bg-[#f0ebe3] text-[13px] tracking-[0.05em] uppercase text-[#aaa]">
          Image pending import
        </div>
      )}
      <figcaption className="mt-3 text-[12px] leading-[1.7] text-[#999]">
        <RichText field={slice.primary.caption} />
        <RichText field={slice.primary.credit} />
      </figcaption>
    </figure>
  );
}

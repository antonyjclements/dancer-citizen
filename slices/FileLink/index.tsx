import type { Content } from "@prismicio/client";
import { isFilled } from "@prismicio/client";
import { PrismicNextLink } from "@prismicio/next";
import type { SliceComponentProps } from "@prismicio/react";
import { RichText } from "@/foundation/rich-text/RichText";

export type FileLinkProps = SliceComponentProps<Content.FileLinkSlice>;

export default function FileLink({ slice }: FileLinkProps) {
  return (
    <section className="mb-9" data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
      <div className="border-t border-rule pt-6">
        <h2 className="font-display text-[24px] font-medium mb-2">
          {slice.primary.title || "Download"}
        </h2>
        <RichText field={slice.primary.description} />
        {isFilled.link(slice.primary.file) ? (
          <PrismicNextLink
            field={slice.primary.file}
            className="inline-block mt-4 text-[12px] font-bold tracking-[0.08em] uppercase border-b border-current pb-0.5"
          >
            Open file
          </PrismicNextLink>
        ) : (
          <p className="text-[12px] leading-[1.7] text-[#999]">File pending import</p>
        )}
      </div>
    </section>
  );
}

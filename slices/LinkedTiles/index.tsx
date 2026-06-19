import type { Content } from "@prismicio/client";
import { asText } from "@prismicio/client";
import { PrismicNextLink } from "@prismicio/next";
import type { SliceComponentProps } from "@prismicio/react";

export type LinkedTilesProps = SliceComponentProps<Content.LinkedTilesSlice>;

export default function LinkedTiles({ slice }: LinkedTilesProps) {
  return (
    <section className="mb-9" data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
      {slice.primary.heading ? (
        <h2 className="font-display text-[28px] font-medium leading-[1.25] text-ink mt-12 mb-5">
          {slice.primary.heading}
        </h2>
      ) : null}
      <div className="border-t border-rule">
        {slice.items.map((item, index) => (
          <PrismicNextLink
            field={item.link}
            className="grid grid-cols-[44px_1fr] gap-5 py-6 border-b border-rule"
            key={`${slice.id}-${index}`}
          >
            <span className="font-display text-[28px] text-black/14">{index + 1}</span>
            <span>
              <span className="block font-display text-[24px] font-medium mb-2">
                {item.title || "Read more"}
              </span>
              {asText(item.summary) ? (
                <span className="block text-[14px] leading-[1.7] text-faint">{asText(item.summary)}</span>
              ) : null}
            </span>
          </PrismicNextLink>
        ))}
      </div>
    </section>
  );
}

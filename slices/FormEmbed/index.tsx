import type { Content } from "@prismicio/client";
import type { SliceComponentProps } from "@prismicio/react";

export type FormEmbedProps = SliceComponentProps<Content.FormEmbedSlice>;

export default function FormEmbed({ slice }: FormEmbedProps) {
  return (
    <section className="mb-9" data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
      <div className="border-t border-rule pt-6">
        <h2 className="font-display text-[24px] font-medium mb-2">
          {slice.primary.title || "Form"}
        </h2>
        <p className="text-[12px] leading-[1.7] text-[#999]">
          Embedded form rendering will be wired once form providers are confirmed.
        </p>
      </div>
    </section>
  );
}

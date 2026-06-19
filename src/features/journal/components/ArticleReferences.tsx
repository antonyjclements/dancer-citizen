import { isFilled } from "@prismicio/client";
import { RichText } from "@/foundation/rich-text/RichText";
import type { ArticleReference } from "../types/ArticleReferences";

type ArticleReferencesProps = {
  references: ArticleReference[];
};

export function ArticleReferences({ references }: ArticleReferencesProps) {
  const filledReferences = references.filter((reference) => isFilled.richText(reference.reference_text));

  if (filledReferences.length === 0) {
    return null;
  }

  return (
    <section className="mt-14 pt-10 border-t border-black/10" aria-labelledby="references">
      <h2 id="references" className="font-display text-[28px] font-medium leading-[1.25] text-ink mb-5">
        References
      </h2>
      <div className="space-y-5">
        {filledReferences.map((reference, index) => {
          const referenceNumber = index + 1;

          return (
            <div
              className="grid grid-cols-[32px_minmax(0,1fr)] gap-4"
              id={`reference-${referenceNumber}`}
              key={referenceNumber}
            >
              <span className="font-display text-[18px] leading-[1.85] text-[#777]">{referenceNumber}.</span>
              <div className="min-w-0 break-words [overflow-wrap:anywhere]">
                <RichText field={reference.reference_text} />
                <a
                  href={`#reverse-anchor-${referenceNumber}`}
                  className="inline-block text-[13px] text-faint border-b border-current pb-0.5"
                >
                  back to text
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

import Link from "next/link";
import type { JournalDocumentSummary } from "../types/JournalDocumentSummary";

type IssueTableOfContentsProps = {
  entries: JournalDocumentSummary[];
};

export function IssueTableOfContents({ entries }: IssueTableOfContentsProps) {
  return (
    <section className="px-6 md:px-8 py-16 md:py-20">
      <div className="max-w-[800px] mx-auto">
        <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-faint mb-12">
          Table of Contents
        </p>
        <div className="border-t border-rule">
          {entries.map((entry, index) => (
            <Link
              href={entry.href}
              className="grid grid-cols-1 sm:grid-cols-[48px_1fr] gap-4 sm:gap-6 py-8 border-b border-rule transition-[padding-left] duration-200 hover:pl-3 block"
              key={entry.id}
            >
              <span className="font-display text-[32px] font-light text-black/12 leading-none hidden sm:block">
                {index + 1}
              </span>
              <span>
                <span className="block font-display text-[24px] font-medium leading-[1.3] text-ink">
                  {entry.title}
                </span>
                {entry.subtitle ? (
                  <span className="block mt-2 text-[14px] text-faint">{entry.subtitle}</span>
                ) : null}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

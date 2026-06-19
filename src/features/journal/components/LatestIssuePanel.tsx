import Link from "next/link";
import { isFilled } from "@prismicio/client";
import { PrismicNextImage } from "@prismicio/next";
import type { Content } from "@prismicio/client";
import { formatPlainText } from "@/foundation/formatters/formatPlainText";
import { formatPublicationDate } from "@/foundation/formatters/formatPublicationDate";
import { getImageFieldWithAlt } from "@/foundation/prismic/getImageFieldWithAlt";

type IssueDocument = Omit<Content.IssuePageDocument, "uid" | "tags"> & { uid: string; tags: string[] };

type LatestIssuePanelProps = {
  issue: IssueDocument | null;
};

export function LatestIssuePanel({ issue }: LatestIssuePanelProps) {
  if (!issue) {
    return null;
  }

  const title = formatPlainText(issue.data.tile_title || issue.data.title || issue.uid);
  const date = formatPublicationDate(issue.data.publication_date);
  const thumbnail = isFilled.image(issue.data.tile_thumbnail)
    ? issue.data.tile_thumbnail
    : isFilled.image(issue.data.hero_image)
      ? issue.data.hero_image
      : null;

  return (
    <section className="bg-ink text-white px-6 md:px-8 py-20">
      <div className="max-w-[1200px] mx-auto">
        <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-[#666] mb-10">
          Latest Issue
        </p>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-8 md:gap-16 items-end">
          <div>
            <p className="font-display text-[14px] tracking-[0.05em] text-[#888] mb-4">
              Issue {issue.data.issue_number}
              {date ? ` · ${date}` : ""}
            </p>
            <h2 className="font-display text-[clamp(32px,4vw,52px)] italic font-normal leading-[1.2] text-white mb-6">
              <Link href={`/issues/${issue.uid}`}>{title}</Link>
            </h2>
            <Link
              href={`/issues/${issue.uid}`}
              className="inline-block text-[13px] font-bold tracking-[0.08em] uppercase text-white border-b border-white/30 pb-0.5"
            >
              Read Issue →
            </Link>
          </div>
          <Link
            href={`/issues/${issue.uid}`}
            className="group relative block aspect-[16/10] overflow-hidden bg-white/8"
            aria-label={`Read ${title}`}
          >
            {thumbnail ? (
              <PrismicNextImage
                field={getImageFieldWithAlt(thumbnail, title)}
                fill
                priority
                sizes="(min-width: 768px) 55vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center px-10 text-center font-display text-[56px] font-light italic leading-none text-white/20">
                Issue {issue.data.issue_number}
              </span>
            )}
          </Link>
        </div>
      </div>
    </section>
  );
}

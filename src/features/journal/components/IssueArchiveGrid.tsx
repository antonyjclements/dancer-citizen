import Link from "next/link";
import { isFilled } from "@prismicio/client";
import { PrismicNextImage } from "@prismicio/next";
import type { Content } from "@prismicio/client";
import { formatPlainText } from "@/foundation/formatters/formatPlainText";
import { formatPublicationDate } from "@/foundation/formatters/formatPublicationDate";
import { getImageFieldWithAlt } from "@/foundation/prismic/getImageFieldWithAlt";

type IssueDocument = Omit<Content.IssuePageDocument, "uid" | "tags"> & { uid: string; tags: string[] };

type IssueArchiveGridProps = {
  issues: IssueDocument[];
};

export function IssueArchiveGrid({ issues }: IssueArchiveGridProps) {
  return (
    <section className="px-6 md:px-8 py-20">
      <div className="max-w-[1200px] mx-auto">
        <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-faint mb-12">
          Archive · {issues.length} Issues
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-black/6 border border-black/6">
          {issues.map((issue) => {
            const title = formatPlainText(issue.data.tile_title || issue.data.title || issue.uid);
            const date = formatPublicationDate(issue.data.publication_date);
            const thumbnail = isFilled.image(issue.data.tile_thumbnail)
              ? issue.data.tile_thumbnail
              : isFilled.image(issue.data.hero_image)
                ? issue.data.hero_image
                : null;

            return (
              <Link
                href={`/issues/${issue.uid}`}
                className="group flex min-h-[360px] flex-col bg-paper transition-colors duration-200 hover:bg-paper-deep"
                key={issue.id}
              >
                <span className="relative block aspect-[4/3] overflow-hidden bg-[#eee8dc]">
                  {thumbnail ? (
                    <PrismicNextImage
                      field={getImageFieldWithAlt(thumbnail, title)}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-paper-deep px-8 text-center font-display text-[38px] font-light italic leading-none text-black/18">
                      Issue {issue.data.issue_number}
                    </span>
                  )}
                </span>
                <span className="flex flex-1 flex-col justify-between px-7 py-7">
                  <span className="block text-[11px] font-semibold tracking-[0.12em] uppercase text-[#bbb] mb-3">
                    Issue {issue.data.issue_number}
                  </span>
                  <span className="block font-display text-[20px] font-medium italic leading-[1.35] text-ink">
                    {title}
                  </span>
                  <span className="block text-[12px] text-[#bbb] mt-5">{date}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

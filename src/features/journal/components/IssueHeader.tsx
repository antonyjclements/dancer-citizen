import Link from "next/link";
import { isFilled } from "@prismicio/client";
import { PrismicNextImage } from "@prismicio/next";
import type { Content } from "@prismicio/client";
import { getImageFieldWithAlt } from "@/foundation/prismic/getImageFieldWithAlt";
import { RichText } from "@/foundation/rich-text/RichText";
import { formatPlainText } from "@/foundation/formatters/formatPlainText";
import { formatPublicationDate } from "@/foundation/formatters/formatPublicationDate";

type IssueDocument = Omit<Content.IssuePageDocument, "uid" | "tags"> & { uid: string; tags: string[] };

type IssueHeaderProps = {
  issue: IssueDocument;
};

export function IssueHeader({ issue }: IssueHeaderProps) {
  const title = formatPlainText(issue.data.tile_title || issue.data.title || issue.uid);
  const date = formatPublicationDate(issue.data.publication_date);
  const heroImage = issue.data.hero_image;
  const hasImage = isFilled.image(heroImage);
  const hasCredit = isFilled.richText(issue.data.hero_image_credit);

  return (
    <section className="relative min-h-[55vh] md:min-h-[65vh] lg:min-h-[75vh]">
      {/* Full-bleed hero image */}
      {hasImage && (
        <PrismicNextImage
          field={getImageFieldWithAlt(heroImage, title)}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      )}

      {/* Gradient overlays */}
      {hasImage ? (
        /* Dark overlay for text readability */
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
      ) : (
        /* Fallback gradient when no image */
        <div
          className="absolute inset-0"
          style={{
            background: [
              "radial-gradient(ellipse 70% 50% at 70% 30%, rgba(160, 140, 120, 0.1), transparent)",
              "#fcfaf5",
            ].join(", "),
          }}
        />
      )}

      {/* Back link — top */}
      <div className="absolute top-24 left-6 md:left-12 z-10">
        <Link
          href="/"
          className={[
            "text-[12px] font-bold tracking-[0.08em] uppercase transition-opacity hover:opacity-70",
            hasImage ? "text-white/80" : "text-faint",
          ].join(" ")}
        >
          ← All Issues
        </Link>
      </div>

      {/* Content — bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-6 md:px-12 pb-10 md:pb-16">
        <div className="max-w-[1200px] mx-auto">
          {/* Large decorative issue number */}
          <div
            className={[
              "font-display text-[clamp(60px,10vw,120px)] font-light leading-[0.85] tracking-[-0.04em] mb-2 select-none",
              hasImage ? "text-white/10" : "text-black/6",
            ].join(" ")}
          >
            {issue.data.issue_number}
          </div>

          <p
            className={[
              "text-[11px] font-medium tracking-[0.15em] uppercase mb-3",
              hasImage ? "text-white/80" : "text-faint",
            ].join(" ")}
          >
            Issue {issue.data.issue_number}
            {date ? ` · ${date}` : ""}
          </p>

          <h1
            className={[
              "font-display text-[clamp(28px,4.5vw,52px)] italic font-normal leading-[1.2] tracking-[-0.02em] m-0",
              hasImage ? "text-white" : "text-ink",
            ].join(" ")}
          >
            {title}
          </h1>

          {/* Image credit */}
          {hasCredit && (
            <div
              className={[
                "mt-4 text-[11px] leading-[1.6]",
                hasImage ? "text-white/60" : "text-[#bbb]",
              ].join(" ")}
            >
              <RichText field={issue.data.hero_image_credit} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

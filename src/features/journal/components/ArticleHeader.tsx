import Link from "next/link";
import type { Content } from "@prismicio/client";
import { formatPlainText } from "@/foundation/formatters/formatPlainText";
import { getIssueNumberFromTags } from "../data/getIssueNumberFromTags";

type ArticleDocument = Omit<Content.ArticlePageDocument, "uid" | "tags"> & { uid: string; tags: string[] };

type ArticleHeaderProps = {
  article: ArticleDocument;
};

export function ArticleHeader({ article }: ArticleHeaderProps) {
  const issueNumber = getIssueNumberFromTags(article.tags);
  const title = formatPlainText(article.data.hero_title || article.data.title || article.uid);

  return (
    <section className="pt-36 pb-16 px-6 md:px-8 border-b border-black/6">
      <div className="max-w-[720px] mx-auto">
        {issueNumber ? (
          <Link
            href="/"
            className="inline-block mb-12 text-[12px] font-bold tracking-[0.08em] uppercase text-faint hover:text-ink transition-colors before:content-['←_']"
          >
            Issue {issueNumber}
          </Link>
        ) : null}
        <h1 className="font-display text-[clamp(32px,4.5vw,48px)] font-normal leading-[1.2] tracking-[-0.02em] text-ink mb-5">
          {title}
        </h1>
        {article.data.hero_subtitle ? (
          <p className="text-[16px] text-[#888] mt-5">{article.data.hero_subtitle}</p>
        ) : null}
        {issueNumber ? (
          <p className="text-[13px] text-[#bbb] mt-2">Issue {issueNumber}</p>
        ) : null}
      </div>
    </section>
  );
}

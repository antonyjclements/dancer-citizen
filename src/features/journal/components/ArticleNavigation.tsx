import Link from "next/link";
import type { JournalDocumentSummary } from "../types/JournalDocumentSummary";

type ArticleNavigationProps = {
  issueHref: string | null;
  previousArticle: JournalDocumentSummary | null;
  nextArticle: JournalDocumentSummary | null;
};

function ArticleNavigationLink({
  article,
  direction,
}: {
  article: JournalDocumentSummary | null;
  direction: "previous" | "next";
}) {
  const label = direction === "previous" ? "Previous" : "Next";
  const arrow = direction === "previous" ? "←" : "→";

  if (!article) {
    return <div className="hidden md:block" />;
  }

  return (
    <Link
      href={article.href}
      className={[
        "group block border-t border-rule py-5 transition-colors hover:border-ink",
        direction === "next" ? "md:text-right" : "",
      ].join(" ")}
    >
      <span className="block text-[11px] font-semibold tracking-[0.15em] uppercase text-faint">
        {direction === "previous" ? `${arrow} ${label}` : `${label} ${arrow}`}
      </span>
      <span className="mt-2 block font-display text-[20px] leading-[1.25] text-ink group-hover:underline">
        {article.title}
      </span>
      {article.subtitle ? (
        <span className="mt-1 block text-[13px] leading-[1.5] text-faint">{article.subtitle}</span>
      ) : null}
    </Link>
  );
}

export function ArticleNavigation({ issueHref, previousArticle, nextArticle }: ArticleNavigationProps) {
  if (!issueHref && !previousArticle && !nextArticle) {
    return null;
  }

  return (
    <nav className="px-6 md:px-8 pb-16 md:pb-20" aria-label="Article navigation">
      <div className="mx-auto grid max-w-[900px] grid-cols-1 gap-6 md:grid-cols-[1fr_auto_1fr] md:items-start">
        <ArticleNavigationLink article={previousArticle} direction="previous" />
        {issueHref ? (
          <Link
            href={issueHref}
            className="flex min-h-[64px] items-center justify-center border border-rule px-6 text-center text-[11px] font-semibold tracking-[0.15em] uppercase text-faint transition-colors hover:border-ink hover:text-ink"
          >
            Table of Contents
          </Link>
        ) : null}
        <ArticleNavigationLink article={nextArticle} direction="next" />
      </div>
    </nav>
  );
}

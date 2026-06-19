import type { Metadata } from "next";
import { isFilled } from "@prismicio/client";
import { SliceZone } from "@prismicio/react";
import { RichText } from "@/foundation/rich-text/RichText";
import { ArticleHeader } from "@/features/journal/components/ArticleHeader";
import { ArticleNavigation } from "@/features/journal/components/ArticleNavigation";
import { ArticleReferences } from "@/features/journal/components/ArticleReferences";
import { getArticleMetadataData, getArticlePageData } from "@/features/journal/data/getArticlePageData";
import { getJournalDocumentHref } from "@/features/journal/data/getJournalDocumentHref";
import { components } from "@/slices";

type ArticlePageProps = {
  params: Promise<{
    uid: string;
  }>;
};

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { uid } = await params;
  const metadata = await getArticleMetadataData(uid);
  const title = metadata.title;
  const description = metadata.description;
  const images = metadata.image ? [{ url: metadata.image.url, alt: metadata.image.alt }] : undefined;

  return {
    title,
    description,
    authors: metadata.author ? [{ name: metadata.author }] : undefined,
    alternates: {
      canonical: `/articles/${uid}`,
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/articles/${uid}`,
      images,
    },
    twitter: {
      card: metadata.image ? "summary_large_image" : "summary",
      title,
      description,
      images: metadata.image ? [metadata.image.url] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { uid } = await params;
  const { article, issue, previousArticle, nextArticle } = await getArticlePageData(uid);
  const issueHref = issue ? getJournalDocumentHref(issue.type, issue.uid) : null;

  return (
    <main>
      <ArticleHeader article={article} />
      <section className="py-16 px-6 md:px-8">
        <div className="max-w-[680px] mx-auto">
          <SliceZone
            slices={article.data.body}
            components={components}
            context={{ references: article.data.references }}
          />
          <ArticleReferences references={article.data.references} />
          {isFilled.richText(article.data.works_cited) ? (
            <section className="mt-14 pt-10 border-t border-black/10" aria-labelledby="works-cited">
              <h2 id="works-cited" className="font-display text-[28px] font-medium leading-[1.25] text-ink mb-5">
                Works Cited
              </h2>
              <RichText field={article.data.works_cited} />
            </section>
          ) : null}
        </div>
      </section>
      <ArticleNavigation
        issueHref={issueHref}
        previousArticle={previousArticle}
        nextArticle={nextArticle}
      />
    </main>
  );
}

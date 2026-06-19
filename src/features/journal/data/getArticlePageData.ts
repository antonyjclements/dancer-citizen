import { asImageSrc, asText, isFilled } from "@prismicio/client";
import type { Content, ImageFieldImage } from "@prismicio/client";
import { notFound } from "next/navigation";
import { createClient } from "@/foundation/prismic/prismicClient";
import { formatIssueTag } from "@/foundation/formatters/formatIssueTag";
import { formatPlainText } from "@/foundation/formatters/formatPlainText";
import { getIssueTableOfContentsDocuments } from "./getIssuePageData";
import { getJournalDocumentSummary } from "./getJournalDocumentSummary";
import type { JournalDocumentSummary } from "../types/JournalDocumentSummary";

type ArticleDocument = Omit<Content.ArticlePageDocument, "uid" | "tags"> & { uid: string; tags: string[] };
type IssueDocument = Omit<Content.IssuePageDocument, "uid" | "tags"> & { uid: string; tags: string[] };

export type ArticlePageData = {
  article: ArticleDocument;
  issue: IssueDocument | null;
  previousArticle: JournalDocumentSummary | null;
  nextArticle: JournalDocumentSummary | null;
};

export type ArticleMetadataData = {
  title: string;
  description: string;
  author: string;
  image: {
    url: string;
    alt: string;
  } | null;
};

type ImageSliceLike = {
  slice_type?: string;
  primary?: {
    image?: ImageFieldImage;
  };
};

function getArticleTitle(article: ArticleDocument): string {
  return formatPlainText(article.data.meta_title || article.data.hero_title || article.data.title || article.uid);
}

function getArticleDescription(article: ArticleDocument): string {
  return (
    asText(article.data.meta_description) ||
    article.data.hero_subtitle ||
    asText(article.data.tile_summary) ||
    getArticleTitle(article)
  );
}

function getArticleImage(article: ArticleDocument): ArticleMetadataData["image"] {
  const bodyImage = (article.data.body as ImageSliceLike[]).find((slice) => (
    slice.slice_type === "Image" && isFilled.image(slice.primary?.image)
  ))?.primary?.image;
  const image = isFilled.image(article.data.hero_image)
    ? article.data.hero_image
    : isFilled.image(article.data.tile_thumbnail)
      ? article.data.tile_thumbnail
      : bodyImage;
  const url = image ? asImageSrc(image) : null;

  if (!image || !url) {
    return null;
  }

  return {
    url,
    alt: image.alt?.trim() || getArticleTitle(article),
  };
}

export async function getArticleMetadataData(uid: string): Promise<ArticleMetadataData> {
  const client = createClient();
  const article = await client.getByUID("article_page", uid).catch(() => notFound()) as unknown as ArticleDocument;

  return {
    title: getArticleTitle(article),
    description: getArticleDescription(article),
    author: article.data.hero_subtitle || "",
    image: getArticleImage(article),
  };
}

export async function getArticlePageData(uid: string): Promise<ArticlePageData> {
  const client = createClient();
  const article = await client.getByUID("article_page", uid).catch(() => notFound()) as unknown as ArticleDocument;
  const issueRelationship = article.data.issue;
  const issue = issueRelationship?.link_type === "Document" && !issueRelationship.isBroken && issueRelationship.uid
    ? await client.getByUID("issue_page", issueRelationship.uid).catch(() => null) as unknown as IssueDocument | null
    : null;

  if (!issue) {
    return { article, issue: null, previousArticle: null, nextArticle: null };
  }

  const issueTag = formatIssueTag(issue.data.issue_number);
  const tableOfContentsDocuments = await getIssueTableOfContentsDocuments(client, issue, issueTag);
  const tableOfContents = tableOfContentsDocuments.map(getJournalDocumentSummary);
  const articleIndex = tableOfContents.findIndex((entry) => entry.uid === article.uid);

  return {
    article,
    issue,
    previousArticle: articleIndex > 0 ? tableOfContents[articleIndex - 1] ?? null : null,
    nextArticle: articleIndex >= 0 ? tableOfContents[articleIndex + 1] ?? null : null,
  };
}

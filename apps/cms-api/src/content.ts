import * as prismic from "@prismicio/client";
import type { RichTextField } from "@prismicio/client";
import { createPrismicClient, type PreviewContext } from "./prismic";

type DocumentType = "issue_page" | "article_page" | "content_page";
type AnyDocument = {
  id: string;
  uid: string;
  type: DocumentType;
  tags: string[];
  first_publication_date?: string;
  data: Record<string, any>;
};

export type JournalSummary = {
  id: string;
  uid: string;
  type: DocumentType;
  title: string;
  subtitle: string;
  issueNumber: number | null;
  publicationDate: string;
  href: string;
  thumbnail: ImageView | null;
};

export type ImageView = {
  url: string;
  alt: string;
  dimensions?: { width: number; height: number };
};

export type MetadataView = {
  title: string;
  description: string;
  canonicalPath: string;
  type: "website" | "article";
  image: ImageView | null;
};

export function formatIssueTag(issueNumber: number | null | undefined): string | null {
  if (typeof issueNumber !== "number" || !Number.isFinite(issueNumber)) return null;
  return `issue-${String(issueNumber).padStart(2, "0")}`;
}

function asPlainText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return prismic.asText(value as RichTextField).trim();
  return "";
}

export function stripLegacyHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanText(value: unknown): string {
  return stripLegacyHtml(asPlainText(value)).replace(/\s+/g, " ").trim();
}

function publicationDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function issueNumberFromTags(tags: string[]): number | null {
  const tag = tags.find((entry) => /^issue-\d+$/i.test(entry));
  if (!tag) return null;
  const parsed = Number(tag.replace(/^issue-/i, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function getHref(type: DocumentType, uid: string): string {
  if (type === "issue_page") return `/issues/${uid}`;
  if (type === "article_page") return `/articles/${uid}`;
  return `/${uid}`;
}

function imageView(image: any, fallbackAlt: string): ImageView | null {
  const url = prismic.isFilled.image(image) ? prismic.asImageSrc(image) : null;
  if (!url) return null;
  return {
    url,
    alt: cleanText(image.alt || fallbackAlt || "Dancer Citizen image"),
    dimensions: image.dimensions,
  };
}

function documentTitle(document: AnyDocument): string {
  return cleanText(document.data.tile_title) ||
    cleanText(document.data.hero_title) ||
    cleanText(document.data.title) ||
    document.uid;
}

function documentSubtitle(document: AnyDocument): string {
  return cleanText(document.data.hero_subtitle) ||
    cleanText(document.data.tile_summary) ||
    cleanText(document.data.meta_description);
}

export function getSummary(document: AnyDocument): JournalSummary {
  const title = documentTitle(document);
  const issueNumber = document.type === "issue_page"
    ? Number(document.data.issue_number ?? null)
    : issueNumberFromTags(document.tags);

  return {
    id: document.id,
    uid: document.uid,
    type: document.type,
    title,
    subtitle: documentSubtitle(document),
    issueNumber: Number.isFinite(issueNumber) ? issueNumber : null,
    publicationDate: document.type === "issue_page" ? publicationDate(document.data.publication_date) : "",
    href: getHref(document.type, document.uid),
    thumbnail: imageView(document.data.tile_thumbnail, title) || imageView(document.data.hero_image, title),
  };
}

function displayIssueBody(issue: AnyDocument) {
  return (issue.data.body ?? []).filter((slice: any) => slice.slice_type !== "LinkedTiles");
}

export function linkedTableOfContentsIDs(issue: AnyDocument): string[] {
  const seen = new Set<string>();
  return (issue.data.body ?? []).flatMap((slice: any) => {
    if (slice.slice_type !== "LinkedTiles") return [];
    return (slice.items ?? []).flatMap((item: any) => {
      const link = item.link;
      if (link?.link_type !== "Document" || link.isBroken || !link.id || seen.has(link.id)) return [];
      seen.add(link.id);
      return link.id;
    });
  });
}

async function getIssueChildren(client: ReturnType<typeof createPrismicClient>, issue: AnyDocument): Promise<AnyDocument[]> {
  const ids = linkedTableOfContentsIDs(issue);
  if (ids.length > 0) {
    const docs = await client.getAllByIDs(ids) as unknown as AnyDocument[];
    const byID = new Map(docs.map((doc) => [doc.id, doc]));
    return ids.flatMap((id) => byID.get(id) ?? []);
  }

  const tag = formatIssueTag(Number(issue.data.issue_number ?? null));
  if (!tag) return [];

  return await client.getAllBySomeTags([tag], {
    orderings: [{ field: "document.first_publication_date", direction: "asc" }],
    filters: [prismic.filter.not("document.type", "issue_page")],
  }) as unknown as AnyDocument[];
}

function linkedSubmissionsFormBody(): RichTextField {
  const text = "Fill out my online form.";
  const start = text.indexOf("online form");
  return [{ type: "paragraph", text, spans: [{ type: "hyperlink", start, end: start + "online form".length, data: { link_type: "Web", url: "https://thedancercitizen.wufoo.com/forms/prrnm6x0iu6wyv" } }] }] as RichTextField;
}

function linkedSupportDonationBody(): RichTextField {
  return [{ type: "paragraph", text: "Donate", spans: [{ type: "hyperlink", start: 0, end: 6, data: { link_type: "Web", target: "_blank", url: "https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=UUTLCCFNSRGWC" } }] }] as RichTextField;
}

function richTextText(slice: any): string {
  if (slice.slice_type !== "RichTextSection") return "";
  return (slice.primary?.body ?? []).map((node: any) => node.text ?? "").join("\n");
}

export function normalizeContentPage(page: AnyDocument): AnyDocument {
  if (page.uid === "submissions") {
    const body = page.data.body ?? [];
    const currentCall = body.find((slice: any) => richTextText(slice).includes("We are now accepting submissions for Issue 20"));
    const formLink = body.find((slice: any) => richTextText(slice).includes("Fill out my online form"));
    const licensing = body.find((slice: any) => richTextText(slice).includes("The Dancer-Citizen supports the Creative Commons option"));
    const normalized = [currentCall, formLink, licensing].filter(Boolean).map((slice: any) => {
      if (slice === formLink) return { ...slice, primary: { ...slice.primary, body: linkedSubmissionsFormBody() } };
      if (slice === licensing) return { ...slice, primary: { ...slice.primary, body: (slice.primary.body ?? []).filter((node: any) => !node.text?.startsWith("This work is licensed under CC BY-NC-ND 4.0")) } };
      return slice;
    });
    return { ...page, data: { ...page.data, body: normalized } };
  }

  if (page.uid === "support-us") {
    return {
      ...page,
      data: {
        ...page.data,
        body: (page.data.body ?? []).map((slice: any) => {
          if (slice.slice_type !== "RichTextSection") return slice;
          return {
            ...slice,
            primary: {
              ...slice.primary,
              body: (slice.primary.body ?? []).map((node: any) => node.text?.startsWith("Donate (https://www.paypal.com/") ? linkedSupportDonationBody()[0] : node),
            },
          };
        }),
      },
    };
  }

  return page;
}

function articleImage(article: AnyDocument): ImageView | null {
  const title = documentTitle(article);
  const bodyImage = (article.data.body ?? []).find((slice: any) => slice.slice_type === "Image" && prismic.isFilled.image(slice.primary?.image))?.primary?.image;
  return imageView(article.data.hero_image, title) || imageView(article.data.tile_thumbnail, title) || imageView(bodyImage, title);
}

export async function getHome(context: PreviewContext = {}) {
  const client = createPrismicClient(context);
  const issues = await client.getAllByType("issue_page", { orderings: [{ field: "my.issue_page.issue_number", direction: "desc" }] }) as unknown as AnyDocument[];
  return { issues: issues.map(getSummary), latestIssue: issues[0] ? getSummary(issues[0]) : null };
}

export async function getIssue(uid: string, context: PreviewContext = {}) {
  const client = createPrismicClient(context);
  const issue = await client.getByUID("issue_page", uid) as unknown as AnyDocument;
  const allIssues = await client.getAllByType("issue_page", { orderings: [{ field: "my.issue_page.issue_number", direction: "asc" }] }) as unknown as AnyDocument[];
  const issueIndex = allIssues.findIndex((entry) => entry.uid === issue.uid);
  const children = await getIssueChildren(client, issue);
  return {
    issue: { ...issue, data: { ...issue.data, body: displayIssueBody(issue) } },
    summary: getSummary(issue),
    tableOfContents: children.map(getSummary),
    previousIssue: issueIndex > 0 ? getSummary(allIssues[issueIndex - 1]) : null,
    nextIssue: issueIndex >= 0 && allIssues[issueIndex + 1] ? getSummary(allIssues[issueIndex + 1]) : null,
  };
}

export async function getArticle(uid: string, context: PreviewContext = {}) {
  const client = createPrismicClient(context);
  const article = await client.getByUID("article_page", uid) as unknown as AnyDocument;
  const issueLink = article.data.issue;
  const issue = issueLink?.link_type === "Document" && !issueLink.isBroken && issueLink.uid
    ? await client.getByUID("issue_page", issueLink.uid).catch(() => null) as unknown as AnyDocument | null
    : null;
  const toc = issue ? (await getIssueChildren(client, issue)).map(getSummary) : [];
  const articleIndex = toc.findIndex((entry) => entry.uid === article.uid);
  return {
    article,
    summary: getSummary(article),
    issue: issue ? getSummary(issue) : null,
    previousArticle: articleIndex > 0 ? toc[articleIndex - 1] : null,
    nextArticle: articleIndex >= 0 ? toc[articleIndex + 1] ?? null : null,
  };
}

export async function getPage(uid: string, context: PreviewContext = {}) {
  const client = createPrismicClient(context);
  const page = await client.getByUID("content_page", uid) as unknown as AnyDocument;
  const normalizedPage = normalizeContentPage(page);
  return { page: normalizedPage, summary: getSummary(normalizedPage) };
}

export async function getMetadataForPath(path: string, context: PreviewContext = {}): Promise<MetadataView> {
  const normalizedPath = path.split("?")[0].replace(/\/$/, "") || "/";
  if (normalizedPath === "/") {
    return { title: "The Dancer-Citizen", description: "An open-access, peer-reviewed dance journal.", canonicalPath: "/", type: "website", image: null };
  }
  const articleMatch = normalizedPath.match(/^\/articles\/([^/]+)$/);
  if (articleMatch) {
    const { article } = await getArticle(articleMatch[1], context);
    const title = cleanText(article.data.meta_title) || documentTitle(article);
    const description = cleanText(article.data.meta_description) || cleanText(article.data.hero_subtitle) || cleanText(article.data.tile_summary) || title;
    return { title, description, canonicalPath: normalizedPath, type: "article", image: articleImage(article) };
  }
  const issueMatch = normalizedPath.match(/^\/issues\/([^/]+)$/);
  if (issueMatch) {
    const { summary } = await getIssue(issueMatch[1], context);
    return { title: summary.title, description: summary.subtitle || "The Dancer-Citizen issue.", canonicalPath: normalizedPath, type: "website", image: summary.thumbnail };
  }
  const uid = normalizedPath.slice(1);
  const { summary } = await getPage(uid, context);
  return { title: summary.title, description: summary.subtitle || "The Dancer-Citizen.", canonicalPath: normalizedPath, type: "website", image: summary.thumbnail };
}

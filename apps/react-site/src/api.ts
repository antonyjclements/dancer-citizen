export type ImageView = {
  url: string;
  alt: string;
  dimensions?: { width: number; height: number };
};

export type JournalSummary = {
  id: string;
  uid: string;
  type: "issue_page" | "article_page" | "content_page";
  title: string;
  subtitle: string;
  issueNumber: number | null;
  publicationDate: string;
  href: string;
  thumbnail: ImageView | null;
};

export type PrismicDocument = {
  id: string;
  uid: string;
  type: string;
  tags: string[];
  data: Record<string, any>;
};

export type HomeData = {
  issues: JournalSummary[];
  latestIssue: JournalSummary | null;
};

export type IssueData = {
  issue: PrismicDocument;
  summary: JournalSummary;
  tableOfContents: JournalSummary[];
  previousIssue: JournalSummary | null;
  nextIssue: JournalSummary | null;
};

export type ArticleData = {
  article: PrismicDocument;
  summary: JournalSummary;
  issue: JournalSummary | null;
  previousArticle: JournalSummary | null;
  nextArticle: JournalSummary | null;
};

export type ContentPageData = {
  page: PrismicDocument;
  summary: JournalSummary;
};

const apiBase = import.meta.env.VITE_CMS_API_BASE || "/cms";

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { credentials: "include" });
  if (response.status === 404) throw new Error("not-found");
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export type JournalDocumentType = "article_page" | "content_page" | "issue_page";

export type JournalDocumentSummary = {
  id: string;
  uid: string;
  type: JournalDocumentType;
  title: string;
  subtitle: string;
  issueNumber: number | null;
  publicationDate: string;
  href: string;
};

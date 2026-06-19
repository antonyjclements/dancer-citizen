import type { JournalDocumentType } from "../types/JournalDocumentSummary";

export function getJournalDocumentHref(type: JournalDocumentType, uid: string): string {
  switch (type) {
    case "issue_page":
      return `/issues/${uid}`;
    case "article_page":
      return `/articles/${uid}`;
    case "content_page":
      return `/${uid}`;
  }
}

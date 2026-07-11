import Link from "next/link";
import type { Content } from "@prismicio/client";
import { getJournalDocumentHref } from "../data/getJournalDocumentHref";

type IssueDocument = Omit<Content.IssuePageDocument, "uid" | "tags"> & { uid: string; tags: string[] };

type IssueNavigationProps = {
  previousIssue: IssueDocument | null;
  nextIssue: IssueDocument | null;
};

export function IssueNavigation({ previousIssue, nextIssue }: IssueNavigationProps) {
  return (
    <nav
      className="flex justify-between items-center bg-paper-deep px-6 md:px-8 py-12 gap-8"
      aria-label="Issue navigation"
    >
      {previousIssue ? (
        <Link
          href={getJournalDocumentHref("issue_page", previousIssue.uid)}
          className="text-[13px] font-bold tracking-[0.06em] uppercase text-muted hover:text-ink transition-colors"
        >
          ← Issue {previousIssue.data.issue_number}
        </Link>
      ) : (
        <span />
      )}
      {nextIssue ? (
        <Link
          href={getJournalDocumentHref("issue_page", nextIssue.uid)}
          className="text-[13px] font-bold tracking-[0.06em] uppercase text-muted hover:text-ink transition-colors"
        >
          Issue {nextIssue.data.issue_number} →
        </Link>
      ) : (
        <span className="text-[13px] font-bold tracking-[0.06em] uppercase text-[#ccc]">
          Next Issue →
        </span>
      )}
    </nav>
  );
}

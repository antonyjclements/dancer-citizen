import * as prismic from "@prismicio/client";
import type { Content } from "@prismicio/client";
import { notFound } from "next/navigation";
import { createClient } from "@/foundation/prismic/prismicClient";
import { formatIssueTag } from "@/foundation/formatters/formatIssueTag";
import { getJournalDocumentSummary } from "./getJournalDocumentSummary";
import type { JournalDocumentSummary } from "../types/JournalDocumentSummary";

type IssueDocument = Omit<Content.IssuePageDocument, "uid" | "tags"> & { uid: string; tags: string[] };
type JournalChildDocument =
  | (Omit<Content.ArticlePageDocument, "uid" | "tags"> & { uid: string; tags: string[] })
  | (Omit<Content.ContentPageDocument, "uid" | "tags"> & { uid: string; tags: string[] });
type IssueBodySlice = {
  slice_type?: string;
  items?: Array<{
    link?: {
      id?: string;
      isBroken?: boolean;
      link_type?: string;
    };
  }>;
};

export type IssuePageData = {
  issue: IssueDocument;
  issueBody: IssueDocument["data"]["body"];
  tableOfContents: JournalDocumentSummary[];
  previousIssue: IssueDocument | null;
  nextIssue: IssueDocument | null;
};

function getDisplayIssueBody(issue: IssueDocument): IssueDocument["data"]["body"] {
  return issue.data.body.filter(
    (slice) => (slice as { slice_type?: string }).slice_type !== "LinkedTiles",
  ) as IssueDocument["data"]["body"];
}

function getLinkedTableOfContentsIDs(issue: IssueDocument): string[] {
  const seenIDs = new Set<string>();

  return (issue.data.body as IssueBodySlice[]).flatMap((slice) => {
    if (slice.slice_type !== "LinkedTiles") {
      return [];
    }

    return (slice.items ?? []).flatMap((item) => {
      const link = item.link;

      if (
        link?.link_type !== "Document" ||
        link.isBroken ||
        !link.id ||
        seenIDs.has(link.id)
      ) {
        return [];
      }

      seenIDs.add(link.id);
      return link.id;
    });
  });
}

function sortDocumentsByIDs(documents: JournalChildDocument[], orderedIDs: string[]): JournalChildDocument[] {
  const documentByID = new Map(documents.map((document) => [document.id, document]));

  return orderedIDs.flatMap((id) => {
    const document = documentByID.get(id);
    return document ? [document] : [];
  });
}

export async function getIssueTableOfContentsDocuments(
  client: ReturnType<typeof createClient>,
  issue: IssueDocument,
  issueTag: string | null,
): Promise<JournalChildDocument[]> {
  const tableOfContentsIDs = getLinkedTableOfContentsIDs(issue);

  if (tableOfContentsIDs.length > 0) {
    const linkedDocuments = await client.getAllByIDs(tableOfContentsIDs) as unknown as JournalChildDocument[];
    return sortDocumentsByIDs(linkedDocuments, tableOfContentsIDs);
  }

  if (!issueTag) {
    return [];
  }

  return await client.getAllBySomeTags([issueTag], {
    orderings: [{ field: "document.first_publication_date", direction: "asc" }],
    filters: [prismic.filter.not("document.type", "issue_page")],
  }) as unknown as JournalChildDocument[];
}

export async function getIssuePageData(uid: string): Promise<IssuePageData> {
  const client = createClient();
  const issue = await client.getByUID("issue_page", uid).catch(() => notFound()) as unknown as IssueDocument;
  const issueTag = formatIssueTag(issue.data.issue_number);
  const allIssues = await client.getAllByType("issue_page", {
    orderings: [{ field: "my.issue_page.issue_number", direction: "asc" }],
  }) as unknown as IssueDocument[];
  const issueIndex = allIssues.findIndex((entry) => entry.uid === issue.uid);
  const children = await getIssueTableOfContentsDocuments(client, issue, issueTag);

  return {
    issue,
    issueBody: getDisplayIssueBody(issue),
    tableOfContents: children.map(getJournalDocumentSummary),
    previousIssue: issueIndex > 0 ? allIssues[issueIndex - 1] ?? null : null,
    nextIssue: issueIndex >= 0 ? allIssues[issueIndex + 1] ?? null : null,
  };
}

import * as prismic from "@prismicio/client";
import type { RichTextField } from "@prismicio/client";
import { formatPlainText } from "@/foundation/formatters/formatPlainText";
import { formatPublicationDate } from "@/foundation/formatters/formatPublicationDate";
import { getIssueNumberFromTags } from "./getIssueNumberFromTags";
import { getJournalDocumentHref } from "./getJournalDocumentHref";
import type { JournalDocumentSummary, JournalDocumentType } from "../types/JournalDocumentSummary";

type JournalPrismicDocument = {
  id: string;
  uid: string;
  tags: string[];
  type: JournalDocumentType;
  data: Record<string, unknown>;
};

function getStringField(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === "string" ? value : "";
}

function getRichTextFieldText(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return Array.isArray(value) && value.length > 0 ? prismic.asText(value as RichTextField) ?? "" : "";
}

export function getJournalDocumentSummary(document: JournalPrismicDocument): JournalDocumentSummary {
  const issueNumber =
    document.type === "issue_page"
      ? Number(document.data.issue_number ?? null)
      : getIssueNumberFromTags(document.tags);
  const title = formatPlainText(
    getStringField(document.data, "tile_title") ||
      getStringField(document.data, "hero_title") ||
      getStringField(document.data, "title") ||
      document.uid,
  );
  const subtitle =
    getStringField(document.data, "hero_subtitle") ||
    getRichTextFieldText(document.data, "tile_summary") ||
    getRichTextFieldText(document.data, "meta_description");
  const publicationDate =
    document.type === "issue_page" && typeof document.data.publication_date === "string"
      ? formatPublicationDate(document.data.publication_date)
      : "";

  return {
    id: document.id,
    uid: document.uid,
    type: document.type,
    title,
    subtitle,
    issueNumber: Number.isFinite(issueNumber) ? issueNumber : null,
    publicationDate,
    href: getJournalDocumentHref(document.type, document.uid),
  };
}

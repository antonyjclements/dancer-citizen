export function formatIssueTag(issueNumber: number | null | undefined): string | null {
  if (typeof issueNumber !== "number" || !Number.isFinite(issueNumber)) {
    return null;
  }

  return `issue-${String(issueNumber).padStart(2, "0")}`;
}

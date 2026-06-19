export function getIssueNumberFromTags(tags: string[]): number | null {
  const issueTag = tags.find((tag) => /^issue-\d+$/.test(tag));

  if (!issueTag) {
    return null;
  }

  return Number(issueTag.replace("issue-", ""));
}

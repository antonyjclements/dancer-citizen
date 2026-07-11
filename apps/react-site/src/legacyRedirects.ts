export function getLegacyRedirectPath(path: string): string | null {
  const normalizedPath = path.split(/[?#]/)[0].replace(/\/+$/g, "") || "/";
  const issueMatch = normalizedPath.match(/^\/(issue-\d+)$/i);
  if (issueMatch) return `/issues/${issueMatch[1].toLowerCase()}`;

  const articleMatch = normalizedPath.match(/^\/(issue-\d+)\/([^/]+)$/i);
  if (!articleMatch) return null;

  return `/articles/${articleMatch[1].toLowerCase()}--${articleMatch[2]}`;
}

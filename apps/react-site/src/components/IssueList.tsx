import { Link } from "react-router-dom";
import type { JournalSummary } from "../api";
import { stripLegacyHtml } from "../text";

export function IssueList({ issues }: { issues: JournalSummary[] }) {
  return (
    <div className="issue-grid">
      {issues.map((issue) => (
        <Link className="issue-card" key={issue.id} to={issue.href}>
          {issue.thumbnail ? <img src={issue.thumbnail.url} alt={issue.thumbnail.alt} /> : <div className="placeholder" aria-hidden="true" />}
          <span>{issue.publicationDate}</span>
          <h3>{stripLegacyHtml(issue.title)}</h3>
          {issue.subtitle ? <p>{stripLegacyHtml(issue.subtitle)}</p> : null}
        </Link>
      ))}
    </div>
  );
}

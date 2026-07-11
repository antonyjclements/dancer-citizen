import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { getJson, type IssueData } from "../api";
import { Loading } from "../components/Loading";
import { Slices } from "../components/Slices";
import { useAsyncData } from "../hooks";
import { stripLegacyHtml } from "../text";
import { NotFoundPage } from "./NotFoundPage";

export function IssuePage() {
  const { uid = "" } = useParams();
  const loadIssue = useCallback(() => getJson<IssueData>(`/issues/${uid}`), [uid]);
  const state = useAsyncData(`issue:${uid}`, loadIssue);
  if (state.status === "loading") return <Loading />;
  if (state.status === "error") return <NotFoundPage />;

  return (
    <main>
      <section className="article-hero">
        <div className="hero-kicker">{state.data.summary.publicationDate}</div>
        <h1>{stripLegacyHtml(state.data.summary.title)}</h1>
      </section>
      <section className="body">
        {state.data.summary.subtitle ? <p className="body-intro">{stripLegacyHtml(state.data.summary.subtitle)}</p> : null}
        <Slices slices={state.data.issue.data.body} />
      </section>
      <section className="toc">
        <h2>Table of Contents</h2>
        {state.data.tableOfContents.map((entry) => <Link key={entry.id} to={entry.href}>{stripLegacyHtml(entry.title)}</Link>)}
      </section>
      <nav className="article-nav">
        {state.data.previousIssue ? <Link to={state.data.previousIssue.href}>Previous: {state.data.previousIssue.title}</Link> : <span />}
        {state.data.nextIssue ? <Link to={state.data.nextIssue.href}>Next: {state.data.nextIssue.title}</Link> : <span />}
      </nav>
    </main>
  );
}

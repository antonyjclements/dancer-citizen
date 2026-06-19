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
  if (state.status === "error") return state.error.message === "not-found" ? <NotFoundPage /> : <main className="page"><h1>Issue unavailable</h1></main>;

  return (
    <main>
      <section className="article-hero">
        <p>{state.data.summary.publicationDate}</p>
        <h1>{stripLegacyHtml(state.data.summary.title)}</h1>
        {state.data.summary.subtitle ? <p>{stripLegacyHtml(state.data.summary.subtitle)}</p> : null}
      </section>
      <section className="body"><Slices slices={state.data.issue.data.body} /></section>
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

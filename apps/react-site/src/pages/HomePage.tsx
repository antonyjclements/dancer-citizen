import { useCallback } from "react";
import { getJson, type HomeData } from "../api";
import { Loading } from "../components/Loading";
import { IssueList } from "../components/IssueList";
import { useAsyncData } from "../hooks";
import { stripLegacyHtml } from "../text";

export function HomePage() {
  const loadHome = useCallback(() => getJson<HomeData>("/home"), []);
  const state = useAsyncData("home", loadHome);
  if (state.status === "loading") return <Loading />;
  if (state.status === "error") return <main className="page"><h1>Unable to load the journal</h1></main>;

  const latest = state.data.latestIssue;
  const archive = latest ? state.data.issues.filter((issue) => issue.id !== latest.id) : state.data.issues;

  return (
    <main>
      <section className="hero">
        <p>Open-access dance scholarship</p>
        <h1>The Dancer-Citizen</h1>
      </section>
      {latest ? (
        <section className="latest">
          <div>
            <p>{latest.publicationDate}</p>
            <h2>{stripLegacyHtml(latest.title)}</h2>
            <p>{stripLegacyHtml(latest.subtitle)}</p>
            <a href={latest.href}>Read the latest issue</a>
          </div>
          {latest.thumbnail ? <img src={latest.thumbnail.url} alt={latest.thumbnail.alt} /> : null}
        </section>
      ) : null}
      <section className="page">
        <h2>Issue Archive</h2>
        <IssueList issues={archive} />
      </section>
    </main>
  );
}

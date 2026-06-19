import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { getJson, type ContentPageData } from "../api";
import { Loading } from "../components/Loading";
import { Slices } from "../components/Slices";
import { useAsyncData } from "../hooks";
import { stripLegacyHtml } from "../text";
import { NotFoundPage } from "./NotFoundPage";

export function ContentPage() {
  const { uid = "" } = useParams();
  const loadPage = useCallback(() => getJson<ContentPageData>(`/pages/${uid}`), [uid]);
  const state = useAsyncData(`page:${uid}`, loadPage);
  if (state.status === "loading") return <Loading />;
  if (state.status === "error") return state.error.message === "not-found" ? <NotFoundPage /> : <main className="page"><h1>Page unavailable</h1></main>;

  return (
    <main>
      <section className="article-hero">
        <h1>{stripLegacyHtml(state.data.summary.title)}</h1>
        {state.data.summary.subtitle ? <p>{stripLegacyHtml(state.data.summary.subtitle)}</p> : null}
      </section>
      <section className="body"><Slices slices={state.data.page.data.body} /></section>
    </main>
  );
}

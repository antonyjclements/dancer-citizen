import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { getJson, type ContentPageData } from "../api";
import { Loading } from "../components/Loading";
import { Slices } from "../components/Slices";
import { SubmissionForm } from "../components/SubmissionForm";
import { useAsyncData } from "../hooks";
import { stripLegacyHtml } from "../text";
import { NotFoundPage } from "./NotFoundPage";

export function ContentPage() {
  const { uid = "" } = useParams();
  const loadPage = useCallback(() => getJson<ContentPageData>(`/pages/${uid}`), [uid]);
  const state = useAsyncData(`page:${uid}`, loadPage);
  if (state.status === "loading") return <Loading />;
  // if (state.status === "error" && uid === "in-the-moment") {
  //   return (
  //     <main>
  //       <section className="article-hero">
  //         <h1>In the Moment</h1>
  //       </section>
  //       <section className="body">
  //         <p className="pending">Content pending.</p>
  //       </section>
  //     </main>
  //   );
  // }
  if (state.status === "error") return <NotFoundPage />;

  return (
    <main>
      <section className="article-hero">
        <h1>{stripLegacyHtml(state.data.summary.title)}</h1>
      </section>
      <section className="body">
        {state.data.summary.subtitle ? <p className="body-intro">{stripLegacyHtml(state.data.summary.subtitle)}</p> : null}
        <Slices slices={state.data.page.data.body} />
        {uid === "submissions" ? <SubmissionForm /> : null}
      </section>
    </main>
  );
}

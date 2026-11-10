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

  const { page, summary } = state.data;
  const isReviewListing = page.data.body?.some((slice: any) =>
    slice.slice_type === "BookReviews" && slice.primary?.hide !== true && slice.items?.length,
  );
  const subtitle = stripLegacyHtml(summary.subtitle);

  return (
    <main>
      <section className={isReviewListing ? "article-hero book-reviews-hero" : "article-hero"}>
        <h1>{stripLegacyHtml(summary.title)}</h1>
        {subtitle ? <p className="article-hero-subtitle">{subtitle}</p> : null}
      </section>
      <section className={isReviewListing ? "body book-reviews-body" : "body"}>
        <Slices slices={page.data.body} />
        {uid === "submissions" ? <SubmissionForm /> : null}
      </section>
    </main>
  );
}

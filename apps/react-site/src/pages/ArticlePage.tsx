import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { isFilled } from "@prismicio/client";
import { getJson, type ArticleData } from "../api";
import { Loading } from "../components/Loading";
import { RichText } from "../components/RichText";
import { Slices } from "../components/Slices";
import { useAsyncData } from "../hooks";
import { stripLegacyHtml } from "../text";
import { NotFoundPage } from "./NotFoundPage";

export function ArticlePage() {
  const { uid = "" } = useParams();
  const loadArticle = useCallback(() => getJson<ArticleData>(`/articles/${uid}`), [uid]);
  const state = useAsyncData(`article:${uid}`, loadArticle);
  if (state.status === "loading") return <Loading />;
  if (state.status === "error") return state.error.message === "not-found" ? <NotFoundPage /> : <main className="page"><h1>Article unavailable</h1></main>;

  const article = state.data.article;

  return (
    <main>
      <section className="article-hero">
        {state.data.issue ? <Link to={state.data.issue.href}>{state.data.issue.title}</Link> : null}
        <h1>{stripLegacyHtml(article.data.hero_title || article.data.title || state.data.summary.title)}</h1>
        {article.data.hero_subtitle ? <p>{stripLegacyHtml(article.data.hero_subtitle)}</p> : null}
      </section>
      <section className="body">
        <Slices slices={article.data.body} references={article.data.references} />
        {article.data.references?.length ? (
          <section className="references" id="references">
            <h2>References</h2>
            {article.data.references.map((reference: any, index: number) => <p key={index} id={`reference-${index + 1}`}><sup>{index + 1}</sup> {reference.citation || reference.label || reference.location}</p>)}
          </section>
        ) : null}
        {isFilled.richText(article.data.works_cited) ? <section className="works"><h2>Works Cited</h2><RichText field={article.data.works_cited} /></section> : null}
      </section>
      <nav className="article-nav">
        {state.data.previousArticle ? <Link to={state.data.previousArticle.href}>Previous: {state.data.previousArticle.title}</Link> : <span />}
        {state.data.issue ? <Link to={state.data.issue.href}>Table of Contents</Link> : <span />}
        {state.data.nextArticle ? <Link to={state.data.nextArticle.href}>Next: {state.data.nextArticle.title}</Link> : <span />}
      </nav>
    </main>
  );
}

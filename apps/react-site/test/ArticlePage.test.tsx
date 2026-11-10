import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { ArticleData } from "../src/api";
import { useAsyncData } from "../src/hooks";
import { ArticlePage } from "../src/pages/ArticlePage";

vi.mock("../src/hooks", () => ({ useAsyncData: vi.fn() }));

function renderArticle(subtitle: string | null, navigation: Partial<ArticleData> = {}) {
  const data: ArticleData = {
    article: {
      id: "1", uid: "example", type: "article_page", tags: [],
      data: { hero_title: "Article title", hero_subtitle: subtitle, body: [] },
    },
    summary: {
      id: "1", uid: "example", type: "article_page", title: "Article title",
      subtitle: "", issueNumber: null, publicationDate: "", href: "/articles/example", thumbnail: null,
    },
    issue: null, previousArticle: null, nextArticle: null, ...navigation,
  };
  vi.mocked(useAsyncData).mockReturnValue({ status: "success", data, error: null });
  return renderToStaticMarkup(<MemoryRouter><ArticlePage /></MemoryRouter>);
}

describe("article hero subtitle", () => {
  it("renders the subtitle directly beneath the title inside the hero", () => {
    const html = renderArticle("<em>Article subtitle</em>");
    expect(html).toMatch(/<section class="article-hero"><h1>Article title<\/h1><p[^>]*>Article subtitle<\/p><\/section>/);
    expect(html.match(/Article subtitle/g)).toHaveLength(1);
  });

  it("omits the subtitle when the article has none", () => {
    expect(renderArticle(null)).toContain('<section class="article-hero"><h1>Article title</h1></section>');
  });
});

// @spec:BOOK-002
it("links back to a review listing while retaining the issue table of contents", () => {
  const html = renderArticle(null, {
    reviewListing: { href: "/book-reviews-issue-21", title: "Book Reviews" },
    issue: {
      id: "issue", uid: "issue-21", type: "issue_page", title: "Issue 21",
      subtitle: "", issueNumber: 21, publicationDate: "", href: "/issues/issue-21", thumbnail: null,
    },
  });

  expect(html).toMatch(/href="\/book-reviews-issue-21"[^>]*>Back to Book Reviews<\/a>/);
  expect(html).toMatch(/href="\/issues\/issue-21"[^>]*>Table of Contents<\/a>/);
});

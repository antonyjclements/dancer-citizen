import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { IssueData } from "../src/api";
import { useAsyncData } from "../src/hooks";
import { IssuePage } from "../src/pages/IssuePage";

vi.mock("../src/hooks", () => ({ useAsyncData: vi.fn() }));

function issueData(): IssueData {
  return {
    issue: { id: "17", uid: "issue-17", type: "issue_page", tags: [], data: { body: [] } },
    summary: {
      id: "17", uid: "issue-17", type: "issue_page", issueNumber: 17,
      title: "Issue 17: Combine, Craft and Create: centering work at the edges",
      subtitle: "A tribute to <em>Jane Alexandre</em>", publicationDate: "November 2023", href: "/issues/issue-17",
      thumbnail: { url: "https://images.prismic.io/example/issue-17.jpg", alt: "Issue 17 cover", dimensions: { width: 659, height: 585 } },
    },
    tableOfContents: [], previousIssue: null, nextIssue: null,
  };
}

function renderIssue(data: IssueData) {
  vi.mocked(useAsyncData).mockReturnValue({ status: "success", data, error: null });
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(IssuePage)));
}

// @spec:ISSUE-001
describe("issue hero", () => {
  it("shows the cover before the hero copy and places the subtitle directly below the title", () => {
    const html = renderIssue(issueData());
    expect(html).toContain('class="issue-hero-image" src="https://images.prismic.io/example/issue-17.jpg" alt="Issue 17 cover" width="659" height="585"');
    expect(html.indexOf('class="issue-hero-image"')).toBeLessThan(html.indexOf('class="issue-hero-copy"'));
    expect(html).toContain("November 2023");
    expect(html).toContain('<h1>Issue 17: Combine, Craft and Create: centering work at the edges</h1><p class="article-hero-subtitle">A tribute to Jane Alexandre</p></div></section>');
    expect(html.match(/A tribute to Jane Alexandre/g)).toHaveLength(1);
    expect(html).toContain("<h2>Table of Contents</h2>");
  });

  it("keeps the date and title without an image or empty image column when no cover is available", () => {
    const data = issueData();
    data.summary.thumbnail = null;
    data.summary.subtitle = "";
    const html = renderIssue(data);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("issue-hero-with-image");
    expect(html).not.toContain("article-hero-subtitle");
    expect(html).toContain("November 2023");
    expect(html).toContain(`<h1>${data.summary.title}</h1>`);
  });
});

// @spec:ISSUE-003
it("shows a hero subtitle below its article title in the same link when present", () => {
  const data = issueData();
  const article = { type: "article_page", issueNumber: 17, publicationDate: "", thumbnail: null } as const;
  data.tableOfContents = [
    { ...article, id: "1", uid: "movement", title: "Movement", subtitle: "Notes on practice", href: "/articles/movement" },
    { ...article, id: "2", uid: "memory", title: "Memory", subtitle: "", href: "/articles/memory" },
  ];

  const html = renderIssue(data);

  expect(html).toMatch(/href="\/articles\/movement"[^>]*>Movement<span[^>]*>Notes on practice<\/span><\/a>/);
  expect(html).toMatch(/href="\/articles\/memory"[^>]*>Memory<\/a>/);
});

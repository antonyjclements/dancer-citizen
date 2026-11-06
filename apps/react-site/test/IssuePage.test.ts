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
      subtitle: "", publicationDate: "November 2023", href: "/issues/issue-17",
      thumbnail: { url: "https://images.prismic.io/example/issue-17.jpg", alt: "Issue 17 cover", dimensions: { width: 659, height: 585 } },
    },
    tableOfContents: [], previousIssue: null, nextIssue: null,
  };
}

function renderIssue(data: IssueData) {
  vi.mocked(useAsyncData).mockReturnValue({ status: "success", data, error: null });
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(IssuePage)));
}

describe("issue header imagery", () => {
  it("shows the normalized cover with its alt text and dimensions before the issue title", () => {
    const html = renderIssue(issueData());
// @spec:ISSUE-001
    expect(html).toContain('class="issue-hero-image" src="https://images.prismic.io/example/issue-17.jpg" alt="Issue 17 cover" width="659" height="585"');
    expect(html.indexOf('class="issue-hero-image"')).toBeLessThan(html.indexOf('class="issue-hero-copy"'));
    expect(html).toContain("November 2023");
    expect(html).toContain("<h1>Issue 17: Combine, Craft and Create: centering work at the edges</h1>");
    expect(html).toContain("<h2>Table of Contents</h2>");
  });

  it("keeps the date and title without an image or empty image column when no cover is available", () => {
    const data = issueData();
    data.summary.thumbnail = null;
    const html = renderIssue(data);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("issue-hero-with-image");
    expect(html).toContain("November 2023");
    expect(html).toContain(`<h1>${data.summary.title}</h1>`);
  });
});

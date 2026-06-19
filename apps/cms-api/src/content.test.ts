import { describe, expect, it } from "vitest";
import { getSummary, linkedTableOfContentsIDs, normalizeContentPage, stripLegacyHtml } from "./content";

function doc(overrides: Record<string, any>) {
  return {
    id: "id",
    uid: "uid",
    type: "content_page" as const,
    tags: [],
    data: {},
    ...overrides,
  } as any;
}

describe("content normalization", () => {
  it("derives issue hrefs and non-empty thumbnail alt text", () => {
    const summary = getSummary(doc({
      type: "issue_page",
      uid: "issue-20",
      data: {
        issue_number: 20,
        title: "Issue 20",
        tile_thumbnail: {
          url: "https://images.prismic.io/example.jpg",
          alt: "",
          dimensions: { width: 100, height: 100 },
        },
      },
    }));

    expect(summary.href).toBe("/issues/issue-20");
    expect(summary.thumbnail?.alt).toBe("Issue 20");
  });

  it("strips migrated legacy HTML from summary title and image alt fallback", () => {
    const summary = getSummary(doc({
      type: "issue_page",
      uid: "issue-20",
      data: {
        issue_number: 20,
        title: "Issue 20: <strong>Feeling the Now</strong>",
        tile_thumbnail: {
          url: "https://images.prismic.io/example.jpg",
          alt: "",
          dimensions: { width: 100, height: 100 },
        },
      },
    }));

    expect(summary.title).toBe("Issue 20: Feeling the Now");
    expect(summary.thumbnail?.alt).toBe("Issue 20: Feeling the Now");
    expect(stripLegacyHtml("Dance &amp; <em>civic</em> life")).toBe("Dance & civic life");
  });

  it("keeps linked table of contents order and removes duplicates", () => {
    const ids = linkedTableOfContentsIDs(doc({
      type: "issue_page",
      data: {
        body: [{
          slice_type: "LinkedTiles",
          items: [
            { link: { link_type: "Document", id: "b" } },
            { link: { link_type: "Document", id: "a" } },
            { link: { link_type: "Document", id: "b" } },
          ],
        }],
      },
    }));

    expect(ids).toEqual(["b", "a"]);
  });

  it("normalizes support donation copy into a PayPal hyperlink", () => {
    const normalized = normalizeContentPage(doc({
      uid: "support-us",
      data: {
        body: [{
          slice_type: "RichTextSection",
          primary: {
            body: [{ type: "paragraph", text: "Donate (https://www.paypal.com/example)", spans: [] }],
          },
        }],
      },
    }));

    expect(normalized.data.body[0].primary.body[0].text).toBe("Donate");
    expect(normalized.data.body[0].primary.body[0].spans[0].data.target).toBe("_blank");
  });

  it("filters submissions to the current call, form link, and licensing copy", () => {
    const normalized = normalizeContentPage(doc({
      uid: "submissions",
      data: {
        body: [
          { slice_type: "RichTextSection", primary: { body: [{ text: "Old Issue 15 copy" }] } },
          { slice_type: "RichTextSection", primary: { body: [{ text: "We are now accepting submissions for Issue 20" }] } },
          { slice_type: "RichTextSection", primary: { body: [{ text: "Fill out my online form" }] } },
          { slice_type: "RichTextSection", primary: { body: [{ text: "The Dancer-Citizen supports the Creative Commons option" }] } },
        ],
      },
    }));

    expect(normalized.data.body).toHaveLength(3);
    expect(JSON.stringify(normalized.data.body)).not.toContain("Old Issue 15 copy");
  });
});

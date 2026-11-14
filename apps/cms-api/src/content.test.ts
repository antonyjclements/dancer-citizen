import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismicMock = vi.hoisted(() => ({
  client: undefined as any,
}));

vi.mock("./prismic", () => ({
  createPrismicClient: () => prismicMock.client,
}));

import {
  getArticle,
  getHome,
  getIssue,
  getMetadataForPath,
  getPage,
  getSummary,
  linkedTableOfContentsIDs,
  normalizeContentPage,
  stripLegacyHtml,
} from "./content";

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

function mockClient(overrides: Record<string, any> = {}) {
  prismicMock.client = {
    getByUID: vi.fn(),
    getAllByType: vi.fn(),
    getAllByIDs: vi.fn(),
    getAllBySomeTags: vi.fn(),
    ...overrides,
  };
  return prismicMock.client;
}

beforeEach(() => {
  mockClient();
});

// @spec:ISSUE-002
describe("issue listing dates", () => {
  const older = doc({ id: "20", uid: "issue-20", type: "issue_page", data: { issue_number: 20 } });
  const scheduled = doc({
    id: "21", uid: "issue-21", type: "issue_page",
    data: { issue_number: 21, list_on_site_from: "2026-11-12" },
  });
  const newer = doc({
    id: "22", uid: "issue-22", type: "issue_page",
    data: { issue_number: 22, list_on_site_from: null },
  });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-12T04:59:59Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("promotes the issue to the homepage at midnight Eastern on its listing date", async () => {
    mockClient({ getAllByType: vi.fn().mockResolvedValue([scheduled, older]) });

    const before = await getHome();
    expect(before.issues.map((issue) => issue.uid)).toEqual([older.uid]);
    expect(before.latestIssue?.uid).toBe(older.uid);

    vi.setSystemTime(new Date("2026-11-12T05:00:00Z"));
    const after = await getHome();
    expect(after.issues.map((issue) => issue.uid)).toEqual([scheduled.uid, older.uid]);
    expect(after.latestIssue?.uid).toBe(scheduled.uid);
  });

  it("skips future issues in public navigation but still loads them and their articles by URL", async () => {
    const article = doc({
      uid: "issue-21--essay", type: "article_page",
      data: { issue: { link_type: "Document", uid: scheduled.uid } },
    });
    mockClient({
      getByUID: vi.fn(async (_type, uid) => [older, scheduled, newer, article].find((entry) => entry.uid === uid)),
      getAllByType: vi.fn().mockResolvedValue([older, scheduled, newer]),
      getAllBySomeTags: vi.fn(async (tags) => tags.includes(scheduled.uid) ? [article] : []),
    });

    expect((await getIssue(older.uid)).nextIssue?.uid).toBe(newer.uid);
    expect((await getIssue(newer.uid)).previousIssue?.uid).toBe(older.uid);

    const direct = await getIssue(scheduled.uid);
    expect(direct.summary.href).toBe(`/issues/${scheduled.uid}`);
    expect(direct.tableOfContents.map((entry) => entry.href)).toEqual([`/articles/${article.uid}`]);
    expect(direct.previousIssue?.uid).toBe(older.uid);
    expect(direct.nextIssue?.uid).toBe(newer.uid);
    expect((await getArticle(article.uid)).issue?.uid).toBe(scheduled.uid);

    vi.setSystemTime(new Date("2026-11-12T05:00:00Z"));
    expect((await getIssue(newer.uid)).previousIssue?.uid).toBe(scheduled.uid);
  });

  it("shows scheduled issues in homepage and navigation previews", async () => {
    mockClient({
      getByUID: vi.fn().mockResolvedValue(older),
      getAllByType: vi.fn().mockResolvedValueOnce([scheduled, older]).mockResolvedValueOnce([older, scheduled]),
      getAllBySomeTags: vi.fn().mockResolvedValue([]),
    });
    const preview = { ref: "preview-ref" };

    expect((await getHome(preview)).latestIssue?.uid).toBe(scheduled.uid);
    expect((await getIssue(older.uid, preview)).nextIssue?.uid).toBe(scheduled.uid);
  });
});

// @spec:BOOK-001, BOOK-002
describe("book review listings", () => {
  const review = {
    title: "Moving in Public",
    link: { link_type: "Document", type: "article_page", uid: "moving-in-public" },
  };
  const listing = doc({
    uid: "book-reviews-issue-21",
    data: {
      title: "Book Reviews",
      body: [{
        slice_type: "BookReviews",
        primary: { heading: "Reviews" },
        items: [
          { ...review, title: "   " },
          {
            ...review,
            title: "<em>Moving in Public</em>",
            book_author: " Elena Reyes ",
            reviewer: "Maya Chen",
            summary: "Dance in civic life",
            image: { url: "https://images.prismic.io/moving.jpg", dimensions: { width: 400, height: 600 } },
          },
          { ...review, link: { ...review.link, isBroken: true } },
          { ...review, link: { ...review.link, type: "content_page" } },
          { ...review, link: { link_type: "Document" } },
          { title: "What the Body Keeps", link: { ...review.link, uid: "what-the-body-keeps" } },
        ],
      }],
    },
  });

  it("normalizes usable cards in editor order with canonical article links and optional media", async () => {
    const client = mockClient({ getByUID: vi.fn().mockResolvedValue(listing) });

    const result = await getPage(listing.uid);

    expect(result.summary.href).toBe("/book-reviews-issue-21");
    expect(result.page.data.body[0].items).toEqual([
      {
        href: "/articles/moving-in-public",
        title: "Moving in Public",
        bookAuthor: "Elena Reyes",
        reviewer: "Maya Chen",
        summary: "Dance in civic life",
        cover: { url: "https://images.prismic.io/moving.jpg", alt: "Moving in Public cover", dimensions: { width: 400, height: 600 } },
      },
      {
        href: "/articles/what-the-body-keeps",
        title: "What the Body Keeps",
        bookAuthor: "",
        reviewer: "",
        summary: "",
        cover: null,
      },
    ]);
    expect(client.getByUID).toHaveBeenCalledTimes(1);
  });

  it("resolves a review article's parent listing while preserving its issue navigation", async () => {
    const article = doc({
      type: "article_page",
      data: {
        issue: { link_type: "Document", uid: "issue-21" },
        parent_section: { link_type: "Document", type: "content_page", uid: listing.uid },
      },
    });
    const issue = doc({ type: "issue_page", uid: "issue-21", data: { issue_number: 21 } });
    mockClient({
      getByUID: vi.fn()
        .mockResolvedValueOnce(article)
        .mockResolvedValueOnce(issue)
        .mockResolvedValueOnce(listing),
      getAllBySomeTags: vi.fn().mockResolvedValue([listing]),
    });

    const result = await getArticle(article.uid);

    expect(result.reviewListing).toMatchObject({ href: "/book-reviews-issue-21", title: "Book Reviews" });
    expect(result.issue?.href).toBe("/issues/issue-21");
  });

  it("includes the listing in the issue table of contents as a content page", async () => {
    const issue = doc({
      type: "issue_page",
      uid: "issue-21",
      data: { issue_number: 21, body: [] },
    });
    const client = mockClient({
      getByUID: vi.fn().mockResolvedValue(issue),
      getAllByType: vi.fn().mockResolvedValue([issue]),
      getAllBySomeTags: vi.fn().mockResolvedValue([listing]),
    });

    expect((await getIssue(issue.uid)).tableOfContents).toMatchObject([
      { title: "Book Reviews", href: "/book-reviews-issue-21" },
    ]);
    expect(client.getAllBySomeTags).toHaveBeenCalledWith(["issue-21"], expect.anything());
  });

  it.each([
    { type: "article_page", body: [] },
    { type: "content_page", body: [] },
    { type: "content_page", body: [{ slice_type: "BookReviews", primary: { hide: true }, items: [review] }] },
    { type: "content_page", body: [{ slice_type: "BookReviews", items: [] }] },
  ])("keeps existing navigation for an inapplicable parent (%j)", async ({ type, body }) => {
    const article = doc({
      type: "article_page",
      data: { parent_section: { link_type: "Document", type, uid: listing.uid } },
    });
    mockClient({
      getByUID: vi.fn().mockResolvedValueOnce(article).mockResolvedValueOnce(doc({ data: { body } })),
    });

    expect((await getArticle(article.uid)).reviewListing).toBeNull();
  });
});

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

  it("derives route-shaped hrefs for every public journal document type", () => {
    expect(getSummary(doc({ type: "issue_page", uid: "issue-20" })).href).toBe("/issues/issue-20");
    expect(getSummary(doc({ type: "article_page", uid: "dance-civic-life" })).href).toBe("/articles/dance-civic-life");
    expect(getSummary(doc({ type: "content_page", uid: "about" })).href).toBe("/about");
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

  // @spec:ISSUE-003
  it("returns issue table of contents in linked document order and removes legacy LinkedTiles from issue body", async () => {
    const issue = doc({
      id: "issue",
      uid: "issue-20",
      type: "issue_page",
      data: {
        issue_number: 20,
        title: "Issue 20",
        body: [
          { slice_type: "RichTextSection", primary: { body: [{ text: "Intro" }] } },
          {
            slice_type: "LinkedTiles",
            items: [
              { link: { link_type: "Document", id: "b" } },
              { link: { link_type: "Document", id: "a" } },
            ],
          },
        ],
      },
    });
    const articleA = doc({ id: "a", uid: "alpha", type: "article_page", data: { title: "Alpha", tile_summary: "Tile summary" } });
    const articleB = doc({
      id: "b", uid: "bravo", type: "article_page",
      data: { hero_title: "Bravo", hero_subtitle: "Movement &amp; <em>memory</em>", tile_summary: "Tile summary" },
    });
    const client = mockClient({
      getByUID: vi.fn().mockResolvedValue(issue),
      getAllByType: vi.fn().mockResolvedValue([issue]),
      getAllByIDs: vi.fn().mockResolvedValue([articleA, articleB]),
    });

    const result = await getIssue("issue-20");

    expect(result.issue.data.body.map((slice: any) => slice.slice_type)).toEqual(["RichTextSection"]);
    expect(result.tableOfContents).toMatchObject([
      { uid: "bravo", title: "Bravo", subtitle: "Movement & memory" },
      { uid: "alpha", title: "Alpha", subtitle: "" },
    ]);
    expect(client.getAllByIDs).toHaveBeenCalledWith(["b", "a"]);
  });

  it("falls back to issue-tagged article and content documents when an issue has no linked order", async () => {
    const issue = doc({
      id: "issue",
      uid: "issue-20",
      type: "issue_page",
      data: { issue_number: 20, title: "Issue 20", body: [] },
    });
    const child = doc({ id: "child", uid: "essay", type: "article_page", data: { title: "Essay" } });
    const client = mockClient({
      getByUID: vi.fn().mockResolvedValue(issue),
      getAllByType: vi.fn().mockResolvedValue([issue]),
      getAllBySomeTags: vi.fn().mockResolvedValue([child]),
    });

    const result = await getIssue("issue-20");

    expect(result.tableOfContents.map((entry) => entry.href)).toEqual(["/articles/essay"]);
    expect(client.getAllBySomeTags).toHaveBeenCalledWith(["issue-20"], expect.objectContaining({
      orderings: [{ field: "document.first_publication_date", direction: "asc" }],
    }));
    expect(client.getAllBySomeTags.mock.calls[0][1].filters).toHaveLength(1);
  });

  it("uses curated issue order for article previous and next links, including content pages", async () => {
    const article = doc({
      id: "b",
      uid: "middle",
      type: "article_page",
      data: {
        title: "Middle",
        issue: { link_type: "Document", uid: "issue-20" },
      },
    });
    const issue = doc({
      id: "issue",
      uid: "issue-20",
      type: "issue_page",
      data: {
        issue_number: 20,
        title: "Issue 20",
        body: [{
          slice_type: "LinkedTiles",
          items: [
            { link: { link_type: "Document", id: "a" } },
            { link: { link_type: "Document", id: "b" } },
            { link: { link_type: "Document", id: "c" } },
          ],
        }],
      },
    });
    const previous = doc({ id: "a", uid: "about-the-contributors", type: "content_page", data: { title: "About the Contributors" } });
    const next = doc({ id: "c", uid: "next", type: "article_page", data: { title: "Next" } });
    mockClient({
      getByUID: vi.fn()
        .mockResolvedValueOnce(article)
        .mockResolvedValueOnce(issue),
      getAllByIDs: vi.fn().mockResolvedValue([previous, article, next]),
    });

    const result = await getArticle("middle");

    expect(result.issue?.href).toBe("/issues/issue-20");
    expect(result.previousArticle?.href).toBe("/about-the-contributors");
    expect(result.nextArticle?.href).toBe("/articles/next");
  });

  it("returns cleaned article metadata with image alt text for the HTML shell", async () => {
    const article = doc({
      id: "article",
      uid: "article",
      type: "article_page",
      data: {
        meta_title: "Dance &amp; <em>Public</em> Life",
        meta_description: [{ type: "paragraph", text: "A civic essay", spans: [] }],
        hero_image: {
          url: "https://images.prismic.io/article.jpg",
          alt: "",
          dimensions: { width: 1200, height: 630 },
        },
      },
    });
    mockClient({
      getByUID: vi.fn().mockResolvedValue(article),
    });

    const result = await getMetadataForPath("/articles/article");

    expect(result).toMatchObject({
      title: "Dance & Public Life",
      description: "A civic essay",
      canonicalPath: "/articles/article",
      type: "article",
    });
    expect(result.image?.alt).toBe("Dance & Public Life");
  });

  it("returns static metadata for app-only and pending-content routes without querying Prismic", async () => {
    const client = mockClient();

    await expect(getMetadataForPath("/admin")).resolves.toMatchObject({
      title: "Admin",
      canonicalPath: "/admin",
    });
    await expect(getMetadataForPath("/admin/submissions")).resolves.toMatchObject({
      title: "Submission Admin",
      canonicalPath: "/admin/submissions",
    });
    await expect(getMetadataForPath("/submissions/thank-you")).resolves.toMatchObject({
      title: "Thank You for Your Submission",
      canonicalPath: "/submissions/thank-you",
    });
    await expect(getMetadataForPath("/in-the-moment")).resolves.toMatchObject({
      title: "In the Moment",
      canonicalPath: "/in-the-moment",
    });
    expect(client.getByUID).not.toHaveBeenCalled();
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

  it("keeps submissions page body editable from Prismic", () => {
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

    expect(normalized.data.body).toHaveLength(4);
    expect(JSON.stringify(normalized.data.body)).toContain("Old Issue 15 copy");
    expect(JSON.stringify(normalized.data.body)).toContain("Fill out my online form");
  });

  it("links plain imported URL labels on content pages", () => {
    const normalized = normalizeContentPage(doc({
      uid: "about",
      data: {
        body: [{
          slice_type: "RichTextSection",
          primary: { body: [{ type: "paragraph", text: "Visit archive (https://example.com/archive)", spans: [] }] },
        }],
      },
    }));

    expect(normalized.data.body[0].primary.body[0].text).toBe("Visit archive");
    expect(normalized.data.body[0].primary.body[0].spans[0].data.url).toBe("https://example.com/archive");
  });

// @spec:BIO-001, BIO-002, EDITORS-001
  it("preserves CMS headings, list positions, and biography order on editors and staff", () => {
    const normalized = normalizeContentPage(doc({
      uid: "editors-staff",
      data: {
        body: [{
          slice_type: "BiographyList",
          primary: { heading: "Past Editors" },
          items: [
            { name: "Carly Knudson" },
            { name: "Jane Alexandre, PhD" },
            { name: "Takiyah Nur Amin, Ph.D." },
          ],
        }, {
          slice_type: "RichTextSection",
          primary: { body: [{ text: "Guest Editors" }] },
        }, {
          slice_type: "BiographyList",
          primary: { heading: "Editors" },
          items: [
            { name: "New Editor" },
            { name: "Emily Metzner" },
            { name: "Julie B. Johnson, PhD" },
            { name: "Erica Moshman" },
          ],
        }],
      },
    }));

    expect(normalized.data.body.map((slice: any) => slice.primary.heading)).toEqual([
      "Past Editors",
      undefined,
      "Editors",
    ]);
    expect(normalized.data.body[0].items.map((item: any) => item.name)).toEqual([
      "Carly Knudson",
      "Jane Alexandre, PhD",
      "Takiyah Nur Amin, Ph.D.",
    ]);
    expect(normalized.data.body[0].items[1]).toEqual({ name: "Jane Alexandre, PhD", inMemoriam: true });
    expect(normalized.data.body[1].primary.body).toEqual([{ text: "Guest Editors" }]);
    expect(normalized.data.body[2].items).toEqual([
      { name: "New Editor" },
      { name: "Emily Metzner" },
      { name: "Julie B. Johnson, PhD" },
      { name: "Erica Moshman" },
    ]);
  });

// @spec:BIO-003
  it("preserves existing single lists, duplicate names, and biography content", () => {
    const item = { name: "Unlisted Editor", summary: [{ type: "paragraph", text: "Biography" }], linked_article: { id: "article-1" }, image: { url: "https://example.com/photo.jpg" } };
    const page = doc({ uid: "editors-staff", data: { body: [{
      id: "original-list",
      slice_type: "BiographyList",
      primary: { heading: "Our Team" },
      items: [item, { ...item, summary: [] }],
    }] } });

    expect(normalizeContentPage(page)).toEqual(page);
  });

// @spec:BIO-003
  it("handles biography lists with missing headings or empty items without generating sections", () => {
    const page = doc({ uid: "editors-staff", data: { body: [
      { slice_type: "BiographyList", items: [{ name: "Editor" }] },
      { slice_type: "BiographyList", primary: { heading: "Future Editors" }, items: [] },
      { slice_type: "BiographyList", primary: { heading: "Another List" } },
    ] } });

    expect(normalizeContentPage(page)).toEqual(page);
  });
});

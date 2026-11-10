import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Slices } from "./Slices";

const projectRoot = new URL("../../../../", import.meta.url);
const contentPageModel = JSON.parse(readFileSync(new URL("customtypes/content_page/index.json", projectRoot), "utf8"));
const sliceTypes = Object.keys(contentPageModel.json.Main.body.config.choices);

function richText(text: string, hide?: unknown) {
  return {
    slice_type: "RichTextSection",
    primary: { hide, body: [{ type: "paragraph", text, spans: [] }] },
  };
}

describe("rich text sections", () => {
  it("renders the editor's Heading field above the body", () => {
    const slice = richText("Welcome to The Dancer-Citizen");
    const heading = "Originally published on November 15, 2015";
    const html = renderToStaticMarkup(<Slices slices={[{
      ...slice,
      primary: { ...slice.primary, heading },
    }]} />);

    expect(html).toContain(`<h2>${heading}</h2><p>Welcome to The Dancer-Citizen</p>`);
  });

  it.each([undefined, null, "", "   "])("renders only the body when Heading is blank (%s)", (heading) => {
    const slice = richText("Body copy");
    const html = renderToStaticMarkup(<Slices slices={[{
      ...slice,
      primary: { ...slice.primary, heading },
    }]} />);

    expect(html).toContain('<section class="rich-section"><p>Body copy</p></section>');
  });
});

describe("image galleries", () => {
  // @spec:GALLERY-001
  it("renders labeled thumbnail buttons in CMS order and skips empty entries", () => {
    const html = renderToStaticMarkup(<Slices slices={[{
      slice_type: "Gallery",
      primary: { heading: "Choreography notebook" },
      items: [
        { image: { url: "/first.jpg", alt: "First diagram" } },
        { image: {} },
        { image: { url: "/second.jpg" }, caption: [{ type: "paragraph", text: "Second diagram", spans: [] }] },
      ],
    }]} />);

    expect(html).toContain("<h2>Choreography notebook</h2>");
    expect(html.match(/aria-haspopup="dialog"/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Enlarge image 1: First diagram"');
    expect(html).toContain('aria-label="Enlarge image 2: Second diagram"');
    expect(html.indexOf("/first.jpg")).toBeLessThan(html.indexOf("/second.jpg"));
    expect(html).toContain('<dialog class="gallery-viewer"');
  });
});

// @spec:BOOK-001
describe("book review cards", () => {
  it("renders the editor's cards in order with full-card links and optional cover and metadata", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Slices slices={[{
          slice_type: "BookReviews",
          primary: { heading: "From this issue" },
          items: [
            {
              title: "Moving in Public", href: "/articles/moving-in-public", bookAuthor: "Elena Reyes",
              reviewer: "Maya Chen", summary: "Dance in civic life",
              cover: { url: "/moving.jpg", alt: "Moving in Public cover", dimensions: { width: 400, height: 600 } },
            },
            { title: "What the Body Keeps", href: "/articles/what-the-body-keeps", cover: null },
          ],
        }]} />
      </MemoryRouter>,
    );

    expect(html).toContain("<h2>From this issue</h2>");
    expect(html).toMatch(/href="\/articles\/moving-in-public"[^>]*>.*<img[^>]*alt="Moving in Public cover".*<h3>Moving in Public<\/h3>.*Read the review.*<\/a>/);
    expect(html).toContain('href="/articles/what-the-body-keeps"');
    expect(html.indexOf("Moving in Public")).toBeLessThan(html.indexOf("What the Body Keeps"));
    expect(html).toContain("A book by Elena Reyes");
    expect(html).toContain("Reviewed by Maya Chen");
    expect(html).toContain("Dance in civic life");
    expect(html.match(/<img /g)).toHaveLength(1);
  });

  it("renders no review section for an empty list", () => {
    const html = renderToStaticMarkup(<Slices slices={[{
      slice_type: "BookReviews", primary: { heading: "From this issue" }, items: [],
    }]} />);

    expect(html).not.toContain("From this issue");
    expect(html).not.toContain("Pending slice");
  });
});

// @spec:SLICE-001
describe("slice visibility", () => {
  it.each(sliceTypes)("exposes Hide with a visible default on %s", (type) => {
    const model = JSON.parse(readFileSync(new URL(`slices/${type}/model.json`, projectRoot), "utf8"));
    for (const variation of model.variations) {
      expect(variation.primary.hide).toEqual({
        type: "Boolean",
        config: { label: "Hide", default_value: false },
      });
    }
  });

  it.each(sliceTypes)("omits all markup for a hidden %s", (slice_type) => {
    const html = renderToStaticMarkup(<Slices slices={[{ slice_type, primary: { hide: true } }]} />);
    expect(html).toBe("");
  });

  it("preserves visible sibling order and restores content when Hide is false", () => {
    const slices = [richText("Before"), richText("Hidden", true), richText("After", false)];
    const html = renderToStaticMarkup(<Slices slices={slices} />);
    expect(html).toContain("<p>Before</p>");
    expect(html).toContain("<p>After</p>");
    expect(html).not.toContain("Hidden");
    expect(html.indexOf("Before")).toBeLessThan(html.indexOf("After"));

    slices[1].primary.hide = false;
    const restored = renderToStaticMarkup(<Slices slices={slices} />);
    expect(restored.indexOf("Before")).toBeLessThan(restored.indexOf("Hidden"));
    expect(restored.indexOf("Hidden")).toBeLessThan(restored.indexOf("After"));
  });

  it.each([false, undefined, null, "true", 1])("renders unless Hide is Boolean true (%s)", (hide) => {
    expect(renderToStaticMarkup(<Slices slices={[richText("Visible", hide)]} />)).toContain("<p>Visible</p>");
  });

  it("renders legacy slices without primary fields and hides unknown slice fallbacks", () => {
    expect(renderToStaticMarkup(<Slices slices={[{ slice_type: "Gallery" }]} />)).toContain('class="gallery"');
    expect(renderToStaticMarkup(<Slices slices={[{ slice_type: "FutureSlice", primary: { hide: true } }]} />)).toBe("");
  });

  it.each([undefined, []])("renders no markup for an empty slice zone (%s)", (slices) => {
    expect(renderToStaticMarkup(<Slices slices={slices} />)).toBe("");
  });
});

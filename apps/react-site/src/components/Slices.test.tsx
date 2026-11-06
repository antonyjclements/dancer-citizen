import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
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

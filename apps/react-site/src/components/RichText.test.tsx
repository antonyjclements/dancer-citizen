import type { RichTextField } from "@prismicio/client";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { RichText, RichTextEmbedsEnabled } from "./RichText";

// @spec:PREV-002
it("renders draft text without inserting raw embed markup in the simulator", () => {
  const field: RichTextField = [
    { type: "paragraph", text: "Draft paragraph", spans: [] },
    {
      type: "embed",
      oembed: {
        type: "rich",
        version: "1.0",
        width: 400,
        height: 300,
        embed_url: "https://example.com/embed",
        html: '<div id="embed-content">External content</div>',
      },
    },
  ];

  const published = renderToStaticMarkup(<RichText field={field} />);
  const preview = renderToStaticMarkup(
    <RichTextEmbedsEnabled.Provider value={false}>
      <RichText field={field} />
    </RichTextEmbedsEnabled.Provider>,
  );

  expect(published).toContain('id="embed-content"');
  expect(preview).toContain("<p>Draft paragraph</p>");
  expect(preview).not.toContain('id="embed-content"');
});

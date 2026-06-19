/* eslint-disable @typescript-eslint/no-require-imports */
const { createSliceMachineManager } = require("@slicemachine/manager");

const VERSION = "initial";
const DOC_URL = "https://prismic.io/docs/slices";
const LIBRARY_ID = "slices";

function textField(label, placeholder = "") {
  return {
    type: "Text",
    config: {
      label,
      placeholder,
    },
  };
}

function richTextField(
  label,
  multi = "paragraph,strong,em,hyperlink,list-item,o-list-item,heading2,heading3",
) {
  return {
    type: "StructuredText",
    config: {
      label,
      multi,
    },
  };
}

function imageField(label) {
  return {
    type: "Image",
    config: {
      label,
    },
  };
}

function booleanField(label, defaultValue = false) {
  return {
    type: "Boolean",
    config: {
      label,
      default_value: defaultValue,
    },
  };
}

function linkField(label, select = "document") {
  return {
    type: "Link",
    config: {
      label,
      select,
    },
  };
}

function embedField(label) {
  return {
    type: "Embed",
    config: {
      label,
    },
  };
}

function createSliceModel(id, name, description, primary = {}, items = {}) {
  return {
    id,
    type: "SharedSlice",
    name,
    description,
    variations: [
      {
        id: "default",
        name: "Default",
        description,
        docURL: DOC_URL,
        version: VERSION,
        primary,
        items,
      },
    ],
  };
}

const sliceModels = [
  createSliceModel("RichTextSection", "RichTextSection", "Section heading and body copy", {
    heading: textField("Heading", "Section heading"),
    body: richTextField("Body"),
  }),
  createSliceModel("LinkedTiles", "LinkedTiles", "Grid of linked internal documents", {
    heading: textField("Heading", "Section heading"),
  }, {
    title: textField("Title", "Tile title"),
    summary: richTextField("Summary", "paragraph,strong,em,hyperlink"),
    link: linkField("Link"),
    image: imageField("Image"),
  }),
  createSliceModel("BiographyList", "BiographyList", "Contributor biographies with optional related article", {
    heading: textField("Heading", "Section heading"),
  }, {
    name: textField("Name", "Contributor name"),
    summary: richTextField("Summary"),
    image: imageField("Image"),
    linked_article: linkField("Linked article"),
  }),
  createSliceModel("ContributorList", "ContributorList", "Issue contributor cards with metadata and links", {
    heading: textField("Heading", "Section heading"),
  }, {
    title_link: textField("Title link", "Primary linked title"),
    issue: textField("Issue", "Issue label"),
    thumbnail: imageField("Thumbnail"),
    body_text: richTextField("Body text"),
    link_label: textField("Link label", "Optional link label"),
    link: linkField("Link", "web"),
  }),
  createSliceModel("Quote", "Quote", "Pull quote with optional attribution", {
    quote: richTextField("Quote", "paragraph,strong,em,hyperlink"),
    attribution: textField("Attribution", "Quote source"),
    centered: booleanField("Centered", false),
  }),
  createSliceModel("Image", "Image", "Standalone image with caption and credit", {
    image: imageField("Image"),
    caption: richTextField("Caption", "paragraph,strong,em,hyperlink"),
    credit: richTextField("Credit", "paragraph,strong,em,hyperlink"),
    anchor: textField("Anchor", "Optional anchor id"),
  }),
  createSliceModel("Gallery", "Gallery", "Image gallery", {
    heading: textField("Heading", "Gallery heading"),
  }, {
    image: imageField("Image"),
    caption: richTextField("Caption", "paragraph,strong,em,hyperlink"),
    credit: richTextField("Credit", "paragraph,strong,em,hyperlink"),
    anchor: textField("Anchor", "Optional anchor id"),
  }),
  createSliceModel("VideoEmbed", "VideoEmbed", "Embedded video with metadata", {
    embed_url: textField("Embed URL", "https://..."),
    caption: richTextField("Caption", "paragraph,strong,em,hyperlink"),
    credit: richTextField("Credit", "paragraph,strong,em,hyperlink"),
    use_in_hero: booleanField("Use in hero", false),
  }),
  createSliceModel("FileLink", "FileLink", "Downloadable file or media link", {
    title: textField("Title", "File title"),
    description: richTextField("Description", "paragraph,strong,em,hyperlink"),
    file: linkField("File", "media"),
  }),
  createSliceModel("FormEmbed", "FormEmbed", "Embedded form code", {
    title: textField("Title", "Form title"),
    embed: embedField("Embed"),
  }),
];

async function main() {
  const manager = createSliceMachineManager();
  await manager.plugins.initPlugins();

  for (const model of sliceModels) {
    console.log(`Upserting ${model.id}...`);

    const existing = await manager.slices.readSlice({
      libraryID: LIBRARY_ID,
      sliceID: model.id,
    });

    if (existing.model) {
      await manager.slices.updateSlice({
        libraryID: LIBRARY_ID,
        model,
      });
    } else {
      await manager.slices.createSlice({
        libraryID: LIBRARY_ID,
        model,
      });
    }
  }

  for (const model of sliceModels) {
    console.log(`Pushing ${model.id}...`);
    const result = await manager.slices.pushSlice({
      libraryID: LIBRARY_ID,
      sliceID: model.id,
    });

    if (result.errors.length > 0) {
      throw new Error(
        `Push errors for ${model.id}: ${result.errors.map((error) => error.message).join(", ")}`,
      );
    }
  }

  console.log(`Created and pushed ${sliceModels.length} slices.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});

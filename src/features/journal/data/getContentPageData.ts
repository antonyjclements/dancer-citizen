import type { Content, RichTextField } from "@prismicio/client";
import { notFound } from "next/navigation";
import { createClient } from "@/foundation/prismic/prismicClient";

type ContentBodySlice =
  | Content.BiographyListSlice
  | Content.ContributorListSlice
  | Content.FileLinkSlice
  | Content.FormEmbedSlice
  | Content.GallerySlice
  | Content.ImageSlice
  | Content.LinkedTilesSlice
  | Content.QuoteSlice
  | Content.RichTextSectionSlice
  | Content.VideoEmbedSlice;
type ContentDocument = Omit<Content.ContentPageDocument, "data" | "uid" | "tags"> & {
  data: Omit<Content.ContentPageDocument["data"], "body"> & {
    body: ContentBodySlice[];
  };
  uid: string;
  tags: string[];
};

export type ContentPageData = {
  page: ContentDocument;
};

function getRichTextSectionText(slice: ContentBodySlice) {
  if (slice.slice_type !== "RichTextSection") {
    return "";
  }

  return slice.primary.body.map((node) => ("text" in node ? node.text : "")).join("\n");
}

function getLinkedSubmissionsFormBody(): RichTextField {
  const text = "Fill out my online form.";
  const linkStart = text.indexOf("online form");

  return [
    {
      type: "paragraph",
      text,
      spans: [
        {
          type: "hyperlink",
          start: linkStart,
          end: linkStart + "online form".length,
          data: {
            link_type: "Web",
            url: "https://thedancercitizen.wufoo.com/forms/prrnm6x0iu6wyv",
          },
        },
      ],
    },
  ] as RichTextField;
}

function normalizeSubmissionsBody(body: ContentDocument["data"]["body"]): ContentDocument["data"]["body"] {
  const currentCall = body.find((slice) =>
    getRichTextSectionText(slice).includes("We are now accepting submissions for Issue 20"),
  );
  const formLink = body.find((slice) =>
    getRichTextSectionText(slice).includes("Fill out my online form"),
  );
  const licensing = body.find((slice) =>
    getRichTextSectionText(slice).includes("The Dancer-Citizen supports the Creative Commons option"),
  );

  return [currentCall, formLink, licensing]
    .filter((slice): slice is ContentBodySlice => Boolean(slice))
    .map((slice) => {
      if (slice === formLink && slice.slice_type === "RichTextSection") {
        return {
          ...slice,
          primary: {
            ...slice.primary,
            body: getLinkedSubmissionsFormBody(),
          },
        };
      }

      if (slice === licensing && slice.slice_type === "RichTextSection") {
        return {
          ...slice,
          primary: {
            ...slice.primary,
            body: slice.primary.body.filter((node) =>
              !("text" in node) || !node.text.startsWith("This work is licensed under CC BY-NC-ND 4.0"),
            ),
          },
        };
      }

      return slice;
    }) as ContentDocument["data"]["body"];
}

function getLinkedSupportDonationBody(): RichTextField {
  const text = "Donate";

  return [
    {
      type: "paragraph",
      text,
      spans: [
        {
          type: "hyperlink",
          start: 0,
          end: text.length,
          data: {
            link_type: "Web",
            target: "_blank",
            url: "https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=UUTLCCFNSRGWC",
          },
        },
      ],
    },
  ] as RichTextField;
}

function normalizeSupportBody(body: ContentDocument["data"]["body"]): ContentDocument["data"]["body"] {
  return body.map((slice) => {
    if (slice.slice_type !== "RichTextSection") {
      return slice;
    }

    return {
      ...slice,
      primary: {
        ...slice.primary,
        body: slice.primary.body.map((node) => {
          if (!("text" in node) || !node.text.startsWith("Donate (https://www.paypal.com/")) {
            return node;
          }

          return getLinkedSupportDonationBody()[0];
        }),
      },
    };
  }) as ContentDocument["data"]["body"];
}

function normalizeContentPage(page: ContentDocument): ContentDocument {
  if (page.uid === "submissions") {
    return {
      ...page,
      data: {
        ...page.data,
        body: normalizeSubmissionsBody(page.data.body),
      },
    };
  }

  if (page.uid === "support-us") {
    return {
      ...page,
      data: {
        ...page.data,
        body: normalizeSupportBody(page.data.body),
      },
    };
  }

  return page;
}

export async function getContentPageData(uid: string): Promise<ContentPageData> {
  const client = createClient();
  const page = await client.getByUID("content_page", uid).catch(() => notFound()) as unknown as ContentDocument;

  return { page: normalizeContentPage(page) };
}

import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { getMetadataForPath } from "./content";
import { htmlResponse } from "./http";
import { getPreviewRefFromCookies } from "./preview";

const defaultIndexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>The Dancer-Citizen</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function metaTags(siteUrl: string, path: string, meta: Awaited<ReturnType<typeof getMetadataForPath>>): string {
  const canonicalUrl = new URL(meta.canonicalPath || path || "/", siteUrl).toString();
  const imageTags = meta.image ? `
    <meta property="og:image" content="${escapeAttribute(meta.image.url)}" />
    <meta property="og:image:alt" content="${escapeAttribute(meta.image.alt)}" />
    <meta name="twitter:image" content="${escapeAttribute(meta.image.url)}" />` : "";

  return `
    <title>${escapeAttribute(meta.title)}</title>
    <meta name="description" content="${escapeAttribute(meta.description)}" />
    <link rel="canonical" href="${escapeAttribute(canonicalUrl)}" />
    <meta property="og:site_name" content="The Dancer-Citizen" />
    <meta property="og:type" content="${meta.type}" />
    <meta property="og:title" content="${escapeAttribute(meta.title)}" />
    <meta property="og:description" content="${escapeAttribute(meta.description)}" />
    <meta property="og:url" content="${escapeAttribute(canonicalUrl)}" />
    <meta name="twitter:card" content="${meta.image ? "summary_large_image" : "summary"}" />
    <meta name="twitter:title" content="${escapeAttribute(meta.title)}" />
    <meta name="twitter:description" content="${escapeAttribute(meta.description)}" />${imageTags}`;
}

function injectHead(indexHtml: string, tags: string): string {
  return indexHtml
    .replace(/<title>.*?<\/title>/, "")
    .replace("</head>", `${tags}\n  </head>`);
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  const path = event.rawPath || "/";
  const ref = getPreviewRefFromCookies(event);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://dancercitizen.org";
  const indexHtml = process.env.INDEX_HTML || defaultIndexHtml;

  try {
    const meta = await getMetadataForPath(path, { ref });
    return htmlResponse(200, injectHead(indexHtml, metaTags(siteUrl, path, meta)), ref ? { "cache-control": "no-store" } : {});
  } catch (error) {
    console.error(error);
    return htmlResponse(404, injectHead(indexHtml, metaTags(siteUrl, path, {
      title: "Page not found",
      description: "The requested Dancer-Citizen page could not be found.",
      canonicalPath: path,
      type: "website",
      image: null,
    })), { "cache-control": "no-store" });
  }
}

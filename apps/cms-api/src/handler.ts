import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { asLink } from "@prismicio/client";
import { getArticle, getHome, getIssue, getMetadataForPath, getPage } from "./content";
import { jsonResponse, notFoundResponse } from "./http";
import { clearPreviewCookie, createPreviewCookie, getPreviewRefFromCookies } from "./preview";
import { createPrismicClient } from "./prismic";

function pathParts(path: string): string[] {
  return path.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
}

function previewContext(event: APIGatewayProxyEventV2) {
  return { ref: getPreviewRefFromCookies(event) };
}

function noStoreHeaders(event: APIGatewayProxyEventV2): Record<string, string> {
  return getPreviewRefFromCookies(event) ? { "cache-control": "no-store" } : {};
}

async function startPreview(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  const token = event.queryStringParameters?.token;
  const documentId = event.queryStringParameters?.documentId;

  if (!token) {
    return jsonResponse(400, { error: "Missing Prismic preview token" }, { "cache-control": "no-store" });
  }

  const client = createPrismicClient();
  const redirectPath = await client.resolvePreviewURL({
    previewToken: token,
    documentID: documentId,
    defaultURL: "/",
  }).catch(() => token);
  const location = typeof redirectPath === "string" && redirectPath.startsWith("/") ? redirectPath : "/";

  return {
    statusCode: 302,
    headers: {
      location,
      "cache-control": "no-store",
    },
    cookies: [createPreviewCookie(token)],
  };
}

function exitPreview(): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: 302,
    headers: {
      location: "/",
      "cache-control": "no-store",
    },
    cookies: [clearPreviewCookie()],
  };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  const parts = pathParts(event.rawPath);
  const cmsIndex = parts[0] === "cms" ? 1 : 0;
  const resource = parts[cmsIndex];
  const uid = parts[cmsIndex + 1];
  const context = previewContext(event);

  try {
    if (resource === "home") {
      return jsonResponse(200, await getHome(context), noStoreHeaders(event));
    }

    if (resource === "issues" && uid) {
      return jsonResponse(200, await getIssue(uid, context), noStoreHeaders(event));
    }

    if (resource === "articles" && uid) {
      return jsonResponse(200, await getArticle(uid, context), noStoreHeaders(event));
    }

    if (resource === "pages" && uid) {
      return jsonResponse(200, await getPage(uid, context), noStoreHeaders(event));
    }

    if (resource === "meta") {
      const path = event.queryStringParameters?.path || "/";
      return jsonResponse(200, await getMetadataForPath(path, context), noStoreHeaders(event));
    }

    if (resource === "preview" && uid === "start") {
      return startPreview(event);
    }

    if (resource === "preview" && uid === "exit") {
      return exitPreview();
    }

    return notFoundResponse();
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && error.status === 404) {
      return notFoundResponse();
    }

    console.error(error);
    return jsonResponse(500, { error: "Internal server error" }, { "cache-control": "no-store" });
  }
}

export async function resolvePrismicLink(document: unknown): Promise<string | null> {
  return asLink(document as Parameters<typeof asLink>[0]) ?? null;
}

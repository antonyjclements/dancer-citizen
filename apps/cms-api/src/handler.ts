import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { asLink } from "@prismicio/client";
import { getArticle, getHome, getIssue, getMetadataForPath, getPage } from "./content";
import { jsonResponse, notFoundResponse } from "./http";
import { clearPreviewCookie, createPreviewCookie, getPreviewRefFromCookies } from "./preview";
import { createPrismicClient } from "./prismic";
import { createSubmission } from "./submissions";
import { getSubmissionDetail, getSubmissionDownload, listSubmissions, loginAdmin, logoutAdmin } from "./admin";

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
  let redirectPath: string;
  try {
    redirectPath = await client.resolvePreviewURL({
      previewToken: token,
      documentID: documentId,
      defaultURL: "/",
    });
  } catch {
    return jsonResponse(400, { error: "Preview could not be opened. Start a new preview from Prismic." }, { "cache-control": "no-store" });
  }
  const location = redirectPath.startsWith("/") && !redirectPath.startsWith("//") && !/[\\\r\n]/.test(redirectPath)
    ? redirectPath : "/";

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
  const method = event.requestContext.http?.method || "GET";

  try {
    if (resource === "admin" && uid === "login" && method === "POST") {
      return await loginAdmin(event);
    }

    if (resource === "admin" && uid === "logout" && method === "POST") {
      return logoutAdmin(event);
    }

    if (resource === "admin" && uid === "submissions" && method === "GET" && !parts[cmsIndex + 2]) {
      return await listSubmissions(event);
    }

    if (resource === "admin" && uid === "submissions" && method === "GET" && parts[cmsIndex + 2] && parts[cmsIndex + 3] === "file") {
      return await getSubmissionDownload(event, parts[cmsIndex + 2]);
    }

    if (resource === "admin" && uid === "submissions" && method === "GET" && parts[cmsIndex + 2]) {
      return await getSubmissionDetail(event, parts[cmsIndex + 2]);
    }

    if (resource === "submissions" && method === "POST") {
      if (process.env.SITE_ENVIRONMENT === "staging") {
        // CloudFront's SPA fallback rewrites 403 responses to the HTML shell.
        return jsonResponse(405, { errors: ["Submissions are disabled on this staging site."] }, { "cache-control": "no-store", allow: "OPTIONS" });
      }
      return await createSubmission(event);
    }

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

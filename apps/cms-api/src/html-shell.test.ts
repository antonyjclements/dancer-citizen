import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { APIGatewayProxyEventV2 } from "aws-lambda";

const contentMock = vi.hoisted(() => ({
  getMetadataForPath: vi.fn(),
}));

vi.mock("./content", () => ({
  getMetadataForPath: contentMock.getMetadataForPath,
}));

import { handler } from "./html-shell";

function event(path: string, cookies: string[] = []): APIGatewayProxyEventV2 {
  return {
    rawPath: path,
    cookies,
  } as APIGatewayProxyEventV2;
}

describe("html shell metadata", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.SITE_URL = "https://example.org";
    process.env.INDEX_HTML = `<!doctype html><html lang="en"><head><title>Generic React Shell</title></head><body><div id="root"></div></body></html>`;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("injects escaped route metadata and replaces the generic shell title", async () => {
    contentMock.getMetadataForPath.mockResolvedValue({
      title: "Dance & <Civic> \"Life\"",
      description: "A route-specific article description",
      canonicalPath: "/articles/civic",
      type: "article",
      image: {
        url: "https://images.example.org/civic.jpg",
        alt: "Dancer Citizen article image",
      },
    });

    const result = await handler(event("/articles/civic"));

    expect(result.statusCode).toBe(200);
    expect(result.body).toContain("<title>Dance &amp; &lt;Civic> &quot;Life&quot;</title>");
    expect(result.body).not.toContain("Generic React Shell");
    expect(result.body).toContain('<meta property="og:type" content="article" />');
    expect(result.body).toContain('<link rel="canonical" href="https://example.org/articles/civic" />');
    expect(result.body).toContain('<meta property="og:image:alt" content="Dancer Citizen article image" />');
    expect(contentMock.getMetadataForPath).toHaveBeenCalledWith("/articles/civic", { ref: undefined });
  });

  it("redirects legacy issue article URLs before metadata lookup", async () => {
    const result = await handler({
      rawPath: "/issue-13/akari-komura/",
      rawQueryString: "utm_source=archive",
    } as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(301);
    expect(result.headers?.location).toBe("/articles/issue-13--akari-komura?utm_source=archive");
    expect(contentMock.getMetadataForPath).not.toHaveBeenCalled();
  });

  it("returns no-store not-found shell metadata when metadata lookup fails", async () => {
    contentMock.getMetadataForPath.mockRejectedValue(new Error("missing"));

    const result = await handler(event("/missing"));

    expect(result.statusCode).toBe(404);
    expect(result.headers?.["cache-control"]).toBe("no-store");
    expect(result.body).toContain("<title>Page not found</title>");
  });

  it("passes preview refs to metadata lookup and disables cache for preview HTML", async () => {
    contentMock.getMetadataForPath.mockResolvedValue({
      title: "Preview Page",
      description: "Preview description",
      canonicalPath: "/about",
      type: "website",
      image: null,
    });

    const result = await handler(event("/about", ["dc_prismic_ref=preview-ref"]));

    expect(result.statusCode).toBe(200);
    expect(result.headers?.["cache-control"]).toBe("no-store");
    expect(contentMock.getMetadataForPath).toHaveBeenCalledWith("/about", { ref: "preview-ref" });
  });
});

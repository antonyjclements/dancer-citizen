import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolvePreviewURL: vi.fn(),
  getHome: vi.fn(),
  getIssue: vi.fn(),
  getArticle: vi.fn(),
  getPage: vi.fn(),
  getMetadataForPath: vi.fn(),
  createSubmission: vi.fn(),
}));

vi.mock("./prismic", () => ({ createPrismicClient: () => ({ resolvePreviewURL: mocks.resolvePreviewURL }) }));
vi.mock("./content", () => ({
  getHome: mocks.getHome,
  getIssue: mocks.getIssue,
  getArticle: mocks.getArticle,
  getPage: mocks.getPage,
  getMetadataForPath: mocks.getMetadataForPath,
}));
vi.mock("./submissions", () => ({ createSubmission: mocks.createSubmission }));
vi.mock("./admin", () => ({}));

import { handler } from "./handler";

function event(path: string, overrides: Partial<APIGatewayProxyEventV2> = {}): APIGatewayProxyEventV2 {
  return {
    rawPath: path,
    headers: {},
    requestContext: { http: { method: "GET" } },
    ...overrides,
  } as APIGatewayProxyEventV2;
}

// @spec:PREV-001
describe("Prismic preview sessions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("SITE_ENVIRONMENT", "production");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("requires a token without creating a preview cookie", async () => {
    const result = await handler(event("/cms/preview/start"));
    expect(result.statusCode).toBe(400);
    expect(result.headers?.["cache-control"]).toBe("no-store");
    expect(result.cookies).toBeUndefined();
    expect(mocks.resolvePreviewURL).not.toHaveBeenCalled();
  });

  it("resolves a saved draft and sets a secure host-scoped preview cookie", async () => {
    const token = "https://dancercitizen.prismic.io/previews/draft?token=example";
    mocks.resolvePreviewURL.mockResolvedValue("/articles/draft");
    const result = await handler(event("/cms/preview/start", {
      queryStringParameters: { token, documentId: "draft-document" },
    }));
    expect(mocks.resolvePreviewURL).toHaveBeenCalledWith({
      previewToken: token, documentID: "draft-document", defaultURL: "/",
    });
    expect(result.statusCode).toBe(302);
    expect(result.headers).toEqual({ location: "/articles/draft", "cache-control": "no-store" });
    expect(result.cookies).toEqual([
      `dc_prismic_ref=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1800`,
    ]);
    expect(result.cookies?.[0]).not.toContain("Domain=");
  });

  it("reports invalid or expired previews without silently showing published content", async () => {
    mocks.resolvePreviewURL.mockRejectedValue(new Error("expired token"));
    const result = await handler(event("/cms/preview/start", { queryStringParameters: { token: "expired", documentId: "draft" } }));
    expect(result.statusCode).toBe(400);
    expect(result.headers?.["cache-control"]).toBe("no-store");
    expect(result.cookies).toBeUndefined();
    expect(result.body).toContain("Start a new preview from Prismic");
  });

  it.each(["https://other.example/", "//other.example/", "/\\other.example/", "/\r\nLocation: https://other.example/"])(
    "keeps a preview redirect within the site: %s", async (destination) => {
      mocks.resolvePreviewURL.mockResolvedValue(destination);
      const result = await handler(event("/cms/preview/start", { queryStringParameters: { token: "preview" } }));
      expect(result.headers?.location).toBe("/");
    },
  );

  it.each([
    ["/cms/issues/draft", "getIssue"],
    ["/cms/articles/draft", "getArticle"],
    ["/cms/pages/draft", "getPage"],
  ] as const)("passes the preview ref and disables caching for %s", async (path, loader) => {
    mocks[loader].mockResolvedValue({ title: "Draft title" });
    const result = await handler(event(path, { cookies: ["dc_prismic_ref=draft%2Bref"] }));
    expect(mocks[loader]).toHaveBeenCalledWith("draft", { ref: "draft+ref" });
    expect(result.headers?.["cache-control"]).toBe("no-store");
    expect(result.body).toContain("Draft title");
  });

  it("uses published content in a separate session without a preview cookie", async () => {
    mocks.getHome.mockResolvedValue({ issues: [] });
    const result = await handler(event("/cms/home"));
    expect(mocks.getHome).toHaveBeenCalledWith({ ref: undefined });
    expect(result.headers?.["cache-control"]).toContain("public");
  });

  it("passes preview refs to the home page and metadata API", async () => {
    mocks.getHome.mockResolvedValue({ issues: [] });
    mocks.getMetadataForPath.mockResolvedValue({ title: "Draft metadata" });
    const home = await handler(event("/cms/home", { cookies: ["dc_prismic_ref=draft"] }));
    const meta = await handler(event("/cms/meta", { cookies: ["dc_prismic_ref=draft"], queryStringParameters: { path: "/articles/draft" } }));
    expect(mocks.getHome).toHaveBeenCalledWith({ ref: "draft" });
    expect(mocks.getMetadataForPath).toHaveBeenCalledWith("/articles/draft", { ref: "draft" });
    expect(home.headers?.["cache-control"]).toBe("no-store");
    expect(meta.headers?.["cache-control"]).toBe("no-store");
  });

  it("clears the cookie and redirects home when exiting preview", async () => {
    const result = await handler(event("/cms/preview/exit"));
    expect(result.statusCode).toBe(302);
    expect(result.headers).toEqual({ location: "/", "cache-control": "no-store" });
    expect(result.cookies).toEqual(["dc_prismic_ref=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"]);
  });

// @spec:STAGE-003
  it("rejects staging submission writes before storage or notification code runs", async () => {
    vi.stubEnv("SITE_ENVIRONMENT", "staging");
    const result = await handler(event("/cms/submissions", { requestContext: { http: { method: "POST" } } as APIGatewayProxyEventV2["requestContext"] }));
    expect(result.statusCode).toBe(405);
    expect(result.headers?.allow).toBe("OPTIONS");
    expect(result.headers?.["cache-control"]).toBe("no-store");
    expect(result.body).toContain("Submissions are disabled");
    expect(mocks.createSubmission).not.toHaveBeenCalled();
  });

// @spec:STAGE-003
  it("preserves production submission handling", async () => {
    mocks.createSubmission.mockResolvedValue({ statusCode: 201, body: "created" });
    const request = event("/cms/submissions", { requestContext: { http: { method: "POST" } } as APIGatewayProxyEventV2["requestContext"] });
    const result = await handler(request);
    expect(result.statusCode).toBe(201);
    expect(mocks.createSubmission).toHaveBeenCalledWith(request);
  });
});

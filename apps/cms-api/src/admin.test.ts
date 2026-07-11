import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const aws = vi.hoisted(() => ({
  send: vi.fn(),
  signedUrl: vi.fn(),
}));

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: vi.fn(() => ({ send: aws.send })),
  GetItemCommand: class {
    readonly commandName = "GetItemCommand";
    readonly input: any;

    constructor(input: any) {
      this.input = input;
    }
  },
  ScanCommand: class {
    readonly commandName = "ScanCommand";
    readonly input: any;

    constructor(input: any) {
      this.input = input;
    }
  },
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(() => ({ send: aws.send })),
  GetObjectCommand: class {
    readonly commandName = "GetObjectCommand";
    readonly input: any;

    constructor(input: any) {
      this.input = input;
    }
  },
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: aws.signedUrl,
}));

import { getSubmissionDetail, getSubmissionDownload, listSubmissions, loginAdmin } from "./admin";

function passwordHash(value: string) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function event(overrides: Partial<APIGatewayProxyEventV2> = {}): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: "$default",
    rawPath: "/cms/admin",
    rawQueryString: "",
    headers: {},
    requestContext: {
      accountId: "test",
      apiId: "test",
      domainName: "example.test",
      domainPrefix: "example",
      http: {
        method: "GET",
        path: "/cms/admin",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "vitest",
      },
      requestId: "test-request",
      routeKey: "$default",
      stage: "$default",
      time: "01/Jan/2026:00:00:00 +0000",
      timeEpoch: 1767225600000,
    },
    ...overrides,
  } as APIGatewayProxyEventV2;
}

function loginEvent(username = "editor", password = "correct-password") {
  return event({
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
    requestContext: {
      ...event().requestContext,
      http: { ...event().requestContext.http, method: "POST" },
    },
  });
}

async function adminCookie() {
  const response = await loginAdmin(loginEvent());
  const cookie = response.cookies?.[0].split(";")[0];
  if (!cookie) throw new Error("expected admin cookie");
  return cookie;
}

function item(overrides: Record<string, any> = {}) {
  return {
    submissionId: { S: "submission-1" },
    submittedAt: { S: "2026-07-10T12:00:00.000Z" },
    updatedAt: { S: "2026-07-10T12:01:00.000Z" },
    status: { S: "notified" },
    name: { S: "Ada Lovelace" },
    email: { S: "ada@example.com" },
    title: { S: "Dancing Systems" },
    abstract: { S: "A short abstract." },
    videoUrl: { S: "https://example.com/video" },
    date: { S: "2026-07-10" },
    file: { M: {
      bucket: { S: "submission-files" },
      key: { S: "submissions/submission-1/paper.pdf" },
      filename: { S: "paper.pdf" },
      contentType: { S: "application/pdf" },
      size: { N: "128" },
    } },
    ...overrides,
  };
}

describe("admin submissions", () => {
  beforeEach(() => {
    aws.send.mockReset();
    aws.signedUrl.mockReset();
    aws.signedUrl.mockResolvedValue("https://signed.example/paper.pdf");
    process.env.SUBMISSIONS_ADMIN_USERNAME = "editor";
    process.env.SUBMISSIONS_ADMIN_PASSWORD_HASH = passwordHash("correct-password");
    process.env.SUBMISSIONS_ADMIN_SESSION_SECRET = "session-secret";
    process.env.SUBMISSIONS_ADMIN_COOKIE_SECURE = "true";
    process.env.SUBMISSIONS_TABLE_NAME = "submissions";
  });

  it("sets an http-only secure session cookie for valid credentials", async () => {
    const response = await loginAdmin(loginEvent());

    expect(response.statusCode).toBe(200);
    expect(response.headers?.["cache-control"]).toBe("no-store");
    expect(response.cookies?.[0]).toContain("HttpOnly");
    expect(response.cookies?.[0]).toContain("Secure");
    expect(response.cookies?.[0]).toContain("SameSite=Lax");
  });

  it("rejects invalid credentials without a session cookie", async () => {
    const response = await loginAdmin(loginEvent("editor", "wrong-password"));

    expect(response.statusCode).toBe(401);
    expect(response.headers?.["cache-control"]).toBe("no-store");
    expect(response.cookies).toBeUndefined();
  });

  it("rejects admin list requests without a valid session", async () => {
    const response = await listSubmissions(event());

    expect(response.statusCode).toBe(401);
    expect(response.headers?.["cache-control"]).toBe("no-store");
    expect(aws.send).not.toHaveBeenCalled();
  });

  it("lists submissions with safe file metadata", async () => {
    aws.send.mockResolvedValue({ Items: [item()] });

    const response = await listSubmissions(event({ cookies: [await adminCookie()] }));
    const payload = JSON.parse(response.body || "{}");

    expect(response.statusCode).toBe(200);
    expect(payload.submissions[0]).toMatchObject({
      submissionId: "submission-1",
      hasFile: true,
      title: "Dancing Systems",
    });
    expect(JSON.stringify(payload)).not.toContain("submission-files");
  });

  it("returns submission detail for an authorized admin", async () => {
    aws.send.mockResolvedValue({ Item: item() });

    const response = await getSubmissionDetail(event({ cookies: [await adminCookie()] }), "submission-1");
    const payload = JSON.parse(response.body || "{}");

    expect(response.statusCode).toBe(200);
    expect(payload.submission.file).toEqual({
      filename: "paper.pdf",
      contentType: "application/pdf",
      size: 128,
    });
  });

  it("rejects tampered admin session cookies", async () => {
    const cookie = `${await adminCookie()}tampered`;
    const response = await getSubmissionDetail(event({ cookies: [cookie] }), "submission-1");

    expect(response.statusCode).toBe(401);
    expect(aws.send).not.toHaveBeenCalled();
  });

  it("returns a short-lived signed download url after authorization", async () => {
    aws.send.mockResolvedValue({ Item: item() });

    const response = await getSubmissionDownload(event({ cookies: [await adminCookie()] }), "submission-1");
    const payload = JSON.parse(response.body || "{}");

    expect(response.statusCode).toBe(200);
    expect(payload).toEqual({ url: "https://signed.example/paper.pdf", expiresIn: 300 });
    expect(aws.signedUrl.mock.calls[0][2]).toEqual({ expiresIn: 300 });
  });

  it("returns not found when a submission has no downloadable file", async () => {
    aws.send.mockResolvedValue({ Item: item({ file: { NULL: true } }) });

    const response = await getSubmissionDownload(event({ cookies: [await adminCookie()] }), "submission-1");

    expect(response.statusCode).toBe(404);
    expect(aws.signedUrl).not.toHaveBeenCalled();
  });

  it("fails closed when admin configuration is missing", async () => {
    delete process.env.SUBMISSIONS_ADMIN_SESSION_SECRET;

    await expect(loginAdmin(loginEvent())).rejects.toThrow("Admin submissions configuration is missing");
  });
});

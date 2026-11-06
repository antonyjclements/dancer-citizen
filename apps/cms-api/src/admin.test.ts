import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";


const aws = vi.hoisted(() => ({
  send: vi.fn(),
  cognito: vi.fn(),
  verify: vi.fn(),
  createVerifier: vi.fn(),
  signedUrl: vi.fn(),
}));

vi.mock("@aws-sdk/client-cognito-identity-provider", () => ({
  CognitoIdentityProviderClient: vi.fn(() => ({ send: aws.cognito })),
  InitiateAuthCommand: class { readonly name = "InitiateAuth"; constructor(readonly input: unknown) {} },
  RespondToAuthChallengeCommand: class { readonly name = "RespondToAuthChallenge"; constructor(readonly input: unknown) {} },
  GetUserCommand: class { readonly name = "GetUser"; constructor(readonly input: unknown) {} },
}));
vi.mock("aws-jwt-verify", () => ({
  CognitoJwtVerifier: { create: aws.createVerifier.mockImplementation(() => ({ verify: aws.verify })) },
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

import { getSubmissionDetail, getSubmissionDownload, listSubmissions, loginAdmin, logoutAdmin } from "./admin";

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
    aws.send.mockReset().mockResolvedValue({ Items: [] });
    aws.signedUrl.mockReset();
    aws.signedUrl.mockResolvedValue("https://signed.example/paper.pdf");
    aws.verify.mockReset().mockResolvedValue({ sub: "editor-id" });
    aws.cognito.mockReset().mockImplementation(async (command) => command.name === "GetUser" ? { Username: "editor" } : {
      AuthenticationResult: { AccessToken: "cognito-access-token", ExpiresIn: 3600 },
    });
    process.env.SUBMISSIONS_ADMIN_USER_POOL_ID = "us-east-1_example";
    process.env.SUBMISSIONS_ADMIN_CLIENT_ID = "example-client";
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
    aws.cognito.mockRejectedValueOnce(Object.assign(new Error("Wrong password"), { name: "NotAuthorizedException" }));
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
    aws.verify.mockRejectedValueOnce(new Error("Invalid signature"));
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
    delete process.env.SUBMISSIONS_ADMIN_CLIENT_ID;

    await expect(loginAdmin(loginEvent())).rejects.toThrow("Admin submissions configuration is missing");
  });
  it("binds verification to the configured Cognito pool, client and access token use", async () => {
    await listSubmissions(event({ cookies: ["dc_admin_session=cognito-access-token"] }));
    expect(aws.createVerifier).toHaveBeenCalledWith({ userPoolId: "us-east-1_example", clientId: "example-client", tokenUse: "access" });
    expect(aws.verify).toHaveBeenCalledWith("cognito-access-token");
  });

  it.each(["expired", "wrong pool", "wrong client", "ID token", "old custom token"])("rejects %s tokens before accessing data", async () => {
    aws.verify.mockRejectedValueOnce(new Error("Rejected JWT"));
    expect((await listSubmissions(event({ cookies: ["dc_admin_session=invalid-token"] }))).statusCode).toBe(401);
    expect(aws.cognito).not.toHaveBeenCalled();
    expect(aws.send).not.toHaveBeenCalled();
  });

  it("rejects disabled or revoked Cognito accounts", async () => {
    aws.cognito.mockRejectedValueOnce(Object.assign(new Error("revoked"), { name: "NotAuthorizedException" }));
    expect((await getSubmissionDownload(event({ cookies: ["dc_admin_session=token"] }), "submission-1")).statusCode).toBe(401);
    expect(aws.send).not.toHaveBeenCalled();
    expect(aws.signedUrl).not.toHaveBeenCalled();
  });

  it("does not turn Cognito outages into authorized data access", async () => {
    aws.cognito.mockRejectedValueOnce(new Error("Service unavailable"));
    await expect(listSubmissions(event({ cookies: ["dc_admin_session=token"] }))).rejects.toThrow("Service unavailable");
    expect(aws.send).not.toHaveBeenCalled();
  });

  it("returns a new-password challenge without issuing a cookie", async () => {
    aws.cognito.mockResolvedValueOnce({ ChallengeName: "NEW_PASSWORD_REQUIRED", Session: "challenge-session", ChallengeParameters: { USER_ID_FOR_SRP: "editor" } });
    const response = await loginAdmin(loginEvent());
    expect(JSON.parse(response.body || "{}")).toEqual({ challenge: "NEW_PASSWORD_REQUIRED", session: "challenge-session", username: "editor" });
    expect(response.cookies).toBeUndefined();
  });

  it("completes the new-password challenge through Cognito", async () => {
    const response = await loginAdmin({ ...loginEvent(), body: JSON.stringify({ username: "editor", session: "challenge-session", newPassword: "NewPassword123!" }) });
    expect(response.statusCode).toBe(200);
    expect(aws.cognito.mock.calls[0][0].input).toEqual({ ClientId: "example-client", ChallengeName: "NEW_PASSWORD_REQUIRED", Session: "challenge-session", ChallengeResponses: { USERNAME: "editor", NEW_PASSWORD: "NewPassword123!" } });
    expect(response.cookies?.[0]).toContain("Max-Age=3600");
    expect(response.body).not.toContain("cognito-access-token");
  });

  it.each(["null", "[]", "broken", '{"username":4,"password":"x"}'])("rejects malformed login %s", async (body) => {
    expect((await loginAdmin({ ...loginEvent(), body })).statusCode).toBe(400);
    expect(aws.cognito).not.toHaveBeenCalled();
  });

  it("rejects cross-site login and form requests", async () => {
    expect((await loginAdmin({ ...loginEvent(), headers: { "content-type": "application/json", "sec-fetch-site": "cross-site" } })).statusCode).toBe(400);
    expect((await loginAdmin({ ...loginEvent(), headers: { "content-type": "text/plain" } })).statusCode).toBe(400);
    expect(aws.cognito).not.toHaveBeenCalled();
  });

  it("handles throttling without exposing Cognito errors", async () => {
    aws.cognito.mockRejectedValueOnce(Object.assign(new Error("private service detail"), { name: "TooManyRequestsException" }));
    const response = await loginAdmin(loginEvent());
    expect(response.statusCode).toBe(429);
    expect(response.body).not.toContain("private service detail");
  });

  it("clears only the current browser session on logout", () => {
    const response = logoutAdmin(loginEvent());
    expect(response.cookies?.[0]).toContain("dc_admin_session=;");
    expect(response.cookies?.[0]).toContain("Max-Age=0");
    expect(response.headers?.["cache-control"]).toBe("no-store");
    expect(aws.cognito).not.toHaveBeenCalled();
    expect(logoutAdmin(event()).statusCode).toBe(400);
  });

  it.each(["ADA", "ADA@EXAMPLE", "dAnCiNg", "SHORT ABSTRACT"])("searches case-insensitively for %s", async (q) => {
    aws.send.mockResolvedValue({ Items: [item(), item({ submissionId: { S: "other" }, name: { S: "Other" }, email: { S: "other@test.com" }, title: { S: "Other" }, abstract: { S: "Other" } })] });
    const response = await listSubmissions(event({ cookies: ["dc_admin_session=token"], queryStringParameters: { q } }));
    expect(JSON.parse(response.body || "{}").submissions.map((row: { submissionId: string }) => row.submissionId)).toEqual(["submission-1"]);
  });

  it("continues beyond an empty matching page and passes the cursor back to DynamoDB", async () => {
    aws.send.mockResolvedValueOnce({ Items: [item()], LastEvaluatedKey: { submissionId: { S: "last-item" } } });
    const first = await listSubmissions(event({ cookies: ["dc_admin_session=token"], queryStringParameters: { q: "missing" } }));
    const payload = JSON.parse(first.body || "{}");
    expect(payload.submissions).toEqual([]);
    expect(payload.nextCursor).toBeTruthy();
    aws.send.mockResolvedValueOnce({ Items: [item({ title: { S: "Missing work" } })] });
    const next = await listSubmissions(event({ cookies: ["dc_admin_session=token"], queryStringParameters: { q: "missing", cursor: payload.nextCursor } }));
    expect(aws.send.mock.calls[1][0].input).toMatchObject({ Limit: 100, ExclusiveStartKey: { submissionId: { S: "last-item" } } });
    expect(JSON.parse(next.body || "{}").nextCursor).toBeNull();
    expect(JSON.parse(next.body || "{}").submissions).toHaveLength(1);
  });

  it("rejects invalid cursors and oversized search before reading the table", async () => {
    for (const queryStringParameters of [{ cursor: "!!!" }, { cursor: Buffer.from('{}').toString('base64url') }, { q: "x".repeat(201) }]) {
      expect((await listSubmissions(event({ cookies: ["dc_admin_session=token"], queryStringParameters }))).statusCode).toBe(400);
    }
    expect(aws.send).not.toHaveBeenCalled();
  });

  it("sorts returned records newest first", async () => {
    aws.send.mockResolvedValue({ Items: [item(), item({ submissionId: { S: "newer" }, submittedAt: { S: "2026-09-28T12:00:00Z" } })] });
    const result = await listSubmissions(event({ cookies: ["dc_admin_session=token"] }));
    expect(JSON.parse(result.body || "{}").submissions[0].submissionId).toBe("newer");
  });

});
